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

        // Fetch last 30 messages — get ENVELOPE for metadata, BODY.PEEK[] for full raw message
        const startMsg = Math.max(1, totalMessages - 29);
        const fetchRes = await sendCommand("A3", `FETCH ${startMsg}:${totalMessages} (UID ENVELOPE BODY.PEEK[])`);

        interface ParsedMsg {
          uid: string;
          subject: string;
          from: string;
          fromEmail: string;
          date: string;
          body: string;
          attachments: { fileName: string; mimeType: string; size: number; content: string }[];
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

          // Decode MIME encoded subject
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

          // Extract raw email from BODY[] literal
          let rawEmail = "";
          const bodyLiteralMatch = block.match(/BODY\[\] \{(\d+)\}\r\n/);
          if (bodyLiteralMatch) {
            const startIdx = block.indexOf(bodyLiteralMatch[0]) + bodyLiteralMatch[0].length;
            const literalLen = parseInt(bodyLiteralMatch[1]);
            rawEmail = block.substring(startIdx, startIdx + literalLen);
          }

          // Parse the full raw email to extract readable body and attachments
          const { body: parsedBody, attachments } = parseRawEmailWithAttachments(rawEmail);

          messages.push({ uid, subject, from: fromName, fromEmail, date, body: parsedBody, attachments });
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

        // Check auto-save setting
        const { data: docSettings } = await serviceSupabase
          .from("email_document_settings")
          .select("auto_save")
          .eq("user_id", user.id)
          .maybeSingle();
        const autoSave = docSettings?.auto_save ?? false;

        // Build inserts
        const newEmails = [];
        const newDocuments: any[] = [];
        for (const msg of messages) {
          let parsedDate: Date;
          try { parsedDate = new Date(msg.date); } catch { parsedDate = new Date(); }
          if (isNaN(parsedDate.getTime())) parsedDate = new Date();

          const dateStr = parsedDate.toISOString().slice(0, 10);
          const key = `${msg.fromEmail}|${msg.subject}|${dateStr}`;

          if (existingSet.has(key)) continue;

          // Store hora as HH:MM from original email timestamp
          const horaStr = `${String(parsedDate.getUTCHours()).padStart(2, "0")}:${String(parsedDate.getUTCMinutes()).padStart(2, "0")}`;

          // Generate clean preview from body
          const plainPreview = msg.body
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/gi, " ")
            .replace(/&[a-z]+;/gi, "")
            .replace(/\s+/g, " ")
            .trim();

          const emailId = crypto.randomUUID();

          newEmails.push({
            id: emailId,
            user_id: user.id,
            tipo: "recebido",
            remetente: msg.from || msg.fromEmail,
            email_remetente: msg.fromEmail,
            assunto: msg.subject,
            preview: plainPreview.slice(0, 200) || msg.subject.slice(0, 100),
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

          // Process attachments
          for (const att of msg.attachments) {
            let fileUrl: string | null = null;

            if (autoSave && att.content) {
              try {
                const safeSender = msg.fromEmail.replace(/[^a-zA-Z0-9@._-]/g, "_");
                const path = `${user.id}/${safeSender}/${att.fileName}`;
                const bytes = Uint8Array.from(atob(att.content), c => c.charCodeAt(0));
                await serviceSupabase.storage.from("email-documents").upload(path, bytes, { contentType: att.mimeType, upsert: true });
                const { data: urlData } = serviceSupabase.storage.from("email-documents").getPublicUrl(path);
                fileUrl = urlData?.publicUrl || null;
              } catch (e) {
                console.error("Failed to upload attachment:", e);
              }
            }

            newDocuments.push({
              user_id: user.id,
              email_id: emailId,
              sender_email: msg.fromEmail,
              sender_name: msg.from || msg.fromEmail,
              file_name: att.fileName,
              file_url: fileUrl,
              mime_type: att.mimeType,
              file_size: att.size,
              saved: autoSave && fileUrl !== null,
            });
          }
        }

        if (newEmails.length > 0) {
          const { error: insertErr } = await serviceSupabase.from("email_emails").insert(newEmails);
          if (insertErr) {
            errors.push(`${conta.email}: Failed to insert: ${insertErr.message}`);
          } else {
            totalImported += newEmails.length;
          }
        }

        if (newDocuments.length > 0) {
          const { error: docErr } = await serviceSupabase.from("email_documents").insert(newDocuments);
          if (docErr) {
            errors.push(`${conta.email}: Failed to insert documents: ${docErr.message}`);
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
  return input.replace(/=\?([^?]+)\?([BbQq])\?([^?]+)\?=/g, (_match, charset, encoding, encoded) => {
    try {
      if (encoding.toUpperCase() === "B") {
        const binary = atob(encoded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new TextDecoder(charset.toLowerCase()).decode(bytes);
      } else {
        // Quoted-Printable
        const decoded = encoded
          .replace(/_/g, " ")
          .replace(/=([0-9A-Fa-f]{2})/g, (_: string, hex: string) => String.fromCharCode(parseInt(hex, 16)));
        // Try to decode as charset
        const bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
        return new TextDecoder(charset.toLowerCase()).decode(bytes);
      }
    } catch {
      return encoded;
    }
  });
}

/* ─── Parse raw email into readable body + attachments ─── */
interface Attachment { fileName: string; mimeType: string; size: number; content: string }

function parseRawEmailWithAttachments(raw: string): { body: string; attachments: Attachment[] } {
  if (!raw || !raw.trim()) return { body: "", attachments: [] };

  const headerEnd = raw.indexOf("\r\n\r\n");
  if (headerEnd === -1) return { body: raw.trim(), attachments: [] };

  const headers = raw.substring(0, headerEnd);
  const body = raw.substring(headerEnd + 4);

  const contentType = getHeader(headers, "Content-Type") || "text/plain";
  const encoding = getHeader(headers, "Content-Transfer-Encoding") || "7bit";
  const charset = extractCharset(contentType) || "utf-8";

  if (contentType.toLowerCase().includes("multipart/")) {
    const boundary = extractBoundary(contentType);
    if (boundary) {
      return parseMultipartWithAttachments(body, boundary);
    }
  }

  const decoded = decodeBody(body, encoding.toLowerCase().trim(), charset);
  return { body: decoded, attachments: [] };
}

function parseMultipartWithAttachments(body: string, boundary: string): { body: string; attachments: Attachment[] } {
  const parts = body.split(`--${boundary}`);
  let htmlContent = "";
  let textContent = "";
  const attachments: Attachment[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed === "--" || !trimmed) continue;

    const partHeaderEnd = part.indexOf("\r\n\r\n");
    if (partHeaderEnd === -1) continue;

    const partHeaders = part.substring(0, partHeaderEnd);
    const partBody = part.substring(partHeaderEnd + 4);

    const partCt = getHeader(partHeaders, "Content-Type") || "text/plain";
    const partEncoding = getHeader(partHeaders, "Content-Transfer-Encoding") || "7bit";
    const partCharset = extractCharset(partCt);
    const disposition = getHeader(partHeaders, "Content-Disposition") || "";

    // Recurse for nested multipart
    if (partCt.toLowerCase().includes("multipart/")) {
      const nestedBoundary = extractBoundary(partCt);
      if (nestedBoundary) {
        const nested = parseMultipartWithAttachments(partBody, nestedBoundary);
        if (nested.body) htmlContent = nested.body;
        attachments.push(...nested.attachments);
        continue;
      }
    }

    // Detect attachments
    const isAttachment = disposition.toLowerCase().includes("attachment") ||
      (disposition.toLowerCase().includes("filename") || partCt.toLowerCase().includes("name="));
    const ctLower = partCt.toLowerCase();

    if (isAttachment && !ctLower.includes("text/plain") && !ctLower.includes("text/html")) {
      // Extract filename
      let fileName = "";
      const fnMatch = disposition.match(/filename="?([^";\r\n]+)"?/i) || partCt.match(/name="?([^";\r\n]+)"?/i);
      if (fnMatch) fileName = decodeMimeHeader(fnMatch[1].trim());
      if (!fileName) fileName = `attachment_${attachments.length + 1}`;

      // Get raw base64 content
      const cleanBody = partBody.replace(/\r?\n--.*$/, "").trim();
      const rawContent = partEncoding.toLowerCase().includes("base64") ? cleanBody.replace(/\r?\n/g, "") : "";

      const size = rawContent ? Math.floor(rawContent.length * 3 / 4) : partBody.length;

      attachments.push({
        fileName,
        mimeType: partCt.split(";")[0].trim(),
        size,
        content: rawContent,
      });
    } else if (ctLower.includes("text/html")) {
      htmlContent = decodeBody(partBody, partEncoding.toLowerCase().trim(), partCharset);
    } else if (ctLower.includes("text/plain") && !textContent) {
      textContent = decodeBody(partBody, partEncoding.toLowerCase().trim(), partCharset);
    }
  }

  return { body: htmlContent || textContent || "", attachments };
}

function decodeBody(content: string, encoding: string, charset: string): string {
  let result = content;

  // Remove trailing boundary markers that might have leaked in
  const boundaryIdx = result.lastIndexOf("\r\n--");
  if (boundaryIdx > 0) {
    result = result.substring(0, boundaryIdx);
  }

  if (encoding === "base64") {
    try {
      const cleaned = result.replace(/\r?\n/g, "").trim();
      const binary = atob(cleaned);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      result = new TextDecoder(charset).decode(bytes);
    } catch {
      // fallback: return as-is
    }
  } else if (encoding === "quoted-printable") {
    // Decode quoted-printable
    result = result
      .replace(/=\r?\n/g, "") // soft line breaks
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    // Now decode the byte sequence as the correct charset
    try {
      const bytes = new Uint8Array(result.length);
      for (let i = 0; i < result.length; i++) {
        bytes[i] = result.charCodeAt(i);
      }
      result = new TextDecoder(charset).decode(bytes);
    } catch {
      // fallback
    }
  }

  return result.trim();
}
