import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Globe,
  ShieldCheck,
  Wifi,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const VPS_IP = import.meta.env.VITE_VPS_IP || "147.93.112.182";

type CheckStatus = "idle" | "checking" | "ok" | "error" | "warning";

interface DnsResult {
  ok: boolean;
  found: string[];
  expected: string;
}

interface DomainCheckResult {
  status: "active" | "pending";
  dns: { a: DnsResult };
  ssl?: { ok: boolean; issuer?: string; expires?: string };
}

interface StatusCheck {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  status: CheckStatus;
  detail?: string;
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "checking") {
    return <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />;
  }
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-destructive" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <Clock className="h-4 w-4 text-muted-foreground/40" />;
}

function StatusBadge({ status }: { status: CheckStatus }) {
  const map: Record<CheckStatus, { label: string; className: string }> = {
    idle: { label: "Waiting", className: "bg-muted text-muted-foreground" },
    checking: { label: "Checking…", className: "bg-muted text-muted-foreground animate-pulse" },
    ok: { label: "OK", className: "bg-primary/10 text-primary border border-primary/20" },
    error: { label: "Failed", className: "bg-destructive/10 text-destructive border border-destructive/20" },
    warning: { label: "Warning", className: "bg-secondary/40 text-secondary-foreground border border-secondary/40" },
  };
  const { label, className } = map[status];
  return (
    <span className={`text-[10px] tracking-wider uppercase font-medium px-2 py-0.5 rounded-sm ${className}`}>
      {label}
    </span>
  );
}

function OverallStatusBar({ checks }: { checks: StatusCheck[] }) {
  const allOk = checks.every((c) => c.status === "ok");
  const anyError = checks.some((c) => c.status === "error");
  const anyChecking = checks.some((c) => c.status === "checking");
  const allIdle = checks.every((c) => c.status === "idle");

  if (allIdle) return null;
  if (anyChecking) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 border border-border bg-muted/20">
        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
        <span className="text-[11px] text-muted-foreground">Running checks…</span>
      </div>
    );
  }
  if (allOk) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 border border-primary/20 bg-primary/5">
        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
        <span className="text-[11px] text-primary">
          Domain is fully active — DNS propagated, SSL valid, and routing correctly.
        </span>
      </div>
    );
  }
  if (anyError) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 border border-destructive/20 bg-destructive/5">
        <XCircle className="h-4 w-4 text-destructive shrink-0" />
        <span className="text-[11px] text-destructive">
          One or more checks failed. Review the details below and update your DNS records.
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 border border-muted bg-muted/20">
      <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-[11px] text-muted-foreground">
        Some checks returned warnings. DNS may still be propagating.
      </span>
    </div>
  );
}

export default function DomainStatus() {
  const { user } = useAuth();
  const [domain, setDomain] = useState<string | null>(null);
  const [loadingDomain, setLoadingDomain] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [checks, setChecks] = useState<StatusCheck[]>([
    {
      id: "dns",
      label: "DNS Propagation",
      description: "A record points to the correct VPS IP",
      icon: Wifi,
      status: "idle",
    },
    {
      id: "ssl",
      label: "SSL Certificate",
      description: "HTTPS certificate is valid and active",
      icon: ShieldCheck,
      status: "idle",
    },
    {
      id: "routing",
      label: "Domain Routing",
      description: "Domain resolves and Caddy routes it correctly",
      icon: Globe,
      status: "idle",
    },
  ]);

  // Load photographer's custom domain
  useEffect(() => {
    if (!user) return;
    supabase
      .from("photographers")
      .select("custom_domain")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setDomain(data?.custom_domain ?? null);
        setLoadingDomain(false);
      });
  }, [user]);

  const setCheckStatus = (id: string, status: CheckStatus, detail?: string) => {
    setChecks((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status, detail } : c))
    );
  };

  const runChecks = useCallback(async () => {
    if (!domain) return;

    // Reset all to checking
    setChecks((prev) => prev.map((c) => ({ ...c, status: "checking", detail: undefined })));

    try {
      // 1. DNS check via check-domain edge function
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-domain`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ domain }),
        }
      );

      if (!response.ok) throw new Error("check-domain failed");

      const result: DomainCheckResult = await response.json();
      const aOk = result.dns?.a?.ok;
      const foundIPs = result.dns?.a?.found ?? [];

      setCheckStatus(
        "dns",
        aOk ? "ok" : "error",
        aOk
          ? `A record → ${VPS_IP}`
          : foundIPs.length > 0
          ? `Found: ${foundIPs.join(", ")} — expected ${VPS_IP}`
          : `No A record found — expected ${VPS_IP}`
      );

      // 2. SSL check — attempt HTTPS fetch with a no-cors probe
      try {
        const sslRes = await fetch(`https://${domain}`, {
          method: "HEAD",
          signal: AbortSignal.timeout(7000),
          mode: "no-cors",
        });
        // no-cors returns opaque response (type "opaque") — that means connection was established
        setCheckStatus("ssl", "ok", "HTTPS connection established successfully");
      } catch (sslErr: unknown) {
        const msg = sslErr instanceof Error ? sslErr.message : "";
        if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
          // Could be CORS block on a live site — treat as warning not error if DNS is ok
          setCheckStatus(
            "ssl",
            aOk ? "warning" : "error",
            aOk
              ? "SSL may still be provisioning — wait a few minutes after DNS propagates"
              : "Cannot verify SSL until DNS points to the VPS"
          );
        } else {
          setCheckStatus("ssl", "warning", "SSL check inconclusive — browser CORS policy may block the probe");
        }
      }

      // 3. Routing check — validate-domain endpoint
      try {
        const valRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-domain?domain=${encodeURIComponent(domain)}`,
          { signal: AbortSignal.timeout(6000) }
        );
        setCheckStatus(
          "routing",
          valRes.ok ? "ok" : "error",
          valRes.ok
            ? "Domain is registered and Caddy will route it"
            : `Not registered in the system (HTTP ${valRes.status})`
        );
      } catch {
        setCheckStatus("routing", "error", "Could not reach the routing validation endpoint");
      }

      setLastChecked(new Date());
    } catch (err) {
      console.error("Domain check error:", err);
      setChecks((prev) =>
        prev.map((c) => ({ ...c, status: "error", detail: "Check failed — please try again" }))
      );
    }
  }, [domain]);

  // Auto-run once domain is loaded
  useEffect(() => {
    if (domain) runChecks();
  }, [domain, runChecks]);

  const handleCopy = () => {
    if (!domain) return;
    navigator.clipboard.writeText(`https://${domain}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loadingDomain) {
    return (
      <div className="p-8 flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="p-8 max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-lg font-light tracking-wider uppercase">Domain Status</h1>
          <p className="text-[11px] text-muted-foreground mt-1">Real-time status of your custom domain</p>
        </div>
        <div className="flex flex-col items-center gap-3 py-16 border border-dashed border-border">
          <Globe className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No custom domain configured</p>
          <p className="text-[11px] text-muted-foreground/60 text-center max-w-xs">
            Go to <span className="font-mono">Website Settings</span> to add your custom domain and see its status here.
          </p>
          <a href="/dashboard/website" className="mt-2 text-[11px] underline underline-offset-4 text-muted-foreground hover:text-foreground transition-colors">
            Open Website Settings →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-light tracking-wider uppercase">Domain Status</h1>
          <p className="text-[11px] text-muted-foreground mt-1">Real-time monitoring of your custom domain</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={runChecks}
          disabled={checks.some((c) => c.status === "checking")}
          className="text-xs gap-2 shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${checks.some((c) => c.status === "checking") ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Domain pill */}
      <div className="flex items-center gap-3 px-4 py-3 border border-border bg-muted/10">
        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="font-mono text-sm flex-1 truncate">{domain}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent>Copy URL</TooltipContent>
        </Tooltip>
        <a
          href={`https://${domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Overall status bar */}
      <OverallStatusBar checks={checks} />

      {/* Individual checks */}
      <div className="flex flex-col border border-border divide-y divide-border">
        {checks.map((check, i) => (
          <motion.div
            key={check.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.25 }}
            className="flex items-start gap-4 px-4 py-4"
          >
            <div className="mt-0.5 shrink-0">
              <StatusIcon status={check.status} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12px] font-medium tracking-wide">{check.label}</span>
                <StatusBadge status={check.status} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{check.description}</p>
              {check.detail && (
                <p className={`text-[11px] mt-1 font-mono ${
                  check.status === "error" ? "text-destructive" :
                  check.status === "warning" ? "text-muted-foreground" :
                  check.status === "ok" ? "text-primary" :
                  "text-muted-foreground"
                }`}>
                  {check.detail}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* DNS Records reference */}
      <div className="flex flex-col gap-3">
        <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Expected DNS Records</p>
        <div className="border border-border overflow-hidden">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-2 font-light text-muted-foreground">Type</th>
                <th className="text-left px-3 py-2 font-light text-muted-foreground">Name</th>
                <th className="text-left px-3 py-2 font-light text-muted-foreground">Value</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const parts = domain.split(".");
                const lastTwo = parts.slice(-2).join(".");
                const compoundTlds = ["com.br","net.br","org.br","edu.br","gov.br","co.uk","com.au","co.nz","com.ar","com.mx","com.co"];
                const rootPartsCount = compoundTlds.includes(lastTwo) ? 3 : 2;
                const isSubdomain = parts.length > rootPartsCount;
                const subName = isSubdomain ? parts[0] : null;
                const rows = isSubdomain
                  ? [{ name: subName!, value: VPS_IP }]
                  : [{ name: "@", value: VPS_IP }, { name: "www", value: VPS_IP }];
                return rows.map((r) => (
                  <tr key={r.name} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-mono text-muted-foreground">A</td>
                    <td className="px-3 py-2 font-mono">{r.name}</td>
                    <td className="px-3 py-2 font-mono">{r.value}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer info */}
      <div className="flex items-start gap-2 px-3 py-3 border border-border bg-muted/5">
        <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          SSL is provisioned automatically by Caddy when the first HTTPS request reaches the VPS after DNS propagation. DNS changes can take up to 48 hours to propagate globally.
          {lastChecked && (
            <span className="block mt-1 text-muted-foreground/50">
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
