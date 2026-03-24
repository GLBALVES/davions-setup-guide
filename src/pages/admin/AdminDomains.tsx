import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Globe,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Check,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Minus,
  Stethoscope,
  Wifi,
  ShieldCheck,
  Link2,
  Code2,
  ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { isCustomDomain } from "@/lib/custom-domain";

type Photographer = {
  id: string;
  email: string;
  full_name: string | null;
  business_name: string | null;
  custom_domain: string;
  store_slug: string | null;
  created_at: string;
};

type RecordStatus = "idle" | "checking" | "ok" | "fail";

type DnsDetail = {
  a: RecordStatus;
  aFound?: string[];
};

type RowStatus = "idle" | "checking" | "active" | "pending";

// ── Chain diagnostic types ──────────────────────────────────────────────────
type StepStatus = "idle" | "running" | "pass" | "fail" | "warn";

type DiagStep = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: StepStatus;
  detail: string | null;
  fix: string | null;
};

// ── Constants ───────────────────────────────────────────────────────────────
const VPS_IP = "147.93.112.182";

const COMPOUND_TLDS = [
  "com.br","net.br","org.br","edu.br","gov.br",
  "co.uk","com.au","co.nz","com.ar","com.mx","com.co",
];

function getDomainInfo(domain: string) {
  const parts = domain.split(".");
  const lastTwo = parts.slice(-2).join(".");
  const rootPartsCount = COMPOUND_TLDS.includes(lastTwo) ? 3 : 2;
  const isSubdomain = parts.length > rootPartsCount;
  const subName = isSubdomain ? parts[0] : null;
  const rootDomain = parts.slice(-rootPartsCount).join(".");

  const dnsRecords = isSubdomain
    ? [
        { type: "A", name: subName!, value: VPS_IP, purpose: "Routes traffic to your store" },
      ]
    : [
        { type: "A", name: "@",   value: VPS_IP, purpose: "Routes root domain" },
        { type: "A", name: "www", value: VPS_IP, purpose: "Routes www subdomain" },
      ];

  return { isSubdomain, dnsRecords, rootDomain };
}

// ── Small helpers ────────────────────────────────────────────────────────────
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1.5 text-muted-foreground hover:text-foreground transition-colors"
      title="Copy"
    >
      {copied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
    </button>
  );
}

function RecordBadge({ status }: { status: RecordStatus }) {
  if (status === "idle") return <Minus size={11} className="text-muted-foreground/40" />;
  if (status === "checking") return <Loader2 size={11} className="animate-spin text-muted-foreground" />;
  if (status === "ok") return <CheckCircle2 size={11} className="text-emerald-500" />;
  return <XCircle size={11} className="text-destructive" />;
}

function DnsPropagationCell({ dns }: { dns: DnsDetail | undefined }) {
  if (!dns || dns.a === "idle") {
    return <span className="text-[10px] text-muted-foreground/40">—</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <RecordBadge status={dns.a} />
        <span>A</span>
      </span>
    </div>
  );
}

function StatusBadge({ status, onCheck }: { status: RowStatus; onCheck: () => void }) {
  if (status === "checking") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 size={11} className="animate-spin" />
        <span>Checking…</span>
      </div>
    );
  }
  if (status === "active") {
    return (
      <div className="flex items-center gap-1.5">
        <CheckCircle2 size={11} className="shrink-0 text-foreground" />
        <span className="text-xs font-light text-foreground">Active</span>
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="flex items-center gap-1.5">
        <Minus size={11} className="shrink-0 text-muted-foreground" />
        <span className="text-xs font-light text-muted-foreground">Pending</span>
      </div>
    );
  }
  return (
    <button
      onClick={onCheck}
      className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
    >
      Check
    </button>
  );
}

function DnsExpansion({ domain, dns }: { domain: string; dns: DnsDetail | undefined }) {
  const { dnsRecords, isSubdomain } = getDomainInfo(domain);

  return (
    <div className="px-6 py-4 bg-muted/30 border-b border-border space-y-4">
      <p className="text-xs text-muted-foreground font-light">
        DNS records required for <span className="font-mono text-foreground">{domain}</span>
      </p>

      <div>
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left font-medium text-muted-foreground py-1.5 pr-6 pl-3 w-14">Type</th>
                <th className="text-left font-medium text-muted-foreground py-1.5 pr-6">Name</th>
                <th className="text-left font-medium text-muted-foreground py-1.5 pr-6">Value</th>
                <th className="text-left font-medium text-muted-foreground py-1.5 pr-4">Purpose</th>
                <th className="text-left font-medium text-muted-foreground py-1.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {dnsRecords.map((r, i) => {
                const recordStatus: RecordStatus = dns ? dns.a : "idle";
                return (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 pr-6 pl-3">
                      <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">{r.type}</Badge>
                    </td>
                    <td className="py-1.5 pr-6">
                      <span className="font-mono text-foreground">{r.name}</span>
                      <CopyButton value={r.name} />
                    </td>
                    <td className="py-1.5 pr-6">
                      <span className="font-mono text-foreground">{r.value}</span>
                      <CopyButton value={r.value} />
                    </td>
                    <td className="py-1.5 pr-4 text-muted-foreground">{r.purpose}</td>
                    <td className="py-1.5">
                      <div className="flex items-center gap-1.5">
                        <RecordBadge status={recordStatus} />
                         {recordStatus === "ok" && <span className="text-[10px] text-emerald-600">Propagated</span>}
                        {recordStatus === "fail" && <span className="text-[10px] text-destructive">Not found</span>}
                        {recordStatus === "checking" && <span className="text-[10px] text-muted-foreground">Checking…</span>}
                        {recordStatus === "idle" && <span className="text-[10px] text-muted-foreground/40">—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-border bg-muted/40 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={12} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">Using Cloudflare? Nameserver migration required.</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Our server IP (<span className="font-mono text-[10px]">{VPS_IP}</span>) is part of Cloudflare's own infrastructure. Cloudflare blocks zones they manage from routing to this IP — <strong>even in DNS-only mode</strong> — triggering Error 1000. No DNS record change fixes this while the domain uses Cloudflare nameservers.
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              User must move nameservers away from Cloudflare: use registrar's default DNS, <a href="https://registro.br" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Registro.br</a> (for .com.br), or Namecheap FreeDNS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Chain Diagnostic ─────────────────────────────────────────────────────────
function StepIcon({ status, icon }: { status: StepStatus; icon: React.ReactNode }) {
  if (status === "running") return <Loader2 size={13} className="animate-spin text-muted-foreground shrink-0" />;
  if (status === "pass") return <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />;
  if (status === "warn") return <AlertTriangle size={13} className="shrink-0 text-yellow-500" />;
  if (status === "fail") return <XCircle size={13} className="shrink-0 text-destructive" />;
  return <span className="shrink-0 text-muted-foreground/40">{icon}</span>;
}

function ChainDiagnostic({ domain, photographerId }: { domain: string; photographerId: string }) {
  const makeSteps = (): DiagStep[] => [
    {
      id: "dns",
      label: "DNS Lookup",
      description: `A record for ${domain} resolves to VPS IP ${VPS_IP}`,
      icon: <Wifi size={13} />,
      status: "idle",
      detail: null,
      fix: null,
    },
    {
      id: "validate",
      label: "Domain Registration",
      description: "validate-domain edge function returns registered: true",
      icon: <ShieldCheck size={13} />,
      status: "idle",
      detail: null,
      fix: null,
    },
    {
      id: "proxy",
      label: "Proxy Connectivity",
      description: `HTTPS request to ${domain} returns a non-404 response`,
      icon: <Link2 size={13} />,
      status: "idle",
      detail: null,
      fix: null,
    },
    {
      id: "react",
      label: "React Domain Detection",
      description: `isCustomDomain("${domain}") returns true in the app`,
      icon: <Code2 size={13} />,
      status: "idle",
      detail: null,
      fix: null,
    },
  ];

  const [steps, setSteps] = useState<DiagStep[]>(makeSteps());
  const [running, setRunning] = useState(false);

  const setStep = (id: string, patch: Partial<DiagStep>) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const run = async () => {
    setSteps(makeSteps());
    setRunning(true);

    // ── Step 1: DNS ──────────────────────────────────────────────────────────
    setStep("dns", { status: "running" });
    try {
      const { data } = await supabase.functions.invoke("check-domain", { body: { domain } });
      const aOk: boolean = data?.dns?.a?.ok ?? false;
      const found: string[] = data?.dns?.a?.found ?? [];
      if (aOk) {
        setStep("dns", { status: "pass", detail: `A record → ${found.join(", ")} ✓` });
      } else {
        setStep("dns", {
          status: "fail",
          detail: found.length ? `Found: ${found.join(", ")} — expected ${VPS_IP}` : "No A record found",
          fix: `Add an A record for ${domain} pointing to ${VPS_IP} at your DNS provider. Allow up to 24 h for propagation.`,
        });
      }
    } catch (e) {
      setStep("dns", { status: "fail", detail: "check-domain function error", fix: "Ensure the check-domain edge function is deployed." });
    }

    // ── Step 2: validate-domain ──────────────────────────────────────────────
    setStep("validate", { status: "running" });
    try {
      const res = await fetch(
        `https://pjcegphrngpedujeatrl.supabase.co/functions/v1/validate-domain?domain=${encodeURIComponent(domain)}`
      );
      const json = await res.json();
      if (json?.registered === true) {
        setStep("validate", { status: "pass", detail: "registered: true — domain is in the database ✓" });
      } else {
        setStep("validate", {
          status: "fail",
          detail: `registered: false (HTTP ${res.status})`,
          fix: `Ensure the custom_domain field in the photographers table matches exactly "${domain}" (no protocol, no trailing slash).`,
        });
      }
    } catch {
      setStep("validate", { status: "fail", detail: "Network error calling validate-domain", fix: "Check edge function deployment." });
    }

    // ── Step 3: Proxy connectivity ───────────────────────────────────────────
    setStep("proxy", { status: "running" });
    try {
      // Use no-cors so browser doesn't block cross-origin; we just need to know if it resolved
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(`https://${domain}`, { signal: controller.signal, redirect: "follow" });
      clearTimeout(timer);
      const status = res.status;
      if (status === 200) {
        setStep("proxy", { status: "pass", detail: `HTTP ${status} — site is reachable ✓` });
      } else if (status === 404) {
        setStep("proxy", {
          status: "fail",
          detail: `HTTP 404 — Lovable CDN returned Not Found`,
          fix: `The Caddy Caddyfile must use "header_up Host davions.com" and davions.com must be an active domain in Lovable project settings → Domains. Currently the CDN does not recognise the forwarded Host header.`,
        });
      } else {
        setStep("proxy", { status: "warn", detail: `HTTP ${status}`, fix: "Unexpected status. Check Caddy logs: sudo journalctl -u caddy -n 50" });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("abort") || msg.includes("timeout")) {
        setStep("proxy", {
          status: "fail",
          detail: "Request timed out after 12 s",
          fix: "The VPS may be down, Caddy may not be running, or the TLS certificate is still being issued. Run: sudo systemctl status caddy",
        });
      } else if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        // Could be CORS block on 200, treat as warn
        setStep("proxy", {
          status: "warn",
          detail: "CORS blocked — browser prevented reading response (this may mean the site IS reachable)",
          fix: "Open https://" + domain + " directly in a new tab to confirm. A CORS block here often means Caddy is proxying correctly.",
        });
      } else {
        setStep("proxy", { status: "fail", detail: msg, fix: "Check Caddy status on the VPS." });
      }
    }

    // ── Step 4: React domain detection ──────────────────────────────────────
    setStep("react", { status: "running" });
    await new Promise((r) => setTimeout(r, 200)); // brief tick for UX
    const detected = isCustomDomain(domain);
    if (detected) {
      setStep("react", { status: "pass", detail: `isCustomDomain("${domain}") → true ✓ — app will render the photographer store` });
    } else {
      setStep("react", {
        status: "fail",
        detail: `isCustomDomain("${domain}") → false — app would render the main platform instead of the store`,
        fix: `Add "${domain}" or its root domain to EXACT_APP_HOSTNAMES in src/lib/custom-domain.ts if it should be a platform domain. If it should be a custom domain, ensure it is NOT listed there.`,
      });
    }

    setRunning(false);
  };

  const allDone = steps.every((s) => s.status !== "idle" && s.status !== "running");
  const failCount = steps.filter((s) => s.status === "fail").length;
  const passCount = steps.filter((s) => s.status === "pass").length;
  const warnCount = steps.filter((s) => s.status === "warn").length;

  return (
    <div className="px-6 py-5 bg-muted/20 border-b border-border space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope size={12} className="text-muted-foreground" />
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">
            Full-Chain Diagnostic — <span className="font-mono normal-case">{domain}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {allDone && (
            <span className="text-[10px] font-light text-muted-foreground">
              {passCount + warnCount === 4
                ? "All checks passed"
                : `${failCount} issue${failCount !== 1 ? "s" : ""} found`}
            </span>
          )}
          <button
            onClick={run}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light disabled:opacity-50 transition-opacity"
          >
            {running ? <Loader2 size={10} className="animate-spin" /> : <Stethoscope size={10} />}
            {running ? "Running…" : "Run Diagnostic"}
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={step.id} className="relative">
            {/* connector line */}
            {i < steps.length - 1 && (
              <div className="absolute left-[6px] top-[22px] w-px h-[calc(100%+8px)] bg-border" />
            )}
            <div className={cn(
              "rounded-md border transition-colors",
              step.status === "pass" && "border-border bg-background",
              step.status === "fail" && "border-destructive/30 bg-destructive/5",
              step.status === "warn" && "border-yellow-500/30 bg-yellow-500/5",
              step.status === "running" && "border-border bg-muted/40",
              step.status === "idle" && "border-border/50 bg-transparent",
            )}>
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5 relative z-10">
                  <StepIcon status={step.status} icon={step.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-light text-foreground">{step.label}</span>
                    {step.status === "pass" && (
                      <span className="text-[9px] tracking-widest uppercase font-light px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-600">Pass</span>
                    )}
                    {step.status === "fail" && (
                      <span className="text-[9px] tracking-widest uppercase font-light px-1.5 py-0.5 rounded-sm bg-destructive/10 text-destructive">Fail</span>
                    )}
                    {step.status === "warn" && (
                      <span className="text-[9px] tracking-widest uppercase font-light px-1.5 py-0.5 rounded-sm bg-yellow-500/10 text-yellow-600">Warn</span>
                    )}
                  </div>
                  <p className="text-[11px] font-light text-muted-foreground mt-0.5">{step.description}</p>
                  {step.detail && (
                    <p className={cn(
                      "text-[11px] font-mono mt-1.5 leading-relaxed",
                      step.status === "pass" ? "text-muted-foreground" : "text-foreground",
                    )}>{step.detail}</p>
                  )}
                  {step.fix && (
                    <div className="mt-2 flex items-start gap-1.5 bg-muted/60 rounded px-3 py-2">
                      <AlertTriangle size={10} className="mt-0.5 shrink-0 text-muted-foreground" />
                      <p className="text-[11px] font-light text-muted-foreground leading-relaxed">{step.fix}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── VPS Certificates tab ─────────────────────────────────────────────────────
type VpsCert = {
  domain: string;
  expiresAt?: string | null;
};

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

function getDaysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ expiresAt, loading }: { expiresAt: string | null | undefined; loading?: boolean }) {
  if (loading) {
    return <Loader2 size={11} className="animate-spin text-muted-foreground" />;
  }
  const days = getDaysUntilExpiry(expiresAt ?? null);
  if (days === null) return <span className="text-[10px] text-muted-foreground/40">—</span>;
  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-medium border border-destructive/20">
        <XCircle size={9} />
        Expirado
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-medium border border-destructive/20">
        <AlertTriangle size={9} />
        {days}d
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 text-[10px] font-medium border border-yellow-500/20">
        <AlertTriangle size={9} />
        {days}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-medium border border-emerald-500/20">
      <CheckCircle2 size={9} />
      {days}d
    </span>
  );
}

const VPS_RENEW_URL = "https://davions.giombelli.com.br/api/renew-cert";

type RenewStatus = "idle" | "loading" | "success" | "error";

function VpsCertsTab({ photographers }: { photographers: Photographer[] }) {
  const [certExpiry, setCertExpiry] = useState<Record<string, string | null>>({});
  const [loadingExpiry, setLoadingExpiry] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<"all" | "expiring" | "expired">("all");
  const [renewStatus, setRenewStatus] = useState<Record<string, RenewStatus>>({});

  const renewCert = useCallback(async (domain: string) => {
    setRenewStatus((prev) => ({ ...prev, [domain]: "loading" }));
    try {
      const res = await fetch(VPS_RENEW_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRenewStatus((prev) => ({ ...prev, [domain]: "success" }));
      // Auto-reset after 4 s and refresh expiry for this domain
      setTimeout(() => {
        setRenewStatus((prev) => ({ ...prev, [domain]: "idle" }));
        setCertExpiry((prev) => { const next = { ...prev }; delete next[domain]; return next; });
        setLoadingExpiry((prev) => ({ ...prev, [domain]: true }));
        const baseUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/check-ssl-cert`;
        fetch(`${baseUrl}?domain=${encodeURIComponent(domain)}`)
          .then((r) => r.json())
          .then((j) => setCertExpiry((prev) => ({ ...prev, [domain]: j.expiresAt ?? null })))
          .catch(() => setCertExpiry((prev) => ({ ...prev, [domain]: null })))
          .finally(() => setLoadingExpiry((prev) => ({ ...prev, [domain]: false })));
      }, 4000);
    } catch (e) {
      console.error("renew-cert error:", e);
      setRenewStatus((prev) => ({ ...prev, [domain]: "error" }));
      setTimeout(() => setRenewStatus((prev) => ({ ...prev, [domain]: "idle" })), 4000);
    }
  }, []);

  const {
    data: certs,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<VpsCert[]>({
    queryKey: ["vps-certs"],
    queryFn: async () => {
      const res = await fetch("https://davions.giombelli.com.br/api/certs");
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const json = await res.json();
      if (!Array.isArray(json)) throw new Error("Unexpected response format");
      return json.map((item: unknown) => {
        if (typeof item === "string") return { domain: item, expiresAt: null };
        if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>;
          const expiry =
            obj.expiresAt ??
            obj.expires_at ??
            obj.not_after ??
            obj.issued_at ??
            null;
          return {
            domain: String(obj.domain ?? obj.name ?? obj.subject ?? "unknown"),
            expiresAt: expiry != null ? String(expiry) : null,
          } as VpsCert;
        }
        return { domain: "unknown", expiresAt: null };
      });
    },
    retry: 1,
  });

  // Secondary lookup: fetch real expiry from crt.sh via edge function for each cert
  useEffect(() => {
    if (!certs || certs.length === 0) return;

    // Only look up domains where expiresAt is null
    const domainsToFetch = certs.filter((c) => !c.expiresAt && c.domain !== "unknown");
    if (domainsToFetch.length === 0) return;

    // Mark all as loading
    setLoadingExpiry((prev) => {
      const next = { ...prev };
      domainsToFetch.forEach((c) => { next[c.domain] = true; });
      return next;
    });

    const baseUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/check-ssl-cert`;

    domainsToFetch.forEach(async (cert) => {
      try {
        const res = await fetch(`${baseUrl}?domain=${encodeURIComponent(cert.domain)}`);
        const json = await res.json();
        setCertExpiry((prev) => ({ ...prev, [cert.domain]: json.expiresAt ?? null }));
      } catch {
        setCertExpiry((prev) => ({ ...prev, [cert.domain]: null }));
      } finally {
        setLoadingExpiry((prev) => ({ ...prev, [cert.domain]: false }));
      }
    });
  }, [certs]);

  // Reset expiry cache when certs are refetched
  const handleRefetch = useCallback(() => {
    setCertExpiry({});
    setLoadingExpiry({});
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="border border-border rounded-md overflow-hidden">
        <div className="p-6 space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border border-destructive/30 rounded-md p-6 flex items-start gap-3">
        <XCircle size={14} className="shrink-0 text-destructive mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="text-xs font-light text-foreground">Falha ao buscar certificados da VPS</p>
          <p className="text-[11px] font-mono text-muted-foreground">
            {error instanceof Error ? error.message : "Erro desconhecido"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground shrink-0"
          onClick={handleRefetch}
          disabled={isFetching}
        >
          <RefreshCw size={11} className={cn(isFetching && "animate-spin")} />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!certs || certs.length === 0) {
    return (
      <div className="border border-border rounded-md p-12 text-center">
        <ShieldAlert size={24} className="mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">Nenhum certificado encontrado na VPS.</p>
      </div>
    );
  }

  // Compute counts for filter pills (based on resolved expiry, skipping still-loading)
  const expiringCount = (certs ?? []).filter((c) => {
    const d = getDaysUntilExpiry(certExpiry[c.domain] !== undefined ? certExpiry[c.domain] : c.expiresAt ?? null);
    return d !== null && d > 0 && d <= 30;
  }).length;
  const expiredCount = (certs ?? []).filter((c) => {
    const d = getDaysUntilExpiry(certExpiry[c.domain] !== undefined ? certExpiry[c.domain] : c.expiresAt ?? null);
    return d !== null && d <= 0;
  }).length;

  const filteredCerts = (certs ?? []).filter((cert) => {
    if (statusFilter === "all") return true;
    const resolvedExpiry = certExpiry[cert.domain] !== undefined ? certExpiry[cert.domain] : cert.expiresAt ?? null;
    const days = getDaysUntilExpiry(resolvedExpiry);
    if (statusFilter === "expiring") return days !== null && days > 0 && days <= 30;
    if (statusFilter === "expired") return days !== null && days <= 0;
    return true;
  });

  return (
    <div className="border border-border rounded-md overflow-hidden">
      {/* Tab header with refresh */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">
          {statusFilter === "all"
            ? `${certs.length} certificado${certs.length !== 1 ? "s" : ""} emitido${certs.length !== 1 ? "s" : ""}`
            : `${filteredCerts.length} de ${certs.length} certificado${certs.length !== 1 ? "s" : ""}`}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground"
          onClick={handleRefetch}
          disabled={isFetching}
        >
          <RefreshCw size={11} className={cn(isFetching && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-background">
        <button
          onClick={() => setStatusFilter("all")}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-light tracking-wide border transition-colors",
            statusFilter === "all"
              ? "bg-foreground text-background border-foreground"
              : "bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground"
          )}
        >
          Todos
          <span className={cn(
            "inline-flex items-center justify-center rounded-full w-4 h-4 text-[9px] font-medium",
            statusFilter === "all" ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
          )}>{certs.length}</span>
        </button>
        <button
          onClick={() => setStatusFilter("expiring")}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-light tracking-wide border transition-colors",
            statusFilter === "expiring"
              ? "bg-yellow-500 text-white border-yellow-500"
              : "bg-yellow-500/10 text-yellow-700 border-yellow-500/30 hover:border-yellow-500/60"
          )}
        >
          <AlertTriangle size={9} />
          Expirando
          <span className={cn(
            "inline-flex items-center justify-center rounded-full w-4 h-4 text-[9px] font-medium",
            statusFilter === "expiring" ? "bg-white/20 text-white" : "bg-yellow-500/20 text-yellow-700"
          )}>{expiringCount}</span>
        </button>
        <button
          onClick={() => setStatusFilter("expired")}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-light tracking-wide border transition-colors",
            statusFilter === "expired"
              ? "bg-destructive text-destructive-foreground border-destructive"
              : "bg-destructive/10 text-destructive border-destructive/30 hover:border-destructive/60"
          )}
        >
          <XCircle size={9} />
          Expirados
          <span className={cn(
            "inline-flex items-center justify-center rounded-full w-4 h-4 text-[9px] font-medium",
            statusFilter === "expired" ? "bg-white/20 text-destructive-foreground" : "bg-destructive/20 text-destructive"
          )}>{expiredCount}</span>
        </button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Domínio</TableHead>
            <TableHead>SSL</TableHead>
            <TableHead>Dias para vencer</TableHead>
            <TableHead>Fotógrafo</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCerts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center">
                <p className="text-xs text-muted-foreground">Nenhum certificado nesta categoria.</p>
              </TableCell>
            </TableRow>
          ) : (
            filteredCerts.map((cert) => {
              const photographer = photographers.find(
                (p) => p.custom_domain?.toLowerCase() === cert.domain.toLowerCase()
              );
              const resolvedExpiry = certExpiry[cert.domain] !== undefined
                ? certExpiry[cert.domain]
                : cert.expiresAt ?? null;
              const isLoadingThisDomain = loadingExpiry[cert.domain] ?? false;
              const days = getDaysUntilExpiry(resolvedExpiry);
              const rStatus = renewStatus[cert.domain] ?? "idle";
              return (
                <TableRow key={cert.domain} className={cn(!isLoadingThisDomain && days !== null && days <= 7 && "bg-destructive/5")}>
                  <TableCell className="py-3">
                    <span className="font-mono text-xs">{cert.domain}</span>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-light tracking-wide border border-emerald-500/20">
                      <CheckCircle2 size={10} />
                      SSL Ativo
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    <ExpiryBadge expiresAt={resolvedExpiry} loading={isLoadingThisDomain} />
                  </TableCell>
                  <TableCell className="py-3">
                    {photographer ? (
                      <div>
                        <p className="text-xs font-light">
                          {photographer.business_name || photographer.full_name || "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{photographer.email}</p>
                      </div>
                    ) : (
                      <span className="text-xs font-light text-destructive">Não cadastrado</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-xs text-muted-foreground">
                    {isLoadingThisDomain ? (
                      <Loader2 size={11} className="animate-spin text-muted-foreground" />
                    ) : resolvedExpiry ? (
                      (() => {
                        try {
                          return format(new Date(resolvedExpiry), "dd/MM/yyyy");
                        } catch {
                          return resolvedExpiry;
                        }
                      })()
                    ) : "—"}
                  </TableCell>
                  <TableCell className="py-3">
                    <button
                      onClick={() => renewCert(cert.domain)}
                      disabled={rStatus === "loading" || rStatus === "success"}
                      title={rStatus === "success" ? "Renovação solicitada" : rStatus === "error" ? "Falha — clique para tentar de novo" : `Renovar SSL para ${cert.domain}`}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-light tracking-wide border transition-colors disabled:cursor-not-allowed",
                        rStatus === "success"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : rStatus === "error"
                          ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                          : "bg-muted text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                      )}
                    >
                      {rStatus === "loading" ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : rStatus === "success" ? (
                        <Check size={10} />
                      ) : rStatus === "error" ? (
                        <XCircle size={10} />
                      ) : (
                        <RefreshCw size={10} />
                      )}
                      {rStatus === "loading" ? "Renovando…" : rStatus === "success" ? "Solicitado" : rStatus === "error" ? "Falhou" : "Renovar"}
                    </button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AdminDomains() {
  const [activeTab, setActiveTab] = useState<"domains" | "certs">("domains");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [diagOpen, setDiagOpen] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, RowStatus>>({});
  const [dnsDetails, setDnsDetails] = useState<Record<string, DnsDetail>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: photographers = [], isLoading } = useQuery({
    queryKey: ["admin-custom-domains"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photographers")
        .select("id, email, full_name, business_name, custom_domain, store_slug, created_at")
        .not("custom_domain", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Photographer[];
    },
  });

  const checkDomain = useCallback(async (domain: string, id: string) => {
    setStatuses((prev) => ({ ...prev, [id]: "checking" }));
    setDnsDetails((prev) => ({ ...prev, [id]: { a: "checking" } }));
    try {
      const { data } = await supabase.functions.invoke("check-domain", {
        body: { domain },
      });
      const aOk: boolean = data?.dns?.a?.ok ?? false;
      setStatuses((prev) => ({
        ...prev,
        [id]: data?.status === "active" ? "active" : "pending",
      }));
      setDnsDetails((prev) => ({
        ...prev,
        [id]: {
          a: aOk ? "ok" : "fail",
          aFound: data?.dns?.a?.found ?? [],
        },
      }));
    } catch {
      setStatuses((prev) => ({ ...prev, [id]: "pending" }));
      setDnsDetails((prev) => ({ ...prev, [id]: { a: "fail" } }));
    }
  }, []);

  const checkAll = useCallback(async () => {
    if (!photographers.length) return;
    setIsRefreshing(true);
    await Promise.all(photographers.map((p) => checkDomain(p.custom_domain, p.id)));
    setIsRefreshing(false);
  }, [photographers, checkDomain]);

  useEffect(() => {
    if (photographers.length > 0) checkAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photographers.length]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
    setDiagOpen(null);
  };

  const toggleDiag = (id: string) => {
    setDiagOpen((prev) => (prev === id ? null : id));
    setExpanded(null);
  };

  const staleThreshold = Date.now() - 24 * 60 * 60 * 1000;

  const stalePendingDomains = useMemo(
    () =>
      photographers.filter(
        (p) =>
          statuses[p.id] === "pending" &&
          new Date(p.created_at).getTime() < staleThreshold
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [photographers, statuses]
  );

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Globe size={16} className="text-muted-foreground" />
          <div>
            <h1 className="text-sm font-light tracking-widest uppercase">Custom Domains</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              All studios that have configured a custom domain
            </p>
          </div>
          <Badge variant="secondary" className="ml-auto text-xs">
            {photographers.length} {photographers.length === 1 ? "domain" : "domains"}
          </Badge>
          {activeTab === "domains" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-muted-foreground"
              onClick={checkAll}
              disabled={isRefreshing || isLoading || photographers.length === 0}
            >
              <RefreshCw size={11} className={cn(isRefreshing && "animate-spin")} />
              Refresh Status
            </Button>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-0 border border-border rounded-md overflow-hidden w-fit mb-6">
          <button
            onClick={() => setActiveTab("domains")}
            className={cn(
              "px-4 py-2 text-xs font-light tracking-widest uppercase transition-colors",
              activeTab === "domains"
                ? "bg-foreground text-background"
                : "bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            Domínios Registrados
          </button>
          <button
            onClick={() => setActiveTab("certs")}
            className={cn(
              "px-4 py-2 text-xs font-light tracking-widest uppercase transition-colors border-l border-border",
              activeTab === "certs"
                ? "bg-foreground text-background"
                : "bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            Certificados VPS
          </button>
        </div>

        {/* Stale-pending alert (only on domains tab) */}
        {activeTab === "domains" && stalePendingDomains.length > 0 && (
          <div className="mb-6 border border-border rounded-md px-4 py-3 flex items-start gap-3">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-xs font-light text-foreground">
                {stalePendingDomains.length === 1
                  ? "1 domain has been pending for over 24 hours"
                  : `${stalePendingDomains.length} domains have been pending for over 24 hours`}
              </p>
              <p className="text-[11px] font-light text-muted-foreground leading-relaxed">
                DNS has propagated but the Caddy server may not have issued the TLS certificate yet, or the{" "}
                <code className="font-mono bg-muted px-1 rounded text-[10px]">:80, :443</code> block conflict is blocking On-Demand TLS.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {stalePendingDomains.map((p) => (
                  <code key={p.id} className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                    {p.custom_domain}
                  </code>
                ))}
              </div>
            </div>
            <a
              href="/admin/vps-setup"
              className="shrink-0 text-[10px] tracking-[0.15em] uppercase font-light text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors whitespace-nowrap"
            >
              Caddy troubleshooting guide →
            </a>
          </div>
        )}

        {/* Domains tab content */}
        {activeTab === "domains" && (
          <div className="border border-border rounded-md overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-muted-foreground">Loading…</div>
            ) : photographers.length === 0 ? (
              <div className="p-12 text-center">
                <Globe size={24} className="mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No custom domains configured yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Studio</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>DNS Records</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Store Slug</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {photographers.map((p) => {
                    const { isSubdomain } = getDomainInfo(p.custom_domain);
                    const studioName = p.business_name || p.full_name || "—";
                    const isOpen = expanded === p.id;
                    const isDiagOpen = diagOpen === p.id;
                    const domainStatus: RowStatus = statuses[p.id] ?? "idle";
                    const dns = dnsDetails[p.id];

                    return (
                      <>
                        <TableRow
                          key={p.id}
                          className={cn("cursor-pointer", (isOpen || isDiagOpen) && "bg-muted/30")}
                          onClick={() => toggleExpand(p.id)}
                        >
                          <TableCell className="py-3 pl-4 pr-0">
                            {isOpen
                              ? <ChevronDown size={12} className="text-muted-foreground" />
                              : <ChevronRight size={12} className="text-muted-foreground" />}
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="text-xs font-light">{studioName}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{p.email}</div>
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="font-mono text-xs">{p.custom_domain}</span>
                          </TableCell>
                          <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                            <StatusBadge
                              status={domainStatus}
                              onCheck={() => checkDomain(p.custom_domain, p.id)}
                            />
                          </TableCell>
                          <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                            <DnsPropagationCell dns={dns} />
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge variant="outline" className="text-[10px] font-light">
                              {isSubdomain ? "Subdomain" : "Root Domain"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="text-xs font-mono text-muted-foreground">
                              {p.store_slug ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-xs text-muted-foreground">
                            {format(new Date(p.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn("h-7 gap-1.5 text-[10px] px-2", isDiagOpen && "bg-muted")}
                                title="Run full-chain diagnostic"
                                onClick={() => toggleDiag(p.id)}
                              >
                                <Stethoscope size={11} />
                                Diagnose
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Copy domain"
                                onClick={() => navigator.clipboard.writeText(p.custom_domain)}
                              >
                                <Copy size={12} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Open domain"
                                onClick={() => window.open(`https://${p.custom_domain}`, "_blank")}
                              >
                                <ExternalLink size={12} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* DNS expansion */}
                        {isOpen && (
                          <tr key={`${p.id}-dns`}>
                            <td colSpan={9} className="p-0">
                              <DnsExpansion domain={p.custom_domain} dns={dns} />
                            </td>
                          </tr>
                        )}

                        {/* Chain diagnostic */}
                        {isDiagOpen && (
                          <tr key={`${p.id}-diag`}>
                            <td colSpan={9} className="p-0">
                              <ChainDiagnostic domain={p.custom_domain} photographerId={p.id} />
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* VPS Certs tab content */}
        {activeTab === "certs" && (
          <VpsCertsTab photographers={photographers} />
        )}
      </div>
    </AdminLayout>
  );
}

