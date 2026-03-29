import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const body = await req.json().catch(() => ({}));
    const { contaId } = body;

    let query = supabase.from("email_contas").select("*").eq("user_id", user.id);
    if (contaId) query = query.eq("id", contaId);
    const { data: contas, error: contasErr } = await query;

    if (contasErr || !contas?.length) {
      return new Response(JSON.stringify({ error: "No accounts found" }), { status: 404, headers: corsHeaders });
    }

    const serviceSupabase = createClient(supabaseUrl, serviceKey);
    let totalImported = 0;
    const errors: string[] = [];

    for (const conta of contas) {
      if (!conta.imap_servidor || !conta.imap_usuario || !conta.imap_senha) {
        errors.push(`${conta.email}: IMAP not configured`);
        continue;
      }

      try {
        const imapHost = conta.imap_servidor;
        const imapPort = conta.imap_porta || 993;
        const useSSL = conta.imap_seguranca === "ssl";

        let conn: Deno.TlsConn | Deno.TcpConn;
        if (useSSL) {
          conn = await Deno.connectTls({ hostname: imapHost, port: imapPort });
        } else {
          conn = await Deno.connect({ hostname: imapHost, port: imapPort });
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const readResponse = async (): Promise<string> => {
          const buf = new Uint8Array(65536);
          const n = await conn.read(buf);
          if (n === null) throw new Error("Connection closed");
          return decoder.decode(buf.subarray(0, n));
        };

        const readFullResponse = async (tag: string): Promise<string> => {
          let full = "";
          for (let i = 0; i < 200; i++) {
            const chunk = await readResponse();
            full += chunk;
            if (full.includes(`${tag} OK`) || full.includes(`${tag} NO`) || full.includes(`${tag} BAD`)) break;
          }
          return full;
        };

        const sendCommand = async (tag: string, cmd: string): Promise<string> => {
          await conn.write(encoder.encode(`${tag} ${cmd}\r\n`));
          return await readFullResponse(tag);
        };

        // Read greeting
        await readResponse();

        // LOGIN
        const loginRes = await sendCommand("A1", `LOGIN ${conta.imap_usuario} ${conta.imap_senha}`);
        if (!loginRes.includes("A1 OK")) {
          errors.push(`${conta.email}: IMAP login failed`);
          try { conn.close(); } catch {}
          continue;
        }

        // SELECT INBOX
        const selectRes = await sendCommand("A2", "SELECT INBOX");
        const existsMatch = selectRes.match(/\* (\d+) EXISTS/);
        const totalMessages = existsMatch ? parseInt(existsMatch[1]) : 0;

        if (totalMessages === 0) {
          await sendCommand("A3", "LOGOUT");
          try { conn.close(); } catch {}
          continue;
        }

        // Fetch last 30 messages
        const startMsg = Math.max(1, totalMessages - 29);

        // Fetch ENVELOPE and BODY together for efficiency
        const fetchRes = await sendCommand("A3", `FETCH ${startMsg}:${totalMessages} (UID ENVELOPE BODY.PEEK[])`);

        // Parse individual message blocks
        interface ParsedMsg {
          uid: string;
          subject: string;
          from: string;
          fromEmail: string;
          date: string;
          body: string;
        }

        const messages: ParsedMsg[] = [];

        // Split by "* N FETCH" markers
        const rawBlocks = fetchRes.split(/\* \d+ FETCH \(/);

        for (const block of rawBlocks) {
          if (!block.trim()) continue;

          // Extract UID
          const uidMatch = block.match(/UID (\d+)/);
          if (!uidMatch) continue;
          const uid = uidMatch[1];

          // Extract ENVELOPE
          const envMatch = block.match(/ENVELOPE \("([^"]*)" "([^"]*?)"/);
          let date = "";
          let subject = "(sem assunto)";
          if (envMatch) {
            date = envMatch[1];
            subject = envMatch[2] || "(sem assunto)";
          }

          // Decode MIME encoded subject (=?UTF-8?B?...?= or =?UTF-8?Q?...?=)
          subject = decodeMimeHeader(subject);

          // Extract from address from ENVELOPE
          let fromName = "";
          let fromEmail = "";
          const fromMatch = block.match(/ENVELOPE \("[^"]*" "[^"]*" \(\((?:"([^"]*?)"|NIL) NIL "([^"]*?)" "([^"]*?)"\)\)/);
          if (fromMatch) {
            fromName = fromMatch[1] || "";
            const mailbox = fromMatch[2] || "";
            const host = fromMatch[3] || "";
            fromEmail = `${mailbox}@${host}`;
          }

          // Extract BODY content - look for the literal marker {NNN}
          let bodyContent = "";
          const bodyLiteralMatch = block.match(/BODY\[\] \{(\d+)\}\r\n/);
          if (bodyLiteralMatch) {
            const startIdx = block.indexOf(bodyLiteralMatch[0]) + bodyLiteralMatch[0].length;
            const literalLen = parseInt(bodyLiteralMatch[1]);
            bodyContent = block.substring(startIdx, startIdx + literalLen);
          }

          // Parse the full email body (handle multipart, base64, QP, etc.)
          const parsedBody = parseEmailBody(bodyContent);

          messages.push({ uid, subject, from: fromName, fromEmail, date, body: parsedBody });
        }

        // Get existing emails to avoid duplicates
        const { data: existingEmails } = await serviceSupabase
          .from("email_emails")
          .select("email_remetente, assunto, data")
          .eq("user_id", user.id)
          .eq("conta_id", conta.id)
          .eq("tipo", "recebido");

        const existingSet = new Set(
          (existingEmails || []).map((e: any) => `${e.email_remetente}|${e.assunto}|${e.data}`)
        );

        // Build inserts
        const newEmails = [];
        for (const msg of messages) {
          let parsedDate: Date;
          try { parsedDate = new Date(msg.date); } catch { parsedDate = new Date(); }
          if (isNaN(parsedDate.getTime())) parsedDate = new Date();

          const dateStr = parsedDate.toISOString().slice(0, 10);
          const key = `${msg.fromEmail}|${msg.subject}|${dateStr}`;

          if (existingSet.has(key)) continue;

          // Use the original email timestamp for hora (HH:MM in 24h for storage)
          const horaStr = `${String(parsedDate.getUTCHours()).padStart(2, "0")}:${String(parsedDate.getUTCMinutes()).padStart(2, "0")}`;

          // Strip HTML for preview
          const plainBody = msg.body.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

          newEmails.push({
            user_id: user.id,
            tipo: "recebido",
            remetente: msg.from || msg.fromEmail,
            email_remetente: msg.fromEmail,
            assunto: msg.subject,
            preview: plainBody.slice(0, 200) || msg.subject.slice(0, 100),
            corpo: msg.body || "",
            hora: horaStr,
            data: dateStr,
            lido: false,
            favorito: false,
            prioridade: "normal",
            tags: [],
            pasta: null,
            conta_id: conta.id,
          });
        }

        if (newEmails.length > 0) {
          const { error: insertErr } = await serviceSupabase.from("email_emails").insert(newEmails);
          if (insertErr) {
            errors.push(`${conta.email}: Failed to insert: ${insertErr.message}`);
          } else {
            totalImported += newEmails.length;
          }
        }

        // LOGOUT
        try { await sendCommand("A4", "LOGOUT"); } catch {}
        try { conn.close(); } catch {}

      } catch (err: any) {
        errors.push(`${conta.email}: ${err.message}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      imported: totalImported,
      errors: errors.length > 0 ? errors : undefined,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("IMAP sync error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to sync emails" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/* ─── MIME Header Decoder ─── */
function decodeMimeHeader(input: string): string {
  return input.replace(/=\?([^?]+)\?([BbQq])\?([^?]+)\?=/g, (_match, _charset, encoding, encoded) => {
    try {
      if (encoding.toUpperCase() === "B") {
        return atob(encoded);
      } else {
        // Quoted-Printable
        return encoded.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (_: string, hex: string) => String.fromCharCode(parseInt(hex, 16)));
      }
    } catch {
      return encoded;
    }
  });
}

/* ─── Email Body Parser ─── */
function parseEmailBody(raw: string): string {
  if (!raw || !raw.trim()) return "";

  // Find Content-Type header
  const headerEnd = raw.indexOf("\r\n\r\n");
  if (headerEnd === -1) {
    // No headers - just body
    return raw.trim();
  }

  const headers = raw.substring(0, headerEnd);
  const bodyPart = raw.substring(headerEnd + 4);

  const ctMatch = headers.match(/Content-Type:\s*([^\r\n;]+)/i);
  const contentType = ctMatch ? ctMatch[1].trim().toLowerCase() : "text/plain";

  // Check Content-Transfer-Encoding
  const cteMatch = headers.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i);
  const encoding = cteMatch ? cteMatch[1].trim().toLowerCase() : "7bit";

  // Multipart
  if (contentType.startsWith("multipart/")) {
    const boundaryMatch = headers.match(/boundary="?([^"\r\n;]+)"?/i);
    if (!boundaryMatch) return decodeContent(bodyPart, encoding);
    const boundary = boundaryMatch[1];
    return parseMultipart(bodyPart, boundary);
  }

  // Single part
  const decoded = decodeContent(bodyPart, encoding);

  if (contentType.includes("text/html")) {
    return decoded;
  }
  if (contentType.includes("text/plain")) {
    // Wrap plain text in simple HTML for consistent rendering
    return decoded;
  }

  return decoded;
}

function parseMultipart(body: string, boundary: string): string {
  const parts = body.split(`--${boundary}`);
  let htmlContent = "";
  let textContent = "";

  for (const part of parts) {
    if (part.trim() === "--" || !part.trim()) continue;

    const partHeaderEnd = part.indexOf("\r\n\r\n");
    if (partHeaderEnd === -1) continue;

    const partHeaders = part.substring(0, partHeaderEnd);
    const partBody = part.substring(partHeaderEnd + 4);

    const partCtMatch = partHeaders.match(/Content-Type:\s*([^\r\n;]+)/i);
    const partCt = partCtMatch ? partCtMatch[1].trim().toLowerCase() : "text/plain";

    const partCteMatch = partHeaders.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i);
    const partEncoding = partCteMatch ? partCteMatch[1].trim().toLowerCase() : "7bit";

    // Recurse for nested multipart
    if (partCt.startsWith("multipart/")) {
      const nestedBoundary = partHeaders.match(/boundary="?([^"\r\n;]+)"?/i);
      if (nestedBoundary) {
        const nested = parseMultipart(partBody, nestedBoundary[1]);
        if (nested) htmlContent = nested;
        continue;
      }
    }

    if (partCt.includes("text/html")) {
      htmlContent = decodeContent(partBody, partEncoding);
    } else if (partCt.includes("text/plain") && !textContent) {
      textContent = decodeContent(partBody, partEncoding);
    }
  }

  // Prefer HTML over plain text
  return htmlContent || textContent || "";
}

function decodeContent(content: string, encoding: string): string {
  let result = content;

  if (encoding === "base64") {
    try {
      const cleaned = result.replace(/\r?\n/g, "").trim();
      // Handle UTF-8 base64
      const binary = atob(cleaned);
      // Try to decode as UTF-8
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      result = new TextDecoder("utf-8").decode(bytes);
    } catch {
      // fallback
    }
  } else if (encoding === "quoted-printable") {
    result = result
      .replace(/=\r?\n/g, "") // soft line breaks
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  return result.trim();
}
