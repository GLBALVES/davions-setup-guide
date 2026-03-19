import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Clock,
  Loader2,
  Minus,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
        { type: "A", name: subName!, value: import.meta.env.VITE_VPS_IP || "147.93.112.182", purpose: "Routes traffic to your store" },
      ]
    : [
        { type: "A", name: "@",   value: import.meta.env.VITE_VPS_IP || "147.93.112.182", purpose: "Routes root domain" },
        { type: "A", name: "www", value: import.meta.env.VITE_VPS_IP || "147.93.112.182", purpose: "Routes www subdomain" },
      ];

  return { isSubdomain, dnsRecords, rootDomain };
}

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
  if (status === "ok") return <CheckCircle2 size={11} style={{ color: "hsl(142 71% 45%)" }} />;
  return <XCircle size={11} style={{ color: "hsl(0 72% 51%)" }} />;
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
        <CheckCircle2 size={11} className="shrink-0" style={{ color: "hsl(142 71% 45%)" }} />
        <span className="text-xs font-light" style={{ color: "hsl(142 71% 40%)" }}>Active</span>
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="flex items-center gap-1.5">
        <Clock size={11} className="shrink-0" style={{ color: "hsl(38 92% 50%)" }} />
        <span className="text-xs font-light" style={{ color: "hsl(38 80% 40%)" }}>Pending</span>
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

      {/* DNS records table */}
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
                        {recordStatus === "ok" && <span className="text-[10px]" style={{ color: "hsl(142 71% 40%)" }}>Propagated</span>}
                        {recordStatus === "fail" && <span className="text-[10px]" style={{ color: "hsl(0 72% 51%)" }}>Not found</span>}
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

      {/* Cloudflare note */}
      <div className="border border-yellow-500/30 bg-yellow-500/5 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={12} className="mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">Using Cloudflare? Nameserver migration required.</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Our server IP (<span className="font-mono text-[10px]">{import.meta.env.VITE_VPS_IP || "147.93.112.182"}</span>) is part of Cloudflare's own infrastructure. Cloudflare blocks zones they manage from routing to this IP — <strong>even in DNS-only mode</strong> — triggering Error 1000. No DNS record change fixes this while the domain uses Cloudflare nameservers.
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

export default function AdminDomains() {
  const [expanded, setExpanded] = useState<string | null>(null);
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

  // Auto-refresh pending domains every 30s, stop when all become active
  const [pendingCountdown, setPendingCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const pendingPhotographers = photographers.filter(
      (p) => statuses[p.id] === "pending"
    );
    if (pendingPhotographers.length === 0) {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setPendingCountdown(0);
      return;
    }

    // Kick off a 30s countdown that re-checks pending domains on expiry
    let seconds = 30;
    setPendingCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);

    countdownRef.current = setInterval(() => {
      seconds -= 1;
      setPendingCountdown(seconds);
      if (seconds <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        pendingPhotographers.forEach((p) => checkDomain(p.custom_domain, p.id));
      }
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(Object.entries(statuses).filter(([, v]) => v === "pending").map(([k]) => k))]);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => (prev === id ? null : id));

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
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
          {pendingCountdown > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock size={11} className="shrink-0" />
              <span>Rechecking pending in {pendingCountdown}s</span>
            </div>
          )}
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
        </div>

        {/* Table */}
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
                  const domainStatus: RowStatus = statuses[p.id] ?? "idle";
                  const dns = dnsDetails[p.id];

                  return (
                    <>
                      <TableRow
                        key={p.id}
                        className={cn("cursor-pointer", isOpen && "bg-muted/30")}
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
                      {isOpen && (
                        <tr key={`${p.id}-dns`}>
                          <td colSpan={9} className="p-0">
                            <DnsExpansion domain={p.custom_domain} dns={dns} />
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
      </div>
    </AdminLayout>
  );
}
