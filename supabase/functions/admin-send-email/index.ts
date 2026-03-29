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
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    const { contaId, para, cc, cco, assunto, corpo } = body;

    if (!contaId || !para?.length || !assunto) {
      return new Response(JSON.stringify({ error: "Missing required fields: contaId, para, assunto" }), { status: 400, headers: corsHeaders });
    }

    // Fetch account with SMTP config
    const { data: conta, error: contaErr } = await supabase
      .from("email_contas")
      .select("*")
      .eq("id", contaId)
      .eq("user_id", user.id)
      .single();

    if (contaErr || !conta) {
      return new Response(JSON.stringify({ error: "Account not found" }), { status: 404, headers: corsHeaders });
    }

    // Fallback: use IMAP credentials when SMTP credentials are empty
    const smtpUser = conta.smtp_usuario || conta.imap_usuario;
    const smtpPass = conta.smtp_senha || conta.imap_senha;
    const smtpServer = conta.smtp_servidor || conta.imap_servidor;

    if (!smtpServer || !smtpUser || !smtpPass) {
      const missing = [];
      if (!smtpServer) missing.push("servidor SMTP");
      if (!smtpUser) missing.push("usuário SMTP/IMAP");
      if (!smtpPass) missing.push("senha SMTP/IMAP");
      return new Response(JSON.stringify({ error: `SMTP incompleto. Faltam: ${missing.join(", ")}. Configure nas configurações da conta.` }), { status: 400, headers: corsHeaders });
    }

    // Build email using raw SMTP via Deno's built-in TCP
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const smtpHost = smtpServer;
    const smtpPort = conta.smtp_porta || 465;
    const useSSL = conta.smtp_seguranca === "ssl";
    const useStartTLS = conta.smtp_seguranca === "starttls";

    let conn: Deno.TlsConn | Deno.TcpConn;

    if (useSSL) {
      conn = await Deno.connectTls({ hostname: smtpHost, port: smtpPort });
    } else {
      conn = await Deno.connect({ hostname: smtpHost, port: smtpPort });
    }

    const readResponse = async (): Promise<string> => {
      const buf = new Uint8Array(4096);
      const n = await conn.read(buf);
      if (n === null) throw new Error("Connection closed");
      return decoder.decode(buf.subarray(0, n));
    };

    const sendCommand = async (cmd: string): Promise<string> => {
      await conn.write(encoder.encode(cmd + "\r\n"));
      return await readResponse();
    };

    // Read greeting
    await readResponse();

    // EHLO
    await sendCommand(`EHLO localhost`);

    // STARTTLS upgrade if needed
    if (useStartTLS && !(conn instanceof Deno.TlsConn)) {
      await sendCommand("STARTTLS");
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: smtpHost });
      await sendCommand(`EHLO localhost`);
    }

    // AUTH LOGIN
    const authLoginRes = await sendCommand("AUTH LOGIN");
    if (!authLoginRes.startsWith("334")) throw new Error("AUTH LOGIN failed: " + authLoginRes);

    const userRes = await sendCommand(btoa(conta.smtp_usuario));
    if (!userRes.startsWith("334")) throw new Error("AUTH user failed: " + userRes);

    const passRes = await sendCommand(btoa(conta.smtp_senha));
    if (!passRes.startsWith("235")) throw new Error("AUTH password failed: " + passRes);

    // MAIL FROM
    const mailFromRes = await sendCommand(`MAIL FROM:<${conta.email}>`);
    if (!mailFromRes.startsWith("250")) throw new Error("MAIL FROM failed: " + mailFromRes);

    // RCPT TO
    const allRecipients = [...para, ...(cc || []), ...(cco || [])];
    for (const rcpt of allRecipients) {
      const rcptRes = await sendCommand(`RCPT TO:<${rcpt}>`);
      if (!rcptRes.startsWith("250")) throw new Error(`RCPT TO <${rcpt}> failed: ` + rcptRes);
    }

    // DATA
    const dataRes = await sendCommand("DATA");
    if (!dataRes.startsWith("354")) throw new Error("DATA failed: " + dataRes);

    // Build MIME message
    const boundary = `----=_Part_${Date.now()}`;
    const headers = [
      `From: ${conta.nome} <${conta.email}>`,
      `To: ${para.join(", ")}`,
      cc?.length ? `Cc: ${cc.join(", ")}` : null,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(assunto)))}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      `Date: ${new Date().toUTCString()}`,
    ].filter(Boolean).join("\r\n");

    const plainText = corpo.replace(/<[^>]*>/g, "");
    const messageBody = [
      headers,
      "",
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      "",
      btoa(unescape(encodeURIComponent(plainText))),
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      "",
      btoa(unescape(encodeURIComponent(corpo))),
      `--${boundary}--`,
    ].join("\r\n");

    const endRes = await sendCommand(messageBody + "\r\n.");
    if (!endRes.startsWith("250")) throw new Error("Message send failed: " + endRes);

    // QUIT
    try { await sendCommand("QUIT"); } catch { /* ignore */ }
    try { conn.close(); } catch { /* ignore */ }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("SMTP send error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to send email" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
