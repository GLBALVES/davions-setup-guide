import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Globe, Copy, Check, ExternalLink, AlertTriangle, Shield,
  Clock, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle,
} from "lucide-react";

// ── DNS records ──────────────────────────────────────────────────────────────
const DNS_RECORDS = [
  { type: "A",   name: "@",       value: "185.158.133.1",         purpose: "Root domain" },
  { type: "A",   name: "www",     value: "185.158.133.1",         purpose: "WWW subdomain" },
  { type: "TXT", name: "_lovable", value: "lovable_verify=<provided>", purpose: "Domain security verification" },
];

// ── Step progress indicator ───────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full transition-colors ${
              i < current
                ? "bg-foreground"
                : i === current
                ? "bg-foreground ring-2 ring-offset-2 ring-offset-background ring-foreground"
                : "bg-border"
            }`}
          />
          {i < total - 1 && (
            <div className={`h-px w-6 transition-colors ${i < current ? "bg-foreground" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ── Step 1: Enter domain ──────────────────────────────────────────────────────
function Step1({
  domain,
  setDomain,
  onNext,
  saving,
}: {
  domain: string;
  setDomain: (v: string) => void;
  onNext: () => void;
  saving: boolean;
}) {
  const [error, setError] = useState<string | null>(null);

  const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

  const validate = () => {
    const v = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
    if (!v) return "Please enter your domain name.";
    if (!DOMAIN_REGEX.test(v)) return "Enter a valid domain (e.g. booking.yourstudio.com).";
    return null;
  };

  const handleNext = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[11px] tracking-[0.4em] uppercase text-muted-foreground">Step 1 of 4</p>
        <h2 className="text-lg font-light tracking-wide">Enter your domain</h2>
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Type the domain or subdomain you want to point at your store. For example:{" "}
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
            onChange={(e) => {
              setDomain(e.target.value.toLowerCase().replace(/\s/g, "").replace(/^https?:\/\//, ""));
              setError(null);
            }}
            placeholder="booking.yourstudio.com"
            className="flex-1 h-10 pr-3 text-sm font-mono font-light bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
            onKeyDown={(e) => e.key === "Enter" && handleNext()}
          />
        </div>
        {error && (
          <p className="flex items-center gap-1 text-[11px] text-destructive">
            <AlertCircle className="h-3 w-3" />{error}
          </p>
        )}
      </div>

      <div className="flex items-start gap-2.5 p-4 border border-border bg-muted/20">
        <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          If you want both <span className="font-mono text-[11px]">yourdomain.com</span> and <span className="font-mono text-[11px]">www.yourdomain.com</span> to work, you'll need to add both as separate entries. Complete this wizard for each one.
        </p>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleNext} disabled={saving} size="sm" className="gap-2 text-xs tracking-wider uppercase font-light">
          Next <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Step 2: Add DNS records ───────────────────────────────────────────────────
function Step2({
  domain,
  onBack,
  onNext,
}: {
  domain: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const parts = domain.split(".");
  const lastTwo = parts.slice(-2).join(".");
  const compoundTlds = ["com.br","net.br","org.br","edu.br","gov.br","co.uk","com.au","co.nz","com.ar","com.mx","com.co"];
  const rootPartsCount = compoundTlds.includes(lastTwo) ? 3 : 2;
  const isSubdomain = parts.length > rootPartsCount;
  const subName = isSubdomain ? parts[0] : null;
  const dnsRecords = isSubdomain
    ? [
        { type: "A",   name: subName!,   value: "185.158.133.1",          purpose: "Subdomain" },
        { type: "TXT", name: "_lovable", value: `lovable_verify=${domain.replace(/\./g, "_")}`, purpose: "Domain security verification" },
      ]
    : [
        { type: "A",   name: "@",        value: "185.158.133.1",          purpose: "Root domain" },
        { type: "A",   name: "www",      value: "185.158.133.1",          purpose: "WWW subdomain" },
        { type: "TXT", name: "_lovable", value: `lovable_verify=${domain.replace(/\./g, "_")}`, purpose: "Domain security verification" },
      ];
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[11px] tracking-[0.4em] uppercase text-muted-foreground">Step 2 of 4</p>
        <h2 className="text-lg font-light tracking-wide">Add DNS records</h2>
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add the following records exactly as shown for{" "}
          <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">{domain}</span>.
          {isSubdomain
            ? " Since this is a subdomain, only one A record pointing to the subdomain name is needed."
            : " Since this is a root domain, you need both @ and www A records."}
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
                <td className="px-4 py-3">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px] text-foreground">{r.type}</span>
                </td>
                <td className="px-4 py-3 font-mono text-foreground">{r.name}</td>
                <td className="px-4 py-3 font-mono text-foreground break-all">{r.value}</td>
                <td className="px-2 py-3">
                  <CopyButton value={r.value} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-2.5 p-4 border border-border bg-muted/20">
        <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Remove any conflicting A records or CNAME records for the same name before adding these. Conflicting records are the most common cause of verification failure.
        </p>
      </div>

      <div className="flex items-start gap-2.5 p-4 border border-yellow-500/30 bg-yellow-500/5">
        <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Using Cloudflare?</span> Set the A record's Proxy Status to <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">DNS only</span> (grey cloud), not <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">Proxied</span> (orange cloud). Enabling the Cloudflare proxy causes <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">Error 1000</span> and will prevent your domain from resolving correctly.
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 border border-border bg-card">
        <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-[12px] font-light">Automatic SSL provisioning</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Once domain ownership is verified, an SSL certificate is issued automatically. No manual installation is needed.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
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

// ── Step 3: Wait for propagation ──────────────────────────────────────────────
function Step3({ domain, onBack, onNext }: { domain: string; onBack: () => void; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[11px] tracking-[0.4em] uppercase text-muted-foreground">Step 3 of 4</p>
        <h2 className="text-lg font-light tracking-wide">Wait for propagation</h2>
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          DNS changes take time to propagate across the internet. Here's what to expect.
        </p>
      </div>

      <div className="space-y-px">
        {[
          {
            icon: Clock,
            color: "text-muted-foreground",
            title: "DNS propagation",
            desc: "After you add the DNS records, changes can take between a few minutes and 48 hours to propagate worldwide. No action is needed during this time.",
          },
          {
            icon: Shield,
            color: "text-muted-foreground",
            title: "Automatic SSL",
            desc: "Once ownership is verified, an SSL certificate is provisioned automatically. Your domain will serve over HTTPS without any manual steps.",
          },
          {
            icon: CheckCircle2,
            color: "text-muted-foreground",
            title: "Going live",
            desc: "When everything is ready, your store will be accessible at your custom domain. You'll see the status update in Website Settings → Custom Domain.",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex items-start gap-3 p-4 border border-border bg-card">
              <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${item.color}`} />
              <div className="space-y-0.5">
                <p className="text-[12px] font-light">{item.title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border border-border bg-card space-y-3 text-[12px] text-muted-foreground leading-relaxed">
        <p className="font-light text-foreground text-[12px]">Verify your DNS with a free tool</p>
        <p>Use DNSChecker.org to see the current values propagated worldwide before contacting support.</p>
        <a
          href="https://dnschecker.org"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ExternalLink className="h-3 w-3" />
          Open DNSChecker.org
        </a>
      </div>

      <div className="flex items-center justify-between pt-2">
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

// ── Step 4: Done ──────────────────────────────────────────────────────────────
function Step4({ domain, onBack, onFinish }: { domain: string; onBack: () => void; onFinish: () => void }) {
  const [copied, setCopied] = useState(false);
  const fullUrl = `https://${domain}`;

  const copy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[11px] tracking-[0.4em] uppercase text-muted-foreground">Step 4 of 4</p>
        <h2 className="text-lg font-light tracking-wide">All set</h2>
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Your domain has been saved. Once DNS propagates and SSL is provisioned, your store will be live at the address below.
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

      <div className="space-y-px">
        <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground pb-2">Troubleshooting</p>
        {[
          "Confirm both A records (@ and www) point to 185.158.133.1.",
          "Check for conflicting A records or CNAME records with the same name and remove them.",
          "Use DNSChecker.org to inspect current DNS values worldwide.",
          "If you have CAA records, add letsencrypt.org as an allowed certificate authority.",
          "DNS changes can take up to 72 hours in rare cases — wait and retry.",
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3 border border-border bg-card">
            <span className="font-mono text-[11px] text-muted-foreground/50 shrink-0 mt-0.5">{i + 1}.</span>
            <p className="text-[12px] text-muted-foreground leading-relaxed">{item}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
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

// ── Main page ─────────────────────────────────────────────────────────────────
const CustomDomainDocs = () => {
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);

  const saveDomain = async () => {
    if (!user || !domain) return;
    setSaving(true);
    const { error } = await supabase.from("photographers").update({
      custom_domain: domain.trim() || null,
    } as any).eq("id", user.id);
    if (error) {
      toast({ title: "Failed to save domain", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Domain saved" });
      // Fire-and-forget: notify team about new domain
      const { data: profile } = await supabase
        .from("photographers")
        .select("full_name, business_name, email")
        .eq("id", user.id)
        .single();
      supabase.functions.invoke("notify-domain-saved", {
        body: {
          domain: domain.trim(),
          photographerName: (profile as any)?.business_name || (profile as any)?.full_name || "",
          photographerEmail: (profile as any)?.email || user.email || "",
        },
      });
    }
    setSaving(false);
  };

  const handleStep1Next = async () => {
    await saveDomain();
    setStep(1);
  };

  const TOTAL = 4;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col min-h-0">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-12">

              {/* Header */}
              <div className="space-y-4 mb-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] tracking-[0.35em] uppercase text-muted-foreground">
                    <Globe className="h-3.5 w-3.5" />
                    <span>Settings</span>
                    <span className="text-border">/</span>
                    <span>Custom Domain</span>
                  </div>
                  <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                    Step {step + 1} of {TOTAL}
                  </span>
                </div>
                <h1 className="text-2xl font-light tracking-wide">Custom Domain Setup</h1>
                <StepDots current={step} total={TOTAL} />
              </div>

              {/* Steps */}
              <div className="border border-border bg-card p-6 sm:p-8">
                {step === 0 && (
                  <Step1
                    domain={domain}
                    setDomain={setDomain}
                    onNext={handleStep1Next}
                    saving={saving}
                  />
                )}
                {step === 1 && (
                  <Step2
                    domain={domain}
                    onBack={() => setStep(0)}
                    onNext={() => setStep(2)}
                  />
                )}
                {step === 2 && (
                  <Step3
                    domain={domain}
                    onBack={() => setStep(1)}
                    onNext={() => setStep(3)}
                  />
                )}
                {step === 3 && (
                  <Step4
                    domain={domain}
                    onBack={() => setStep(2)}
                    onFinish={() => navigate("/dashboard/website")}
                  />
                )}
              </div>

            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CustomDomainDocs;
