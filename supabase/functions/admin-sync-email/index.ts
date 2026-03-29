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

    // Fetch account(s)
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
          const buf = new Uint8Array(16384);
          const n = await conn.read(buf);
          if (n === null) throw new Error("Connection closed");
          return decoder.decode(buf.subarray(0, n));
        };

        const sendCommand = async (tag: string, cmd: string): Promise<string> => {
          await conn.write(encoder.encode(`${tag} ${cmd}\r\n`));
          let full = "";
          while (true) {
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

        // Fetch last 20 messages (or less)
        const startMsg = Math.max(1, totalMessages - 19);
        const fetchRes = await sendCommand("A3", `FETCH ${startMsg}:${totalMessages} (ENVELOPE BODY.PEEK[TEXT])`);

        // Parse emails from IMAP response
        const envelopeRegex = /ENVELOPE \(([^)]*(?:\([^)]*\))*[^)]*)\)/g;
        const messages: Array<{ subject: string; from: string; fromEmail: string; date: string }> = [];

        // Simple parsing: extract subject/from from ENVELOPE
        const lines = fetchRes.split("\r\n");
        let currentSubject = "";
        let currentFrom = "";
        let currentFromEmail = "";
        let currentDate = "";

        for (const line of lines) {
          const envMatch = line.match(/ENVELOPE \("([^"]*)" "([^"]*)".*?\(\("([^"]*)" [^)]*"([^"]*)" "([^"]*)"\)\)/);
          if (envMatch) {
            currentDate = envMatch[1];
            currentSubject = envMatch[2] || "(sem assunto)";
            currentFrom = envMatch[3] || "";
            const mailbox = envMatch[4] || "";
            const host = envMatch[5] || "";
            currentFromEmail = `${mailbox}@${host}`;
            messages.push({ subject: currentSubject, from: currentFrom, fromEmail: currentFromEmail, date: currentDate });
          }
        }

        // Get existing email IDs to avoid duplicates
        const { data: existingEmails } = await serviceSupabase
          .from("email_emails")
          .select("email_remetente, assunto, data")
          .eq("user_id", user.id)
          .eq("conta_id", conta.id)
          .eq("tipo", "recebido");

        const existingSet = new Set(
          (existingEmails || []).map(e => `${e.email_remetente}|${e.assunto}|${e.data}`)
        );

        const newEmails = [];
        for (const msg of messages) {
          let parsedDate: Date;
          try { parsedDate = new Date(msg.date); } catch { parsedDate = new Date(); }
          const dateStr = parsedDate.toISOString().slice(0, 10);
          const key = `${msg.fromEmail}|${msg.subject}|${dateStr}`;

          if (!existingSet.has(key)) {
            newEmails.push({
              user_id: user.id,
              tipo: "recebido",
              remetente: msg.from || msg.fromEmail,
              email_remetente: msg.fromEmail,
              assunto: msg.subject,
              preview: msg.subject.slice(0, 100),
              corpo: "",
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
