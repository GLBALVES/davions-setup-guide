import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VPS_CERTS_URL = "https://davions.giombelli.com.br/api/certs";
const ALERT_EMAIL = "team@davions.com";
const DAYS_THRESHOLD = 30;

interface VpsCert {
  domain: string;
  expiresAt: string | null;
}

function normalizeCerts(raw: unknown[]): VpsCert[] {
  return raw.map((item) => {
    if (typeof item === "string") return { domain: item, expiresAt: null };
    const obj = item as Record<string, unknown>;
    const expiry =
      obj.expiresAt ?? obj.expires_at ?? obj.not_after ?? obj.issued_at ?? null;
    return {
      domain: String(obj.domain ?? obj.name ?? obj.subject ?? "unknown"),
      expiresAt: expiry != null ? String(expiry) : null,
    };
  });
}

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt).getTime();
  const now = Date.now();
  const daysLeft = (expiry - now) / (1000 * 60 * 60 * 24);
  return daysLeft < DAYS_THRESHOLD;
}

function daysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt).getTime();
  const now = Date.now();
  return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) {
      return new Response(
        JSON.stringify({ error: "BREVO_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch certs from VPS
    const certsRes = await fetch(VPS_CERTS_URL);
    if (!certsRes.ok) {
      return new Response(
        JSON.stringify({ error: `VPS API returned ${certsRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const raw = await certsRes.json();
    const certs = normalizeCerts(Array.isArray(raw) ? raw : []);

    // Filter expiring soon
    const expiring = certs.filter((c) => isExpiringSoon(c.expiresAt));

    if (expiring.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, checked: certs.length, expiring: 0, message: "No certs expiring soon." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build email HTML
    const rows = expiring
      .map((c) => {
        const days = daysUntilExpiry(c.expiresAt);
        const expDate = c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("pt-BR") : "—";
        const urgency = days !== null && days <= 7 ? "#dc2626" : "#d97706";
        return `
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:10px 12px;font-family:monospace;font-size:13px;">${c.domain}</td>
          <td style="padding:10px 12px;font-size:13px;">${expDate}</td>
          <td style="padding:10px 12px;text-align:center;">
            <span style="background:${urgency};color:#fff;font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;">
              ${days !== null ? `${days}d` : "Desconhecido"}
            </span>
          </td>
        </tr>`;
      })
      .join("");

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:640px;margin:0 auto;padding:32px 24px;">
  <h2 style="font-size:18px;font-weight:600;margin-bottom:4px;">⚠️ Certificados SSL próximos do vencimento</h2>
  <p style="color:#666;font-size:13px;margin-top:0;">
    Os seguintes certificados SSL do VPS vencem em menos de ${DAYS_THRESHOLD} dias.
    Acesse o painel admin para forçar a renovação.
  </p>

  <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px;">
    <thead>
      <tr style="background:#f5f5f5;border-bottom:2px solid #e0e0e0;">
        <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#888;">Domínio</th>
        <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#888;">Vencimento</th>
        <th style="padding:10px 12px;text-align:center;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#888;">Dias Restantes</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <p style="font-size:13px;color:#444;margin-top:24px;">
    <strong>Ação recomendada:</strong> Acesse
    <a href="https://app.davions.com/admin/vps-setup" style="color:#111;">Admin → VPS Setup</a>
    e use o painel "SSL Renewal" para renovar os certificados.
  </p>

  <hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />
  <p style="font-size:11px;color:#bbb;">Enviado automaticamente pelo Davions · ${new Date().toLocaleString("pt-BR", { timeZone: "UTC" })} UTC</p>
</body>
</html>`;

    // Send via Brevo
    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Davions", email: "noreply@davions.com" },
        to: [{ email: ALERT_EMAIL, name: "Equipe Davions" }],
        subject: `⚠️ ${expiring.length} certificado(s) SSL vence(m) em breve — Davions`,
        htmlContent: htmlBody,
      }),
    });

    if (!brevoRes.ok) {
      const errText = await brevoRes.text();
      console.error("Brevo error:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await brevoRes.json();
    console.log("SSL expiry notification sent:", result);

    return new Response(
      JSON.stringify({
        ok: true,
        checked: certs.length,
        expiring: expiring.length,
        domains: expiring.map((c) => c.domain),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("notify-ssl-expiry error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
