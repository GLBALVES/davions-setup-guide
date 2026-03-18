import { useState } from "react";
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
import { Globe, Copy, ExternalLink, ChevronDown, ChevronRight, Check, AlertTriangle } from "lucide-react";
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

function getDomainInfo(domain: string) {
  const parts = domain.split(".");
  const remainingAfterFirst = parts.slice(1);
  const isSubdomain = remainingAfterFirst.length >= 2;
  const subName = isSubdomain ? parts[0] : null;

  const verifyValue = `davions_verify=${domain.replace(/\./g, "-")}`;

  const dnsRecords = isSubdomain
    ? [
        { type: "A",   name: subName!,   value: "185.158.133.1",  purpose: "Routes traffic" },
        { type: "TXT", name: `_davions.${subName!}`, value: verifyValue, purpose: "Ownership verification" },
      ]
    : [
        { type: "A",   name: "@",        value: "185.158.133.1",  purpose: "Routes root domain" },
        { type: "A",   name: "www",      value: "185.158.133.1",  purpose: "Routes www" },
        { type: "TXT", name: "_davions", value: verifyValue,       purpose: "Ownership verification" },
      ];

  return { isSubdomain, dnsRecords, verifyValue };
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-1.5 text-muted-foreground hover:text-foreground transition-colors"
      title="Copy"
    >
      {copied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
    </button>
  );
}

function DnsExpansion({ domain }: { domain: string }) {
  const { dnsRecords, isSubdomain } = getDomainInfo(domain);
  return (
    <div className="px-6 py-4 bg-muted/30 border-b border-border">
      <p className="text-xs text-muted-foreground mb-3 font-light">
        DNS records required for <span className="font-mono text-foreground">{domain}</span>
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left font-medium text-muted-foreground py-1.5 pr-6 w-14">Type</th>
              <th className="text-left font-medium text-muted-foreground py-1.5 pr-6">Name</th>
              <th className="text-left font-medium text-muted-foreground py-1.5 pr-6">Value</th>
              <th className="text-left font-medium text-muted-foreground py-1.5">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {dnsRecords.map((r, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="py-1.5 pr-6">
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
                <td className="py-1.5 text-muted-foreground">{r.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isSubdomain && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle size={12} className="mt-0.5 shrink-0 text-destructive" />
          If using Cloudflare, set DNS proxy to <strong className="font-medium">DNS only</strong> (grey cloud) for the A records.
        </p>
      )}
    </div>
  );
}

export default function AdminDomains() {
  const [expanded, setExpanded] = useState<string | null>(null);

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
                          <td colSpan={7} className="p-0">
                            <DnsExpansion domain={p.custom_domain} />
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
