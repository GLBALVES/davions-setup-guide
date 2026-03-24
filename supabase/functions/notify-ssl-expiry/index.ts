import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VPS_CERTS_URL = "https://davions.giombelli.com.br/api/certs";
const ALERT_EMAIL = "team@davions.com";
const DAYS_WARNING = 30;
const DAYS_CRITICAL = 7;

interface VpsCert {
  domain: string;
  expiresAt: string | null;
}

interface AlertStateRow {
  domain: string;
  bucket: string;
  expires_at: string | null;
  notified_at: string;
  updated_at: string;
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

function daysUntil(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt).getTime();
  if (isNaN(expiry)) return null;
  return Math.ceil((expiry - Date.now()) / (1000 * 60 * 60 * 24));
}

function getBucket(days: number | null): "critical" | "warning" | "ok" {
  if (days === null) return "ok";
  if (days <= DAYS_CRITICAL) return "critical";
  if (days <= DAYS_WARNING) return "warning";
  return "ok";
}

/** Resolve real expiry for a domain via the check-ssl-cert edge function */
async function resolveExpiry(
  domain: string,
  supabaseUrl: string,
  anonKey: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/check-ssl-cert?domain=${encodeURIComponent(domain)}`,
      {
        headers: { Authorization: `Bearer ${anonKey}` },
        signal: AbortSignal.timeout(20000),
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.expiresAt ?? null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!BREVO_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing required environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 0. Test mode: ?force_test=true injects a fake cert expiring in 20 days ──
    const url = new URL(req.url);
    const forceTest = url.searchParams.get("force_test") === "true";

    let resolved: { domain: string; expiresAt: string | null; days: number | null; bucket: "critical" | "warning" | "ok" }[];

    if (forceTest) {
      const fakeExpiry = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
      resolved = [
        { domain: "test-cert.davions.com", expiresAt: fakeExpiry, days: 20, bucket: "warning" },
      ];
      console.log("TEST MODE: using fake cert with 20 days remaining");
    } else {
      // ── 1. Fetch cert list from VPS ────────────────────────────────────────
      const certsRes = await fetch(VPS_CERTS_URL);
      if (!certsRes.ok) {
        return new Response(
          JSON.stringify({ error: `VPS API returned ${certsRes.status}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const raw = await certsRes.json();
      const certs = normalizeCerts(Array.isArray(raw) ? raw : []);

      // ── 2. Resolve real expiry via crt.sh for each domain ─────────────────
      resolved = await Promise.all(
        certs.map(async (cert) => {
          const expiresAt = await resolveExpiry(cert.domain, SUPABASE_URL, ANON_KEY);
          const days = daysUntil(expiresAt);
          const bucket = getBucket(days);
          return { domain: cert.domain, expiresAt, days, bucket } as const;
        })
      );
    }

    // ── 3. Load previous snapshot from DB ─────────────────────────────────
    const snapshotRes = await fetch(
      `${SUPABASE_URL}/rest/v1/ssl_alert_state?select=*`,
      {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      }
    );
    const prevRows: AlertStateRow[] = snapshotRes.ok ? await snapshotRes.json() : [];
    const prevMap = new Map(prevRows.map((r) => [r.domain, r.bucket]));

    // ── 4. Diff: find new alerts and resolved domains ──────────────────────
    type AlertEntry = { domain: string; expiresAt: string | null; days: number | null; bucket: string };
    const newAlerts: AlertEntry[] = [];
    const resolved_domains: AlertEntry[] = [];
    const toUpsert: AlertEntry[] = [];

    for (const cert of resolved) {
      const prev = prevMap.get(cert.domain);
      if (cert.bucket === "ok") {
        if (prev && prev !== "ok") {
          resolved_domains.push(cert);
        }
        // delete from state if it was tracked
      } else {
        // alert bucket (critical or warning)
        if (!prev || prev === "ok") {
          newAlerts.push(cert);
          toUpsert.push(cert);
        } else if (prev === "warning" && cert.bucket === "critical") {
          // escalation: warning → critical counts as new alert
          newAlerts.push(cert);
          toUpsert.push(cert);
        } else {
          // same bucket, no change — just refresh updated_at silently
          toUpsert.push(cert);
        }
      }
    }

    // ── 5. Skip email if no new alerts ────────────────────────────────────
    if (newAlerts.length === 0) {
      // Still persist any bucket changes silently
      await persistState(SUPABASE_URL, SERVICE_ROLE_KEY, toUpsert, resolved_domains.map((r) => r.domain));
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          checked: certs.length,
          message: "Nenhuma mudança de status detectada. E-mail não enviado.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 6. Build and send email ────────────────────────────────────────────
    const newRows = newAlerts
      .map((c) => {
        const expDate = c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("pt-BR") : "—";
        const urgency = c.bucket === "critical" ? "#dc2626" : "#d97706";
        const label = c.bucket === "critical" ? "CRÍTICO" : "ATENÇÃO";
        return `
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:10px 12px;font-family:monospace;font-size:13px;">${c.domain}</td>
          <td style="padding:10px 12px;font-size:13px;">${expDate}</td>
          <td style="padding:10px 12px;text-align:center;">
            <span style="background:${urgency};color:#fff;font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;">
              ${c.days !== null ? `${c.days}d` : "?"} · ${label}
            </span>
          </td>
        </tr>`;
      })
      .join("");

    const resolvedRows =
      resolved_domains.length > 0
        ? `<h3 style="font-size:14px;font-weight:600;color:#16a34a;margin-top:28px;">✅ Resolvidos desde o último alerta</h3>
           <ul style="font-size:13px;color:#444;">${resolved_domains.map((r) => `<li style="font-family:monospace;">${r.domain}</li>`).join("")}</ul>`
        : "";

    const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:640px;margin:0 auto;padding:32px 24px;">
  <h2 style="font-size:18px;font-weight:600;margin-bottom:4px;">⚠️ Novo alerta SSL — ${newAlerts.length} domínio(s)</h2>
  <p style="color:#666;font-size:13px;margin-top:0;">
    Os seguintes domínios <strong>mudaram de status</strong> e agora estão próximos do vencimento (menos de ${DAYS_WARNING} dias).
  </p>

  <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px;">
    <thead>
      <tr style="background:#f5f5f5;border-bottom:2px solid #e0e0e0;">
        <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#888;">Domínio</th>
        <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#888;">Vencimento</th>
        <th style="padding:10px 12px;text-align:center;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#888;">Status</th>
      </tr>
    </thead>
    <tbody>${newRows}</tbody>
  </table>

  ${resolvedRows}

  <p style="font-size:13px;color:#444;margin-top:24px;">
    <strong>Ação recomendada:</strong> Acesse
    <a href="https://app.davions.com/admin/vps-setup" style="color:#111;">Admin → VPS Setup</a>
    e use o painel "SSL Renewal" para renovar os certificados.
  </p>

  <hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />
  <p style="font-size:11px;color:#bbb;">
    Próximo envio somente se o status mudar · Davions · ${new Date().toLocaleString("pt-BR", { timeZone: "UTC" })} UTC
  </p>
</body>
</html>`;

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
        subject: `⚠️ Novo alerta SSL: ${newAlerts.length} domínio(s) — Davions`,
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

    // ── 7. Persist updated state ───────────────────────────────────────────
    await persistState(SUPABASE_URL, SERVICE_ROLE_KEY, toUpsert, resolved_domains.map((r) => r.domain));

    console.log("SSL alert sent for:", newAlerts.map((c) => c.domain));

    return new Response(
      JSON.stringify({
        ok: true,
        checked: certs.length,
        newAlerts: newAlerts.length,
        resolved: resolved_domains.length,
        domains: newAlerts.map((c) => c.domain),
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

async function persistState(
  supabaseUrl: string,
  serviceRoleKey: string,
  toUpsert: { domain: string; bucket: string; expiresAt: string | null }[],
  toDelete: string[]
): Promise<void> {
  const now = new Date().toISOString();

  if (toUpsert.length > 0) {
    const rows = toUpsert.map((r) => ({
      domain: r.domain,
      bucket: r.bucket,
      expires_at: r.expiresAt,
      updated_at: now,
    }));
    await fetch(`${supabaseUrl}/rest/v1/ssl_alert_state`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(rows),
    });
  }

  for (const domain of toDelete) {
    await fetch(
      `${supabaseUrl}/rest/v1/ssl_alert_state?domain=eq.${encodeURIComponent(domain)}`,
      {
        method: "DELETE",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );
  }
}
