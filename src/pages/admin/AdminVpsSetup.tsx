import { useState } from "react";
import { Copy, Check, Server, CheckCircle, AlertTriangle, Wifi, WifiOff, Loader2, Search, Terminal, Package, Cpu, ChevronRight, RefreshCw, ShieldCheck, ShieldAlert, Bell, Clock } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  highlight,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={cn("space-y-4 rounded-lg transition-colors duration-300", highlight && "bg-foreground/[0.03] border border-foreground/20 p-4 -mx-4")}>
      <div className="flex items-center gap-3">
        <span className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-light shrink-0 transition-colors",
          highlight ? "bg-foreground text-background ring-2 ring-foreground/20" : "bg-foreground text-background"
        )}>
          {step}
        </span>
        <h2 className="text-[10px] tracking-[0.3em] uppercase font-light text-foreground">
          {title}
        </h2>
        {highlight && (
          <span className="ml-auto text-[9px] tracking-[0.2em] uppercase font-light text-foreground bg-foreground/10 border border-foreground/20 rounded px-2 py-0.5">
            Recommended
          </span>
        )}
      </div>
      <div className="pl-9 space-y-4">{children}</div>
    </div>
  );
}

const CADDYFILE = `{
  email admin@davions.com
  on_demand_tls {
    # Caddy automatically appends ?domain=<hostname> — do NOT use {host} placeholder here
    ask https://pjcegphrngpedujeatrl.supabase.co/functions/v1/validate-domain
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
  # Ensure browser requests for assets served through this proxy are not blocked by CORS.
  header Access-Control-Allow-Origin "*"
  # Upstream: davions-page-builder.lovable.app is the permanent project identifier.
  # Send Host: davions-page-builder.lovable.app so the CDN recognises the project.
  # Preserve the original custom domain in X-Forwarded-Host for React domain detection.
  reverse_proxy https://davions-page-builder.lovable.app {
    header_up Host davions-page-builder.lovable.app
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

const CADDY_RELOAD = `# ── Standalone Caddy (systemd) ──────────────────────────────────
# Validate syntax
sudo caddy validate --config /etc/caddy/Caddyfile

# Reload without downtime
sudo systemctl reload caddy

# Check status
sudo systemctl status caddy

# ── Easypanel / Docker ────────────────────────────────────────────
# systemctl reload caddy will NOT work here — Caddy runs inside a container.
# After editing /etc/caddy/Caddyfile inside the container, restart it:
docker restart caddy-proxy

# Tail logs to confirm it started cleanly
docker logs caddy-proxy --tail 30`;

const CADDY_DIAGNOSE = `# Last 50 log lines — look for TLS errors or "ask" rejections
sudo journalctl -u caddy -n 50 --no-pager

# Follow logs in real time while hitting the domain in the browser
sudo journalctl -u caddy -f

# Check if the certificate was already issued for the domain
sudo ls /var/lib/caddy/.local/share/caddy/certificates/acme-v02.api.letsencrypt.org-directory/

# Test that Caddy can reach validate-domain (run from the VPS)
curl -s "https://pjcegphrngpedujeatrl.supabase.co/functions/v1/validate-domain?domain=davions.nevoxholding.com"
# Must return: {"registered":true}  — status 200, otherwise on_demand_tls will be denied`;

const CADDYFILE_EASYPANEL = `{
    auto_https off
}

# Caddy listens on :8080 — Traefik terminates TLS and forwards here.
# The {host} placeholder carries the original photographer domain.
:8080 {
    header Access-Control-Allow-Origin "*"

    # Upstream: davions-page-builder.lovable.app is the permanent project identifier.
    # Send Host: davions-page-builder.lovable.app so the CDN recognises the project.
    # Preserve the original custom domain in X-Forwarded-Host for React domain detection.
    # Remove headers that may confuse the CDN (must be inside reverse_proxy block).
    reverse_proxy https://davions-page-builder.lovable.app {
        header_up Host davions-page-builder.lovable.app
        header_up X-Forwarded-Host {host}
        header_up -X-Forwarded-For
        header_up -X-Real-IP
        transport http {
            tls
            tls_server_name davions-page-builder.lovable.app
        }
    }

    handle_errors {
        rewrite * /index.html
    }
}`;

const EASYPANEL_DOCKER_RUN = `# 0. Confirm the Traefik network name (usually "easypanel")
docker network ls | grep -i traefik

# 1. Create the Caddyfile on the host
sudo mkdir -p /etc/caddy
sudo tee /etc/caddy/Caddyfile <<'EOF'
{
    auto_https off
}

:8080 {
    header Access-Control-Allow-Origin "*"

    reverse_proxy https://davions-page-builder.lovable.app {
        header_up Host davions-page-builder.lovable.app
        header_up X-Forwarded-Host {host}
        header_up -X-Forwarded-For
        header_up -X-Real-IP
        transport http {
            tls
            tls_server_name davions-page-builder.lovable.app
        }
    }

    handle_errors {
        rewrite * /index.html
    }
}
EOF

# 2. Stop and remove the old container (ignore errors if not yet created)
docker stop caddy-proxy 2>/dev/null; docker rm caddy-proxy 2>/dev/null

# 3. Recreate with Traefik labels + correct network
docker run -d --name caddy-proxy \\
  --restart unless-stopped \\
  -p 127.0.0.1:8080:8080 \\
  -v /etc/caddy/Caddyfile:/etc/caddy/Caddyfile:ro \\
  --network easypanel \\
  --label "traefik.enable=true" \\
  --label "traefik.http.routers.caddy-proxy.rule=HostRegexp(\`{host:.+}\`)" \\
  --label "traefik.http.routers.caddy-proxy.entrypoints=websecure" \\
  --label "traefik.http.routers.caddy-proxy.tls=true" \\
  --label "traefik.http.routers.caddy-proxy.tls.certresolver=letsencrypt" \\
  --label "traefik.http.routers.caddy-proxy.priority=1" \\
  --label "traefik.http.services.caddy-proxy.loadbalancer.server.port=8080" \\
  caddy:latest

# 4. Verify Caddy is listening internally (expected: 200)
curl -s -o /dev/null -w "%{http_code}\\n" -H "Host: davions.giombelli.com.br" http://127.0.0.1:8080

# 5. Check Traefik sees the container
docker inspect caddy-proxy | grep -A 20 '"Labels"'
docker logs caddy-proxy --tail 20

# 6. Test full external flow (expected: HTTP/2 200)
curl -vI https://davions.giombelli.com.br 2>&1 | grep -E "< HTTP|SSL|subject|issuer"`;

const EASYPANEL_TRAEFIK_LABELS = `# Option B — docker-compose / Easypanel App service
# Set image: caddy:latest, internal port 8080.
# Add these labels so Traefik routes wildcard custom domains to the container:
#
# traefik.enable=true
# traefik.http.routers.caddy-proxy.rule=HostRegexp(\`{host:.+}\`)
# traefik.http.routers.caddy-proxy.entrypoints=websecure
# traefik.http.routers.caddy-proxy.tls=true
# traefik.http.routers.caddy-proxy.tls.certresolver=letsencrypt
# traefik.http.routers.caddy-proxy.priority=1
# traefik.http.services.caddy-proxy.loadbalancer.server.port=8080
#
# IMPORTANT: set a LOW priority (1) so specific Easypanel app routes still win.`;

const TROUBLESHOOT = [
  {
    issue: "404 on custom domain even though DNS is pointing to the VPS (Easypanel)",
    fix: "The Traefik reverse proxy in Easypanel is returning 404 because the caddy-proxy container is NOT registered with the correct Traefik labels or is not connected to the Traefik network. Run: docker inspect caddy-proxy | grep -A5 Labels — you should see the HostRegexp rule. If the container is missing the labels, recreate it using the full docker run command in Step 8. Also verify: docker network inspect easypanel | grep caddy-proxy",
  },
  {
    issue: "404 on custom domain — CDN returning not found",
    fix: 'The Lovable CDN returns 404 when it receives an unknown Host header. The Caddyfile must proxy to `davions-page-builder.lovable.app` and send `header_up Host davions-page-builder.lovable.app` — this is the permanent project identifier the CDN recognises.',
  },
  {
    issue: "Internal curl returns 200 but external domain still returns 404",
    fix: "The Caddy container is working (curl http://127.0.0.1:8080 with Host header returns 200), but Traefik is not routing to it. Check that: 1) the container is on the 'easypanel' network, 2) traefik.enable=true label is set, 3) the entrypoint is 'websecure' (port 443). Run: docker logs caddy-proxy --tail 20 and check Traefik logs.",
  },
  {
    issue: "Photographer data not loading — blank store page",
    fix: 'The React app calls Supabase directly from the browser, so Supabase CORS headers are already correct. Ensure `header Access-Control-Allow-Origin "*"` is present at the top of the `:8080` block in the Caddyfile — the template above already includes it.',
  },
  {
    issue: "TLS certificate not issued",
    fix: 'Check that the validate-domain Edge Function returns {"registered":true} for the domain. Run the curl test above.',
  },
  {
    issue: "502 Bad Gateway",
    fix: "The origin (davions-page-builder.lovable.app) may be temporarily unreachable. Check with: curl -I https://davions-page-builder.lovable.app",
  },
  {
    issue: "Caddy fails to start — port 80/443 already in use by docker-proxy",
    fix: "The VPS already runs Easypanel + Traefik which owns ports 80 and 443. Do NOT stop Traefik. Instead, run Caddy as a Docker container on an internal port (8080) and route traffic through Traefik. See the Easypanel / Traefik section below.",
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

type EnvType = "standalone" | "docker" | null;

const DETECT_COMMANDS = [
  {
    id: "systemd",
    label: "Is Caddy running as a systemd service?",
    cmd: "systemctl is-active caddy",
    standalone: "active",
    docker: "inactive or not-found",
  },
  {
    id: "docker",
    label: "Is there a caddy-proxy Docker container?",
    cmd: "docker ps --filter name=caddy-proxy --format '{{.Names}}'",
    standalone: "(empty output)",
    docker: "caddy-proxy",
  },
  {
    id: "traefik",
    label: "Is Traefik/Easypanel owning ports 80/443?",
    cmd: "ss -tlnp | grep -E ':80|:443'",
    standalone: "caddy in LISTEN column",
    docker: "docker-proxy / traefik in LISTEN column",
  },
  {
    id: "network",
    label: "Is the 'easypanel' Docker network present?",
    cmd: "docker network ls | grep easypanel",
    standalone: "(empty — no Easypanel)",
    docker: "easypanel network listed",
  },
];

function EnvDetector({ detected, onSelect }: { detected: EnvType; onSelect: (v: EnvType) => void }) {
  return (
    <div className="border border-border rounded-lg p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Terminal size={13} className="text-muted-foreground" />
        <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-light">
          Environment Auto-Detection
        </p>
      </div>

      <p className="text-xs font-light text-muted-foreground leading-relaxed">
        Run these commands <strong className="text-foreground font-normal">on the VPS via SSH</strong> to determine
        whether Caddy should run as a standalone systemd service or as a Docker container behind Traefik/Easypanel.
        Then select the detected environment below — the guide will highlight the correct Caddyfile variant.
      </p>

      {/* Detection commands table */}
      <div className="space-y-2">
        {DETECT_COMMANDS.map(({ id, label, cmd, standalone, docker }) => (
          <div key={id} className="rounded-md border border-border overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/50">
              <p className="text-[11px] font-light text-foreground">{label}</p>
            </div>
            <div className="px-4 py-2.5 space-y-2">
              <div className="relative">
                <pre className="bg-muted rounded px-3 py-2 pr-10 text-xs font-mono text-foreground leading-relaxed overflow-x-auto">
                  {cmd}
                </pre>
                <CopyButton text={cmd} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-light">
                <div className="flex items-start gap-1.5">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    <span className="text-foreground">Standalone:</span> {standalone}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Package size={11} className="mt-0.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    <span className="text-foreground">Docker:</span> {docker}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Environment selector */}
      <div className="space-y-2">
        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">
          Select your environment
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              {
                value: "standalone" as EnvType,
                icon: Cpu,
                title: "Standalone Caddy",
                desc: "Caddy installed via apt, running as a systemd service. Owns ports 80 & 443 directly.",
              },
              {
                value: "docker" as EnvType,
                icon: Package,
                title: "Docker / Easypanel",
                desc: "Easypanel + Traefik already own ports 80/443. Caddy runs as a container on port 8080.",
              },
            ] as { value: EnvType; icon: React.ElementType; title: string; desc: string }[]
          ).map(({ value, icon: Icon, title, desc }) => (
            <button
              key={value as string}
              onClick={() => onSelect(detected === value ? null : value)}
              className={cn(
                "text-left rounded-md border p-3.5 space-y-1.5 transition-colors duration-150",
                detected === value
                  ? "border-foreground bg-foreground/5"
                  : "border-border hover:border-foreground/40"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon size={12} className={detected === value ? "text-foreground" : "text-muted-foreground"} />
                  <span className={cn("text-xs font-light", detected === value ? "text-foreground" : "text-muted-foreground")}>
                    {title}
                  </span>
                </div>
                {detected === value && <Check size={11} className="text-foreground" />}
              </div>
              <p className="text-[11px] font-light text-muted-foreground leading-relaxed">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {detected && (
        <div className="flex items-center gap-2 text-[11px] font-light text-foreground bg-foreground/5 border border-foreground/20 rounded-md px-3 py-2">
          <ChevronRight size={11} className="shrink-0" />
          {detected === "standalone"
            ? "Scroll to Step 3 — use the standard Caddyfile with on_demand_tls and Step 5 for reload commands."
            : "Scroll to Step 8 — use the Easypanel/Traefik Caddyfile variant and Docker run command."}
        </div>
      )}
    </div>
  );
}

// ── SSL Renewal Panel ────────────────────────────────────────────────────────
const VPS_BASE = "https://davions.giombelli.com.br";

type VpsCert = { domain: string; expiresAt?: string | null };

type SslAlertStateRow = {
  domain: string;
  bucket: string;
  expires_at: string | null;
  notified_at: string;
  updated_at: string;
};

function BucketBadge({ bucket }: { bucket: string }) {
  if (bucket === "critical") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-light border border-destructive/20">
        <AlertTriangle size={8} />
        Crítico
      </span>
    );
  }
  if (bucket === "warning") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 text-[10px] font-light border border-yellow-500/20">
        <AlertTriangle size={8} />
        Atenção
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-light border border-emerald-500/20">
      <CheckCircle size={8} />
      OK
    </span>
  );
}

function SslAlertHistoryPanel() {
  const {
    data: rows,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<SslAlertStateRow[]>({
    queryKey: ["ssl-alert-state"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssl_alert_state" as never)
        .select("*")
        .order("notified_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SslAlertStateRow[];
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="border border-border rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={13} className="text-muted-foreground" />
          <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-light">
            Histórico de Alertas SSL
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-light text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
        >
          {isFetching ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          Atualizar
        </button>
      </div>

      <p className="text-xs font-light text-muted-foreground">
        Domínios que dispararam ou receberam um alerta SSL. O e-mail só é enviado quando o status muda — esta tabela é o estado persistido para evitar spam.
      </p>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded-md animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (!rows || rows.length === 0) && (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center border border-dashed border-border rounded-md">
          <CheckCircle size={20} className="text-emerald-500/60" />
          <p className="text-xs font-light text-muted-foreground">
            Nenhum alerta registrado — todos os certificados estão saudáveis.
          </p>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left py-2 px-4 text-[10px] tracking-[0.12em] uppercase text-muted-foreground font-light">Domínio</th>
                <th className="text-left py-2 px-4 text-[10px] tracking-[0.12em] uppercase text-muted-foreground font-light">Status</th>
                <th className="text-left py-2 px-4 text-[10px] tracking-[0.12em] uppercase text-muted-foreground font-light">Vencimento</th>
                <th className="text-left py-2 px-4 text-[10px] tracking-[0.12em] uppercase text-muted-foreground font-light">Último alerta</th>
                <th className="text-left py-2 px-4 text-[10px] tracking-[0.12em] uppercase text-muted-foreground font-light hidden sm:table-cell">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                let notifiedFmt = "—";
                let notifiedRelative = "";
                let updatedFmt = "—";
                try {
                  const d = new Date(row.notified_at);
                  notifiedFmt = format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
                  notifiedRelative = formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
                } catch { /* noop */ }
                try {
                  updatedFmt = format(new Date(row.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR });
                } catch { /* noop */ }
                let expiresFmt = "—";
                try {
                  if (row.expires_at) expiresFmt = format(new Date(row.expires_at), "dd/MM/yyyy", { locale: ptBR });
                } catch { /* noop */ }

                return (
                  <tr key={row.domain} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4">
                      <span className="font-mono text-foreground">{row.domain}</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <BucketBadge bucket={row.bucket} />
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground font-light">{expiresFmt}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Clock size={10} className="text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground font-light" title={notifiedFmt}>
                          {notifiedRelative || notifiedFmt}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground font-light hidden sm:table-cell">{updatedFmt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}



function SslRenewalPanel() {
  const [renewing, setRenewing] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, "ok" | "error">>({});

  const {
    data: certs,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<VpsCert[]>({
    queryKey: ["vps-certs-renewal"],
    queryFn: async () => {
      const res = await fetch(`${VPS_BASE}/api/certs`);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const json = await res.json();
      if (!Array.isArray(json)) throw new Error("Unexpected response format");
      return json.map((item: unknown) => {
        if (typeof item === "string") return { domain: item, expiresAt: null };
        if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>;
          const expiry = obj.expiresAt ?? obj.expires_at ?? obj.not_after ?? null;
          return {
            domain: String(obj.domain ?? obj.name ?? obj.subject ?? "unknown"),
            expiresAt: expiry != null ? String(expiry) : null,
          };
        }
        return { domain: "unknown", expiresAt: null };
      });
    },
    retry: 1,
  });

  const renewCert = async (domain: string) => {
    setRenewing((r) => ({ ...r, [domain]: true }));
    setResults((r) => { const n = { ...r }; delete n[domain]; return n; });
    try {
      const res = await fetch(`${VPS_BASE}/api/renew-cert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResults((r) => ({ ...r, [domain]: "ok" }));
      toast.success(`Renovação iniciada para ${domain}`);
      setTimeout(() => refetch(), 3000);
    } catch (e) {
      setResults((r) => ({ ...r, [domain]: "error" }));
      toast.error(`Falha ao renovar ${domain}: ${e instanceof Error ? e.message : "Erro desconhecido"}`);
    } finally {
      setRenewing((r) => ({ ...r, [domain]: false }));
    }
  };

  const renewAll = async () => {
    if (!certs?.length) return;
    for (const cert of certs) {
      await renewCert(cert.domain);
    }
  };

  const isExpiringSoon = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return false;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return diff < 1000 * 60 * 60 * 24 * 30; // within 30 days
  };

  return (
    <div className="border border-border rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={13} className="text-muted-foreground" />
          <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-light">
            Renovação de Certificados SSL
          </p>
        </div>
        <div className="flex items-center gap-2">
          {certs && certs.length > 0 && (
            <button
              onClick={renewAll}
              disabled={isFetching || Object.values(renewing).some(Boolean)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-light text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={11} />
              Renovar todos
            </button>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-light text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
          >
            {isFetching ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            Atualizar
          </button>
        </div>
      </div>

      <p className="text-xs font-light text-muted-foreground">
        Force a renovação de certificados SSL diretamente da VPS. Útil para certificados próximos da expiração ou com problemas de emissão.
      </p>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded-md animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertTriangle size={12} className="text-destructive mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-light text-destructive">Erro ao buscar certificados da VPS</p>
            <p className="text-[11px] font-mono text-muted-foreground">
              {error instanceof Error ? error.message : "Erro desconhecido"}
            </p>
          </div>
        </div>
      )}

      {certs && certs.length === 0 && (
        <p className="text-xs font-light text-muted-foreground text-center py-4">
          Nenhum certificado encontrado na VPS.
        </p>
      )}

      {certs && certs.length > 0 && (
        <div className="divide-y divide-border border border-border rounded-md overflow-hidden">
          {certs.map((cert) => {
            const expiring = isExpiringSoon(cert.expiresAt);
            const status = results[cert.domain];
            return (
              <div
                key={cert.domain}
                className="flex items-center justify-between px-4 py-2.5 gap-4"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {status === "ok" ? (
                    <CheckCircle size={12} className="text-foreground shrink-0" />
                  ) : status === "error" ? (
                    <ShieldAlert size={12} className="text-destructive shrink-0" />
                  ) : expiring ? (
                    <AlertTriangle size={12} className="text-muted-foreground shrink-0" />
                  ) : (
                    <ShieldCheck size={12} className="text-muted-foreground shrink-0" />
                  )}
                  <span className="text-xs font-mono text-foreground truncate">{cert.domain}</span>
                  {expiring && !status && (
                    <span className="text-[9px] tracking-[0.15em] uppercase font-light text-destructive border border-destructive/30 rounded px-1.5 py-0.5 shrink-0">
                      Expirando
                    </span>
                  )}
                  {status === "ok" && (
                    <span className="text-[9px] tracking-[0.15em] uppercase font-light text-foreground border border-foreground/30 rounded px-1.5 py-0.5 shrink-0">
                      Renovado
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {cert.expiresAt && (
                    <span className="text-[10px] font-light text-muted-foreground hidden sm:block">
                      {new Date(cert.expiresAt).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                  <button
                    onClick={() => renewCert(cert.domain)}
                    disabled={!!renewing[cert.domain]}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md border border-border text-[11px] font-light text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    {renewing[cert.domain] ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <RefreshCw size={10} />
                    )}
                    Renovar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminVpsSetup() {
  const [domain, setDomain] = useState("davions.nevoxholding.com");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    status: "active" | "pending";
    dns: { a: { ok: boolean; found: string[]; expected: string } };
  } | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [detectedEnv, setDetectedEnv] = useState<EnvType>(null);

  const checkDomain = async () => {
    if (!domain.trim()) return;
    setLoading(true);
    setResult(null);
    setCheckError(null);
    try {
      const { data, error } = await supabase.functions.invoke("check-domain", {
        body: { domain: domain.trim() },
      });
      if (error) throw error;
      setResult(data);
    } catch (e: unknown) {
      setCheckError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

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

        {/* Live DNS Diagnostic */}
        <div className="border border-border rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Wifi size={13} className="text-muted-foreground" />
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-light">
              Live DNS Diagnostic
            </p>
          </div>
          <p className="text-xs font-light text-muted-foreground">
            Check whether a domain's A record has propagated to the VPS IP in real time.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && checkDomain()}
              placeholder="e.g. studio.example.com"
              className="flex-1 bg-muted border border-border rounded-md px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
            <button
              onClick={checkDomain}
              disabled={loading || !domain.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-foreground text-background text-xs font-light disabled:opacity-50 transition-opacity"
            >
              {loading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Search size={12} />
              )}
              Check
            </button>
          </div>

          {checkError && (
            <div className="flex items-start gap-2 text-xs text-destructive font-light">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              {checkError}
            </div>
          )}

          {result && (
            <div className="space-y-3">
              {/* Status badge */}
              <div className="flex items-center gap-2">
                {result.status === "active" ? (
                  <span className="flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase font-light text-foreground">
                    <CheckCircle size={11} />
                    Active — DNS propagated
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase font-light text-muted-foreground">
                    <WifiOff size={11} />
                    Pending — DNS not yet propagated
                  </span>
                )}
              </div>

              {/* A record details */}
              <div className="bg-muted rounded-md px-4 py-3 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground font-sans font-light">Expected IP</span>
                  <span className="text-foreground">{result.dns.a.expected}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground font-sans font-light">Found A record(s)</span>
                  <span className={cn(result.dns.a.ok ? "text-foreground" : "text-destructive")}>
                    {result.dns.a.found.length > 0 ? result.dns.a.found.join(", ") : "—"}
                    {" "}
                    {result.dns.a.ok ? "✓" : "✗"}
                  </span>
                </div>
              </div>

              {!result.dns.a.ok && (
                <p className="text-[11px] font-light text-muted-foreground leading-relaxed">
                  The A record does not point to the VPS. Update it at your DNS provider to{" "}
                  <code className="font-mono bg-muted px-1 rounded text-[11px]">{result.dns.a.expected}</code>{" "}
                  and wait for propagation (usually 5–30 minutes, up to 24 h).
                </p>
              )}
            </div>
          )}
        </div>

        {/* SSL Renewal */}
        <SslRenewalPanel />

        {/* SSL Alert History */}
        <SslAlertHistoryPanel />

        {/* Environment Auto-Detection */}
        <EnvDetector detected={detectedEnv} onSelect={setDetectedEnv} />

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
        <Section step={3} title="Configure Caddyfile" highlight={detectedEnv === "standalone"}>
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

        {/* Easypanel / Traefik */}
        <Section step={8} title="Easypanel / Traefik — Running Caddy as a Docker Service" highlight={detectedEnv === "docker"}>
          <div className="space-y-1 text-xs font-light text-muted-foreground leading-relaxed">
            <p>
              If the VPS already runs <strong className="text-foreground font-normal">Easypanel</strong>, Traefik already owns ports 80 and 443.
              Starting Caddy standalone will fail with <code className="font-mono bg-muted px-1 rounded text-[11px]">bind: address already in use</code>.
            </p>
            <p className="pt-1">
              <strong className="text-foreground font-normal">Do NOT stop Traefik</strong> — it manages Easypanel itself.
              Instead, run Caddy on an internal port (8080) and let Traefik forward custom-domain traffic to it:
            </p>
          </div>

          <div className="border border-border rounded-md px-4 py-3 text-xs font-mono font-light text-muted-foreground space-y-1 leading-relaxed">
            <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-foreground font-light">Traffic flow</p>
            <p>Visitor → custom-domain.com:443</p>
            <p className="pl-4">→ Traefik (port 443, handles TLS)</p>
            <p className="pl-8">→ Caddy container (port 8080, no TLS)</p>
            <p className="pl-12">→ davions.com (Host rewritten — primary domain)</p>
          </div>

          <div className="border border-border rounded-md px-4 py-3 space-y-1">
            <p className="text-xs font-light text-foreground flex items-center gap-2">
              <AlertTriangle size={12} className="text-muted-foreground shrink-0" /> Why <code className="font-mono bg-muted px-1 rounded text-[11px]">davions.com</code> and not <code className="font-mono bg-muted px-1 rounded text-[11px]">davions-page-builder.lovable.app</code>?
            </p>
            <p className="text-[11px] font-light text-muted-foreground leading-relaxed pl-[18px]">
              Lovable/Cloudflare issues a <strong className="text-foreground font-normal">302 redirect</strong> from <code className="font-mono bg-muted px-0.5 rounded text-[10px]">.lovable.app</code> subdomains
              to the project's primary domain. Pointing the upstream directly at <code className="font-mono bg-muted px-0.5 rounded text-[10px]">davions.com</code> skips
              the redirect and returns <strong className="text-foreground font-normal">200 OK</strong> immediately.
              The <code className="font-mono bg-muted px-0.5 rounded text-[10px]">X-Forwarded-Host</code> header still carries the photographer's
              custom domain so the React app can detect it correctly.
            </p>
          </div>

          <CodeBlock
            code={CADDYFILE_EASYPANEL}
            label="/etc/caddy/Caddyfile — Traefik-compatible (no on_demand_tls)"
          />
          <CodeBlock
            code={EASYPANEL_DOCKER_RUN}
            label="Start Caddy container"
          />
          <CodeBlock
            code={EASYPANEL_TRAEFIK_LABELS}
            label="Traefik labels for Easypanel App service"
          />

          <div className="border border-border rounded-md px-4 py-3 space-y-2">
            <p className="text-xs font-light text-foreground">Easypanel App setup checklist</p>
            <ul className="space-y-1.5 text-[11px] font-light text-muted-foreground">
              {[
                "Create a new App in Easypanel → Source: Docker Image → caddy:latest",
                "Mount /etc/caddy/Caddyfile (use the Traefik-compatible version above)",
                "Set internal port to 8080",
                "Add the Traefik labels above in the Advanced → Labels section",
                "In your DNS provider, add A records for each photographer custom domain pointing to this VPS IP",
                "Traefik will issue Let's Encrypt certs automatically; Caddy only handles the reverse proxy to Lovable",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle size={11} className="text-foreground mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Section>
      </div>
    </AdminLayout>
  );
}
