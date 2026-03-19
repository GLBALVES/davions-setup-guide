import { useState } from "react";
import { Copy, Check, Server, CheckCircle, AlertTriangle } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className="absolute top-3 right-3 p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title="Copy"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">
          {label}
        </p>
      )}
      <div className="relative">
        <pre className="bg-muted rounded-md px-4 py-3 pr-10 text-xs font-mono overflow-x-auto leading-relaxed text-foreground">
          {code}
        </pre>
        <CopyButton text={code} />
      </div>
    </div>
  );
}

function Section({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-[10px] font-light shrink-0">
          {step}
        </span>
        <h2 className="text-[10px] tracking-[0.3em] uppercase font-light text-foreground">
          {title}
        </h2>
      </div>
      <div className="pl-9 space-y-4">{children}</div>
    </div>
  );
}

const CADDYFILE = `{
  email admin@davions.com
  on_demand_tls {
    ask https://pjcegphrngpedujeatrl.supabase.co/functions/v1/validate-domain?domain={host}
    interval 2m
    burst    5
  }
}

# Block direct IP / plain HTTP access
:80 {
  respond "Not Found" 404
}

# Handle ALL custom domains via On-Demand TLS
# NOTE: do NOT add a :443 fallback block — it would conflict with on_demand on port 443
https:// {
  tls {
    on_demand
  }
  reverse_proxy https://davions-page-builder.lovable.app {
    header_up Host {upstream_hostport}
    header_up X-Forwarded-Host {host}
    header_up X-Real-IP {remote_host}
    transport http {
      tls_server_name davions-page-builder.lovable.app
    }
  }
}`;

const INSTALL_CADDY = `sudo apt update && sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy`;

const FIREWALL_CMDS = `sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status`;

const TEST_EDGE = `# Test the validate-domain Edge Function
curl -s "https://pjcegphrngpedujeatrl.supabase.co/functions/v1/validate-domain?domain=davions.nevoxholding.com"
# Expected: {"registered":true}`;

const TEST_SSL = `# After pointing the domain's A record to the VPS IP, test TLS
curl -vI https://yourdomain.com 2>&1 | grep -E "SSL|subject|issuer|HTTP"`;

const CADDY_RELOAD = `# Validate syntax before reloading
sudo caddy validate --config /etc/caddy/Caddyfile

# Write the Caddyfile to /etc/caddy/Caddyfile, then:
sudo systemctl reload caddy

# Check Caddy status
sudo systemctl status caddy`;

const CADDY_DIAGNOSE = `# Last 50 log lines — look for TLS errors or "ask" rejections
sudo journalctl -u caddy -n 50 --no-pager

# Follow logs in real time while hitting the domain in the browser
sudo journalctl -u caddy -f

# Check if the certificate was already issued for the domain
sudo ls /var/lib/caddy/.local/share/caddy/certificates/acme-v02.api.letsencrypt.org-directory/

# Test that Caddy can reach validate-domain (run from the VPS)
curl -s "https://pjcegphrngpedujeatrl.supabase.co/functions/v1/validate-domain?domain=davions.nevoxholding.com"
# Must return: {"registered":true}  — status 200, otherwise on_demand_tls will be denied`;

const TROUBLESHOOT = [
  {
    issue: "TLS certificate not issued",
    fix: 'Check that the validate-domain Edge Function returns {"registered":true} for the domain. Run the curl test above.',
  },
  {
    issue: "502 Bad Gateway",
    fix: "The origin (davions-page-builder.lovable.app) may be temporarily unreachable. Check with: curl -I https://davions-page-builder.lovable.app",
  },
  {
    issue: "Caddy fails to start",
    fix: "Run `sudo caddy validate --config /etc/caddy/Caddyfile` to check for syntax errors before reloading.",
  },
  {
    issue: "Domain not redirecting to photographer store",
    fix: "Confirm the custom_domain column in the photographers table matches exactly what the client set (no protocol, no trailing slash).",
  },
  {
    issue: "on_demand_tls: ask URL rejected",
    fix: "Ensure the validate-domain Edge Function is deployed and the Supabase anon key header is not required (it's public). Test with curl.",
  },
];

export default function AdminVpsSetup() {
  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto px-8 py-10 space-y-10">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Server size={13} className="text-muted-foreground" />
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-light">
              Admin · Infrastructure
            </p>
          </div>
          <h1 className="text-lg font-light tracking-wide text-foreground">
            VPS / Caddy Setup Guide
          </h1>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            Step-by-step reference for provisioning a new proxy server that
            handles custom domains with on-demand TLS.
          </p>
        </div>

        {/* Prerequisites */}
        <Section step={1} title="Prerequisites">
          <ul className="space-y-2 text-xs font-light text-muted-foreground">
            {[
              "Ubuntu 22.04 LTS (clean install)",
              "Public IP assigned to the VPS (e.g. 147.93.112.182)",
              "Ports 80, 443 and 22 open at the firewall/cloud level",
              "Root or sudo access via SSH",
              "The validate-domain Edge Function deployed and accessible",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle size={12} className="text-foreground mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        {/* Install Caddy */}
        <Section step={2} title="Install Caddy">
          <p className="text-xs font-light text-muted-foreground">
            Add the official Caddy repository and install via apt.
          </p>
          <CodeBlock code={INSTALL_CADDY} label="Terminal — run as root / sudo" />
        </Section>

        {/* Caddyfile */}
        <Section step={3} title="Configure Caddyfile">
          <p className="text-xs font-light text-muted-foreground">
            Replace the default{" "}
            <code className="font-mono bg-muted px-1 rounded text-[11px]">
              /etc/caddy/Caddyfile
            </code>{" "}
            with the configuration below. The{" "}
            <code className="font-mono bg-muted px-1 rounded text-[11px]">ask</code>{" "}
            directive calls our Edge Function before issuing any certificate, so
            only registered domains get TLS.
          </p>
          <CodeBlock code={CADDYFILE} label="/etc/caddy/Caddyfile" />
          <CodeBlock code={CADDY_RELOAD} label="Reload & verify Caddy" />
        </Section>

        {/* Firewall */}
        <Section step={4} title="Firewall (ufw)">
          <p className="text-xs font-light text-muted-foreground">
            Enable UFW and allow the three required ports.
          </p>
          <CodeBlock code={FIREWALL_CMDS} label="Terminal" />
        </Section>

        {/* Test & Verify */}
        <Section step={5} title="Test & Verify">
          <CodeBlock
            code={TEST_EDGE}
            label="1 — Verify the Edge Function responds correctly"
          />
          <CodeBlock
            code={TEST_SSL}
            label="2 — Confirm TLS is working for a registered domain"
          />
        </Section>

        {/* Diagnose */}
        <Section step={6} title="Diagnose a 404 / TLS Issue">
          <p className="text-xs font-light text-muted-foreground">
            Run these commands <strong>on the VPS</strong> to see what Caddy is
            doing. The most common cause of 404 after DNS has propagated is that
            the On-Demand TLS certificate is still being issued — or that the
            old{" "}
            <code className="font-mono bg-muted px-1 rounded text-[11px]">
              :80, :443
            </code>{" "}
            fallback block is conflicting with port 443.
          </p>
          <CodeBlock code={CADDY_DIAGNOSE} label="VPS — diagnose Caddy" />
          <div className="border border-border rounded-md px-4 py-3 space-y-1">
            <p className="text-xs font-light text-foreground">
              Key fix: remove any <code className="font-mono bg-muted px-1 rounded text-[11px]">:80, :443</code> block from the Caddyfile
            </p>
            <p className="text-[11px] font-light text-muted-foreground leading-relaxed">
              A combined <code className="font-mono bg-muted px-0.5 rounded text-[10px]">:80, :443 &#123; tls internal &#125;</code> block
              competes with the <code className="font-mono bg-muted px-0.5 rounded text-[10px]">https://</code> block for port 443 and
              prevents On-Demand TLS from issuing certificates. Use only <code className="font-mono bg-muted px-0.5 rounded text-[10px]">:80 &#123; respond "Not Found" 404 &#125;</code> as shown above.
            </p>
          </div>
        </Section>

        {/* Troubleshooting */}
        <Section step={7} title="Troubleshooting">
          <div className="space-y-3">
            {TROUBLESHOOT.map(({ issue, fix }) => (
              <div
                key={issue}
                className="border border-border rounded-md px-4 py-3 space-y-1"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    size={12}
                    className="text-muted-foreground mt-0.5 shrink-0"
                  />
                  <p className="text-xs font-light text-foreground">{issue}</p>
                </div>
                <p className="text-[11px] font-light text-muted-foreground pl-[18px] leading-relaxed">
                  {fix}
                </p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </AdminLayout>
  );
}
