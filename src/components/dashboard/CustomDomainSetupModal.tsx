import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Globe, Copy, Check, ExternalLink, AlertTriangle, Shield,
  Clock, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, X,
  BookOpen, ChevronDown, ChevronRight, Info, Loader2,
} from "lucide-react";

const VPS_IP = import.meta.env.VITE_VPS_IP || "147.93.112.182";

// ── Utilities ─────────────────────────────────────────────────────────────────
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0" title="Copy">
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full transition-all duration-300 ${
            i < current ? "bg-foreground" : i === current ? "bg-foreground ring-2 ring-offset-2 ring-offset-background ring-foreground" : "bg-border"
          }`} />
          {i < total - 1 && <div className={`h-px w-6 transition-colors ${i < current ? "bg-foreground" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );
}

// ── Registrar detection ───────────────────────────────────────────────────────
interface RegistrarInfo {
  name: string;
  dnsGuideUrl: string;
  steps: string[];
  note?: string;
}

const REGISTRAR_MAP: Record<string, RegistrarInfo> = {
  "domaincontrol.com": {
    name: "GoDaddy",
    dnsGuideUrl: "https://www.godaddy.com/help/add-an-a-record-19238",
    steps: [
      "Go to godaddy.com → My Products → Domains",
      "Click the domain → DNS → Add New Record",
      "Type: A · Name: @ · Value: <IP> · TTL: 1 Hour → Save",
      "Repeat for Name: www (root domains only)",
    ],
    note: "GoDaddy changes can take 10–30 minutes.",
  },
  "registrar-servers.com": {
    name: "Namecheap",
    dnsGuideUrl: "https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/",
    steps: [
      "Log in → Domain List → Manage → Advanced DNS",
      "Click Add New Record → A Record",
      "Host: @ · Value: <IP> · TTL: Automatic → Save",
      "Repeat for Host: www (root domains only)",
    ],
    note: "Namecheap propagates in 30 minutes on average.",
  },
  "cloudflare.com": {
    name: "Cloudflare",
    dnsGuideUrl: "https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/",
    steps: [
      "Log in to dash.cloudflare.com → Select your domain",
      "Go to DNS → Records → Add record",
      "Type: A · Name: @ · IPv4: <IP> · Proxy: OFF (grey cloud) → Save",
      "Repeat for Name: www (root domains only)",
    ],
    note: "⚠️ Set proxy to DNS only (grey cloud) — orange cloud breaks SSL.",
  },
  "squarespace.com": {
    name: "Squarespace Domains",
    dnsGuideUrl: "https://support.squarespace.com/hc/en-us/articles/205812348",
    steps: [
      "Log in → Settings → Domains → Edit Domain → DNS Settings",
      "Click Add Record → A Record",
      "Host: @ · Data: <IP> → Save",
      "Repeat for Host: www (root domains only)",
    ],
  },
  "google.com": {
    name: "Google Domains",
    dnsGuideUrl: "https://support.google.com/domains/answer/3290350",
    steps: [
      "Go to domains.squarespace.com → Manage → DNS",
      "Under Custom Records → Add record",
      "Type: A · Host name: @ · Data: <IP> → Save",
      "Repeat for Host name: www (root domains only)",
    ],
  },
  "porkbun.com": {
    name: "Porkbun",
    dnsGuideUrl: "https://kb.porkbun.com/article/54-how-to-add-or-manage-dns-records",
    steps: [
      "Log in → Domain Management → select your domain",
      "Click DNS → Add Record",
      "Type: A · Host: (blank/@) · Answer: <IP> · TTL: 600 → Save",
      "Repeat for Host: www (root domains only)",
    ],
  },
};

function detectRegistrar(nsRecords: string[]): RegistrarInfo | null {
  const nsStr = nsRecords.join(" ").toLowerCase();
  for (const [key, info] of Object.entries(REGISTRAR_MAP)) {
    if (nsStr.includes(key)) return info;
  }
  return null;
}

async function fetchNsRecords(domain: string): Promise<string[]> {
  try {
    const parts = domain.split(".");
    const compoundTlds = ["com.br","net.br","org.br","co.uk","com.au","co.nz","com.ar","com.mx","com.co"];
    const lastTwo = parts.slice(-2).join(".");
    const rootCount = compoundTlds.includes(lastTwo) ? 3 : 2;
    const root = parts.slice(-rootCount).join(".");
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(root)}&type=NS`,
      { headers: { Accept: "application/dns-json" }, signal: AbortSignal.timeout(6000) }
    );
    const json = await res.json();
    if (!json.Answer) return [];
    return (json.Answer as { type: number; data: string }[])
      .filter((r) => r.type === 2)
      .map((r) => r.data.toLowerCase().replace(/\.$/, ""));
  } catch {
    return [];
  }
}

function RegistrarGuide({ domain, vpsIp }: { domain: string; vpsIp: string }) {
  const [nsRecords, setNsRecords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!domain) return;
    fetchNsRecords(domain).then((ns) => { setNsRecords(ns); setLoading(false); });
  }, [domain]);

  const registrar = detectRegistrar(nsRecords);

  return (
    <div className="border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] tracking-[0.2em] uppercase font-light">
            {loading ? "Detecting registrar…" : registrar ? `Step-by-step: ${registrar.name}` : "Step-by-step DNS guide"}
          </span>
          {!loading && registrar && (
            <span className="text-[9px] tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5">
              Auto-detected
            </span>
          )}
        </div>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-4">
              {loading ? (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Looking up your DNS provider…
                </div>
              ) : registrar ? (
                <>
                  {nsRecords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {nsRecords.map((ns) => (
                        <span key={ns} className="text-[10px] font-mono bg-muted px-2 py-0.5 border border-border text-muted-foreground">{ns}</span>
                      ))}
                    </div>
                  )}
                  <ol className="flex flex-col gap-2.5">
                    {registrar.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="shrink-0 w-5 h-5 flex items-center justify-center border border-border text-[10px] font-medium text-muted-foreground mt-0.5">{i + 1}</span>
                        <span className="text-[11px] text-muted-foreground leading-relaxed font-mono">{step.replace("<IP>", vpsIp)}</span>
                      </li>
                    ))}
                  </ol>
                  {registrar.note && (
                    <div className="flex items-start gap-2 p-2.5 bg-muted/30 border border-border">
                      <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-[10px] text-muted-foreground">{registrar.note}</p>
                    </div>
                  )}
                  <a href={registrar.dnsGuideUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-fit">
                    <ExternalLink className="h-3 w-3" />
                    Open {registrar.name} DNS guide
                  </a>
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  <ol className="flex flex-col gap-2.5">
                    {[
                      "Log in to your domain registrar's dashboard",
                      `Find the DNS settings for ${domain}`,
                      `Add an A record: Name @ → Value ${vpsIp}`,
                      `If it's a root domain, also add: Name www → Value ${vpsIp}`,
                      "Remove any conflicting A or CNAME records for the same host",
                      "Save and wait up to 48 hours for propagation",
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="shrink-0 w-5 h-5 flex items-center justify-center border border-border text-[10px] font-medium text-muted-foreground mt-0.5">{i + 1}</span>
                        <span className="text-[11px] text-muted-foreground leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {Object.values(REGISTRAR_MAP).map((r) => (
                      <a key={r.name} href={r.dnsGuideUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors border border-border px-2.5 py-2 hover:border-foreground/30">
                        <ExternalLink className="h-2.5 w-2.5 shrink-0" />{r.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Step 1 ────────────────────────────────────────────────────────────────────
function Step1({ domain, setDomain, onNext, saving }: {
  domain: string; setDomain: (v: string) => void; onNext: () => void; saving: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

  const handleNext = () => {
    const v = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
    if (!v) { setError("Please enter your domain name."); return; }
    if (!DOMAIN_REGEX.test(v)) { setError("Enter a valid domain (e.g. booking.yourstudio.com)."); return; }
    setError(null);
    onNext();
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-base font-light tracking-wide">Enter your domain</h3>
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Type the domain or subdomain you want to connect to your store. For example:{" "}
          <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">booking.yourstudio.com</span>
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center border border-input bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring">
          <span className="pl-3 pr-2 h-10 flex items-center text-xs text-muted-foreground select-none">
            <Globe className="h-3.5 w-3.5" />
          </span>
          <input
            value={domain}
            onChange={(e) => { setDomain(e.target.value.toLowerCase().replace(/\s/g, "").replace(/^https?:\/\//, "")); setError(null); }}
            placeholder="booking.yourstudio.com"
            className="flex-1 h-10 pr-3 text-sm font-mono font-light bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
            onKeyDown={(e) => e.key === "Enter" && handleNext()}
            autoFocus
          />
        </div>
        {error && <p className="flex items-center gap-1 text-[11px] text-destructive"><AlertCircle className="h-3 w-3" />{error}</p>}
      </div>

      <div className="flex items-start gap-2.5 p-3.5 border border-border bg-muted/20">
        <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          If you want both <span className="font-mono text-[10px]">yourdomain.com</span> and <span className="font-mono text-[10px]">www.yourdomain.com</span>, run the wizard twice — once for each.
        </p>
      </div>

      <div className="flex justify-end pt-1">
        <Button onClick={handleNext} disabled={saving} size="sm" className="gap-2 text-xs tracking-wider uppercase font-light">
          {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</> : <>Next <ArrowRight className="h-3.5 w-3.5" /></>}
        </Button>
      </div>
    </div>
  );
}

// ── Step 2 ────────────────────────────────────────────────────────────────────
function Step2({ domain, onBack, onNext }: { domain: string; onBack: () => void; onNext: () => void }) {
  const parts = domain.split(".");
  const lastTwo = parts.slice(-2).join(".");
  const compoundTlds = ["com.br","net.br","org.br","edu.br","gov.br","co.uk","com.au","co.nz","com.ar","com.mx","com.co"];
  const isSubdomain = parts.length > (compoundTlds.includes(lastTwo) ? 3 : 2);
  const subName = isSubdomain ? parts[0] : null;
  const dnsRecords = isSubdomain
    ? [{ type: "A", name: subName!, value: VPS_IP, purpose: "Routes traffic to your store" }]
    : [
        { type: "A", name: "@",   value: VPS_IP, purpose: "Routes root domain" },
        { type: "A", name: "www", value: VPS_IP, purpose: "Routes www subdomain" },
      ];

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-base font-light tracking-wide">Add DNS records</h3>
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Log in to your registrar and add the{dnsRecords.length > 1 ? " two" : ""} record{dnsRecords.length > 1 ? "s" : ""} below for{" "}
          <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">{domain}</span>.
          {isSubdomain ? " Subdomain — one A record only." : " Root domain — add both @ and www."}
        </p>
      </div>

      <div className="border border-border overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 font-light text-muted-foreground tracking-wide">Type</th>
              <th className="text-left px-4 py-3 font-light text-muted-foreground tracking-wide">Name</th>
              <th className="text-left px-4 py-3 font-light text-muted-foreground tracking-wide">Value</th>
              <th className="px-2 py-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {dnsRecords.map((r, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-4 py-3"><span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">{r.type}</span></td>
                <td className="px-4 py-3 font-mono text-foreground">{r.name}</td>
                <td className="px-4 py-3 font-mono text-foreground break-all">{r.value}</td>
                <td className="px-2 py-3"><CopyButton value={r.value} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RegistrarGuide domain={domain} vpsIp={VPS_IP} />

      <div className="flex items-start gap-2.5 p-3.5 border border-border bg-muted/20">
        <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Remove any conflicting A or CNAME records for the same name. Conflicts are the most common cause of failure.
        </p>
      </div>

      <div className="flex items-start gap-2.5 p-3.5 border border-yellow-500/30 bg-yellow-500/5">
        <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <p className="text-[12px] font-medium text-foreground">Using Cloudflare? Move your nameservers.</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Our IP belongs to Cloudflare's network — Cloudflare blocks all zones it manages from routing to this IP (Error 1000). Move nameservers to your registrar's DNS or Namecheap FreeDNS.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button onClick={onBack} variant="ghost" size="sm" className="gap-2 text-xs tracking-wider uppercase font-light">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <Button onClick={onNext} size="sm" className="gap-2 text-xs tracking-wider uppercase font-light">
          Next <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Step 3 ────────────────────────────────────────────────────────────────────
function Step3({ domain, onBack, onNext }: { domain: string; onBack: () => void; onNext: () => void }) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-base font-light tracking-wide">Wait for propagation</h3>
        <p className="text-[12px] text-muted-foreground leading-relaxed">DNS changes take time. Here's what to expect.</p>
      </div>

      <div className="space-y-px">
        {[
          { icon: Clock, title: "DNS propagation", desc: "After adding DNS records, changes can take minutes to 48 hours to propagate worldwide." },
          { icon: Shield, title: "Automatic SSL", desc: "Once ownership is verified, an SSL certificate is provisioned automatically — no manual steps." },
          { icon: CheckCircle2, title: "Going live", desc: `When ready, your store will be accessible at ${domain}. You'll see the status update in Website Settings.` },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-3 p-4 border border-border bg-card">
            <item.icon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
            <div className="space-y-0.5">
              <p className="text-[12px] font-light">{item.title}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3.5 border border-border bg-card space-y-2">
        <p className="text-[12px] font-light">Verify DNS with a free tool</p>
        <a href="https://dnschecker.org" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-fit">
          <ExternalLink className="h-3 w-3" />Open DNSChecker.org
        </a>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button onClick={onBack} variant="ghost" size="sm" className="gap-2 text-xs tracking-wider uppercase font-light">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <Button onClick={onNext} size="sm" className="gap-2 text-xs tracking-wider uppercase font-light">
          Next <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Step 4 ────────────────────────────────────────────────────────────────────
function Step4({ domain, onBack, onFinish }: { domain: string; onBack: () => void; onFinish: () => void }) {
  const [copied, setCopied] = useState(false);
  const fullUrl = `https://${domain}`;
  const copy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-base font-light tracking-wide">All set</h3>
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Your domain has been saved. Once DNS propagates and SSL is provisioned, your store will be live.
        </p>
      </div>

      <div className="flex items-center gap-3 p-4 border border-border bg-card">
        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-mono font-light flex-1 truncate">{fullUrl}</span>
        <button onClick={copy} className="p-1 text-muted-foreground hover:text-foreground transition-colors" title="Copy">
          {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-muted-foreground hover:text-foreground transition-colors">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="flex flex-col gap-0">
        <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground pb-2">Troubleshooting</p>
        {[
          `Confirm A record(s) point to ${VPS_IP}.`,
          "Remove conflicting A or CNAME records with the same name.",
          "Use DNSChecker.org to inspect current DNS values worldwide.",
          "If you have CAA records, allow letsencrypt.org as a CA.",
          "DNS changes can take up to 72 hours in rare cases — wait and retry.",
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3 border border-border border-b-0 last:border-b bg-card">
            <span className="font-mono text-[11px] text-muted-foreground/50 shrink-0 mt-0.5">{i + 1}.</span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{item}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button onClick={onBack} variant="ghost" size="sm" className="gap-2 text-xs tracking-wider uppercase font-light">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <Button onClick={onFinish} size="sm" className="gap-2 text-xs tracking-wider uppercase font-light">
          <CheckCircle2 className="h-3.5 w-3.5" /> Done
        </Button>
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface CustomDomainSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill with the current domain if editing */
  initialDomain?: string;
  onSaved?: (domain: string) => void;
}

export function CustomDomainSetupModal({ open, onOpenChange, initialDomain = "", onSaved }: CustomDomainSetupModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [domain, setDomain] = useState(initialDomain);
  const [saving, setSaving] = useState(false);

  // Reset when re-opened
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setStep(0);
      setDomain(initialDomain);
    }
    onOpenChange(v);
  };

  /** Converts a domain to a reverse-DNS package name.
   * booking.mystudio.com  →  com.mystudio.photo
   * mystudio.com.br       →  com.br.mystudio.photo
   */
  const buildPackageName = (d: string): string => {
    const COMPOUND_TLDS = ["com.br","net.br","org.br","edu.br","gov.br","co.uk","com.au","co.nz","com.ar","com.mx","com.co"];
    const parts = d.toLowerCase().split(".");
    const lastTwo = parts.slice(-2).join(".");
    const rootCount = COMPOUND_TLDS.includes(lastTwo) ? 3 : 2;
    const rootParts = parts.slice(-rootCount);
    if (rootCount === 3) {
      // Compound TLD: e.g. ["mystudio","com","br"] → "com.br.mystudio.photo"
      const tld = rootParts.slice(1).join(".");
      const sld = rootParts[0];
      return `${tld}.${sld}.photo`;
    }
    // Simple: e.g. ["mystudio","com"] → "com.mystudio.photo"
    const tld = rootParts[1];
    const sld = rootParts[0];
    return `${tld}.${sld}.photo`;
  };

  const saveDomain = async () => {
    if (!user || !domain) return;
    setSaving(true);
    const trimmed = domain.trim();
    const packageName = buildPackageName(trimmed);
    const { error } = await supabase.from("photographers").update({
      custom_domain: trimmed || null,
      package_name: trimmed ? packageName : null,
    } as any).eq("id", user.id);
    if (error) {
      toast({ title: "Failed to save domain", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    toast({ title: "Domain saved" });
    onSaved?.(trimmed);
    setSaving(false);
  };

  const handleStep1Next = async () => {
    await saveDomain();
    setStep(1);
  };

  const TOTAL = 4;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl w-full max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-5 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[10px] tracking-[0.35em] uppercase text-muted-foreground">
              <Globe className="h-3 w-3" />
              <span>Custom Domain Setup</span>
              <span className="text-border">/</span>
              <span>Step {step + 1} of {TOTAL}</span>
            </div>
            <DialogTitle className="text-lg font-light tracking-wide">
              {step === 0 && "Connect your domain"}
              {step === 1 && "Add DNS records"}
              {step === 2 && "Wait for propagation"}
              {step === 3 && "Setup complete"}
            </DialogTitle>
            <StepDots current={step} total={TOTAL} />
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <Step1 domain={domain} setDomain={setDomain} onNext={handleStep1Next} saving={saving} />
              )}
              {step === 1 && (
                <Step2 domain={domain} onBack={() => setStep(0)} onNext={() => setStep(2)} />
              )}
              {step === 2 && (
                <Step3 domain={domain} onBack={() => setStep(1)} onNext={() => setStep(3)} />
              )}
              {step === 3 && (
                <Step4 domain={domain} onBack={() => setStep(2)} onFinish={() => handleOpenChange(false)} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
