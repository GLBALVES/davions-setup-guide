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
          const buf = new Uint8Array(32768);
          const n = await conn.read(buf);
          if (n === null) throw new Error("Connection closed");
          return decoder.decode(buf.subarray(0, n));
        };

        const sendCommand = async (tag: string, cmd: string): Promise<string> => {
          await conn.write(encoder.encode(`${tag} ${cmd}\r\n`));
          let full = "";
          for (let i = 0; i < 100; i++) {
            const chunk = await readResponse();
            full += chunk;
            if (full.includes(`${tag} OK`) || full.includes(`${tag} NO`) || full.includes(`${tag} BAD`)) break;
          }
          return full;
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

        // Fetch last 20 messages headers only first
        const startMsg = Math.max(1, totalMessages - 19);

        // Fetch ENVELOPE for metadata
        const fetchEnvRes = await sendCommand("A3", `FETCH ${startMsg}:${totalMessages} (UID ENVELOPE)`);

        // Parse messages from ENVELOPE
        interface ParsedMsg {
          uid: string;
          subject: string;
          from: string;
          fromEmail: string;
          date: string;
        }
        const messages: ParsedMsg[] = [];

        // Split response by FETCH lines
        const fetchLines = fetchEnvRes.split("* ");
        for (const block of fetchLines) {
          const uidMatch = block.match(/UID (\d+)/);
          const envMatch = block.match(/ENVELOPE \("([^"]*)" "([^"]*)".*?\(\("?([^"]*)"?\s+NIL\s+"([^"]*)"\s+"([^"]*)"\)\)/);
          if (envMatch) {
            const uid = uidMatch ? uidMatch[1] : "";
            const date = envMatch[1];
            const subject = envMatch[2] || "(sem assunto)";
            const fromName = envMatch[3] || "";
            const mailbox = envMatch[4] || "";
            const host = envMatch[5] || "";
            const fromEmail = `${mailbox}@${host}`;
            messages.push({ uid, subject, from: fromName, fromEmail, date });
          }
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

        // Filter new messages and fetch their bodies
        const newMessages: Array<ParsedMsg & { body: string }> = [];
        for (const msg of messages) {
          let parsedDate: Date;
          try { parsedDate = new Date(msg.date); } catch { parsedDate = new Date(); }
          if (isNaN(parsedDate.getTime())) parsedDate = new Date();
          const dateStr = parsedDate.toISOString().slice(0, 10);
          const key = `${msg.fromEmail}|${msg.subject}|${dateStr}`;

          if (!existingSet.has(key)) {
            newMessages.push({ ...msg, body: "" });
          }
        }

        // Fetch body for new messages only (by UID)
        if (newMessages.length > 0) {
          const uidsToFetch = newMessages.filter(m => m.uid).map(m => m.uid);
          if (uidsToFetch.length > 0) {
            const uidList = uidsToFetch.join(",");
            const bodyRes = await sendCommand("A4", `UID FETCH ${uidList} (UID BODY.PEEK[TEXT])`);

            // Parse body responses - each starts with "* N FETCH"
            const bodyBlocks = bodyRes.split(/\* \d+ FETCH/);
            for (const block of bodyBlocks) {
              const bUidMatch = block.match(/UID (\d+)/);
              if (!bUidMatch) continue;
              const uid = bUidMatch[1];

              // Extract body text between literal size marker and closing paren
              const literalMatch = block.match(/BODY\[TEXT\] \{(\d+)\}\r\n/);
              let bodyText = "";
              if (literalMatch) {
                const startIdx = block.indexOf(literalMatch[0]) + literalMatch[0].length;
                const len = parseInt(literalMatch[1]);
                bodyText = block.substring(startIdx, startIdx + len);
              } else {
                // Try without literal - inline body
                const inlineMatch = block.match(/BODY\[TEXT\] "(.*)"/s);
                if (inlineMatch) bodyText = inlineMatch[1];
              }

              // Decode base64 if it looks like base64 (no spaces, long lines)
              const trimmed = bodyText.trim();
              if (trimmed && /^[A-Za-z0-9+/=\r\n]+$/.test(trimmed) && trimmed.length > 20) {
                try {
                  bodyText = atob(trimmed.replace(/\r?\n/g, ""));
                } catch { /* keep original */ }
              }

              // Decode quoted-printable
              bodyText = bodyText.replace(/=\r?\n/g, "").replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

              const msgIdx = newMessages.findIndex(m => m.uid === uid);
              if (msgIdx !== -1) {
                newMessages[msgIdx].body = bodyText;
              }
            }
          }
        }

        // Insert new emails
        const newEmails = [];
        for (const msg of newMessages) {
          let parsedDate: Date;
          try { parsedDate = new Date(msg.date); } catch { parsedDate = new Date(); }
          if (isNaN(parsedDate.getTime())) parsedDate = new Date();
          const dateStr = parsedDate.toISOString().slice(0, 10);

          // Strip HTML tags for preview
          const plainBody = msg.body.replace(/<[^>]*>/g, "").trim();

          newEmails.push({
            user_id: user.id,
            tipo: "recebido",
            remetente: msg.from || msg.fromEmail,
            email_remetente: msg.fromEmail,
            assunto: msg.subject,
            preview: plainBody.slice(0, 200) || msg.subject.slice(0, 100),
            corpo: msg.body || "",
            hora: `${String(parsedDate.getHours()).padStart(2, "0")}:${String(parsedDate.getMinutes()).padStart(2, "0")}`,
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
            errors.push(`${conta.email}: Failed to insert emails: ${insertErr.message}`);
          } else {
            totalImported += newEmails.length;
          }
        }

        // LOGOUT
        try { await sendCommand("A5", "LOGOUT"); } catch {}
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
