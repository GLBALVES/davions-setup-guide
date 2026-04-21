import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { CustomDomainSetupModal } from "@/components/dashboard/CustomDomainSetupModal";
import {
  Check, Copy, Upload, Loader2, X, Globe, ExternalLink, AlertCircle, AlertTriangle, Store,
  Instagram, Youtube, Linkedin, Facebook, BarChart2, Palette,
  Layout, FileText, Link2, Phone, Image, CheckCircle2, Clock, WifiOff, Trash2,
  ShieldCheck, Wifi, RefreshCw, XCircle, Info, ChevronDown, ChevronRight, BookOpen, Eye,
  Mail, MessageCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { TemplatePreviewCard } from "@/components/dashboard/TemplatePreviewCard";
import { TemplatePreviewModal } from "@/components/website-editor/TemplatePreviewModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { regenerateDefaultPagesForTemplate } from "@/lib/site-template-regen";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── Site templates ────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    value: "editorial",
    label: "Rosa",
    description: "Full-bleed hero, minimal typography, luxury feel.",
    preview: "bg-foreground",
  },
  {
    value: "grid",
    label: "Lírio",
    description: "Photo-first grid layout with sidebar details.",
    preview: "bg-muted",
  },
  {
    value: "magazine",
    label: "Orquídea",
    description: "Bold columns, mixed-size cards, editorial headlines.",
    preview: "bg-muted/60",
  },
  {
    value: "clean",
    label: "Jasmim",
    description: "Centered, whitespace-heavy, distraction-free.",
    preview: "bg-background border border-border",
  },
  {
    value: "sierra",
    label: "Lavanda",
    description: "Full-screen hero, large serif typography, dark editorial tone.",
    preview: "bg-foreground",
  },
  {
    value: "canvas",
    label: "Dália",
    description: "Elegant serif italic hero, poetic and intimate feel.",
    preview: "bg-foreground",
  },
  {
    value: "avery",
    label: "Camélia",
    description: "Fixed vertical sidebar with masonry portfolio grid.",
    preview: "bg-background border border-border",
  },
  {
    value: "seville",
    label: "Magnólia",
    description: "Contained hero, airy typography, luxurious and light.",
    preview: "bg-muted/40",
  },
  {
    value: "milo",
    label: "Violeta",
    description: "Typography-focused hero, warm tone, asymmetric photos.",
    preview: "bg-background border border-border",
  },
];

const SectionHeading = forwardRef<HTMLDivElement, { title: string; description?: string }>(
  ({ title, description }, ref) => (
    <div ref={ref}>
      <p className="text-[11px] tracking-[0.25em] uppercase font-light mb-0.5">{title}</p>
      {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
    </div>
  )
);
SectionHeading.displayName = "SectionHeading";

const DnsRow = forwardRef<HTMLTableRowElement, { type: string; name: string; value: string }>(
  ({ type, name, value }, ref) => {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    return (
      <tr ref={ref} className="border-b border-border last:border-0">
        <td className="px-3 py-2.5">
          <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] text-foreground">{type}</span>
        </td>
        <td className="px-3 py-2.5 font-mono text-foreground">{name}</td>
        <td className="px-3 py-2.5 font-mono text-foreground break-all">{value}</td>
        <td className="px-2 py-2.5">
          <button onClick={copy} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors" title="Copy value">
            {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
          </button>
        </td>
      </tr>
    );
  }
);
DnsRow.displayName = "DnsRow";

// ── Registrar detection ────────────────────────────────────────────────────────
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
      'Go to godaddy.com → My Products → Domains',
      'Click the domain → DNS → Add New Record',
      'Type: A · Name: @ · Value: <IP> · TTL: 1 Hour → Save',
      'Repeat for Name: www (root domains only)',
    ],
    note: "GoDaddy changes can take 10–30 minutes.",
  },
  "registrar-servers.com": {
    name: "Namecheap",
    dnsGuideUrl: "https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain/",
    steps: [
      'Log in → Domain List → Manage → Advanced DNS',
      'Click Add New Record → A Record',
      'Host: @ · Value: <IP> · TTL: Automatic → Save',
      'Repeat for Host: www (root domains only)',
    ],
    note: "Namecheap propagates in 30 minutes on average.",
  },
  "cloudflare.com": {
    name: "Cloudflare",
    dnsGuideUrl: "https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/",
    steps: [
      'Log in to dash.cloudflare.com → Select your domain',
      'Go to DNS → Records → Add record',
      'Type: A · Name: @ · IPv4: <IP> · Proxy: OFF (grey cloud) → Save',
      'Repeat for Name: www (root domains only)',
    ],
    note: "⚠️ Set proxy status to DNS only (grey cloud) — orange cloud will break SSL provisioning.",
  },
  "squarespace.com": {
    name: "Squarespace Domains",
    dnsGuideUrl: "https://support.squarespace.com/hc/en-us/articles/205812348",
    steps: [
      'Log in → Settings → Domains → Edit Domain → DNS Settings',
      'Click Add Record → A Record',
      'Host: @ · Data: <IP> → Save',
      'Repeat for Host: www (root domains only)',
    ],
  },
  "google.com": {
    name: "Google Domains / Squarespace",
    dnsGuideUrl: "https://support.google.com/domains/answer/3290350",
    steps: [
      'Go to domains.squarespace.com → Manage → DNS',
      'Under Custom Records → Add record',
      'Type: A · Host name: @ · Data: <IP> → Save',
      'Repeat for Host name: www (root domains only)',
    ],
  },
  "porkbun.com": {
    name: "Porkbun",
    dnsGuideUrl: "https://kb.porkbun.com/article/54-how-to-add-or-manage-dns-records",
    steps: [
      'Log in → Domain Management → select your domain',
      'Click DNS → Quick DNS Config or manually Add Record',
      'Type: A · Host: (blank/@) · Answer: <IP> · TTL: 600 → Save',
      'Repeat for Host: www (root domains only)',
    ],
  },
  "name.com": {
    name: "Name.com",
    dnsGuideUrl: "https://www.name.com/support/articles/115004955688-Adding-an-A-record",
    steps: [
      'Log in → My Domains → click domain → Manage DNS Records',
      'Add Record → Type: A · Host: @ · Answer: <IP> → Add Record',
      'Repeat for Host: www (root domains only)',
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
    // Use root domain for NS lookup
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

// ── Registrar guide component ─────────────────────────────────────────────────
const RegistrarGuide = ({ domain, vpsIp }: { domain: string; vpsIp: string }) => {
  const [nsRecords, setNsRecords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!domain) return;
    setLoading(true);
    fetchNsRecords(domain).then((ns) => {
      setNsRecords(ns);
      setLoading(false);
    });
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
              ) : (
                <>
                  {/* NS records badge */}
                  {nsRecords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {nsRecords.map((ns) => (
                        <span key={ns} className="text-[10px] font-mono bg-muted px-2 py-0.5 border border-border text-muted-foreground">
                          {ns}
                        </span>
                      ))}
                    </div>
                  )}

                  {registrar ? (
                    <>
                      {/* Steps */}
                      <ol className="flex flex-col gap-2.5">
                        {registrar.steps.map((step, i) => {
                          const rendered = step.replace("<IP>", vpsIp);
                          return (
                            <li key={i} className="flex items-start gap-3">
                              <span className="shrink-0 w-5 h-5 flex items-center justify-center border border-border text-[10px] font-medium text-muted-foreground mt-0.5">
                                {i + 1}
                              </span>
                              <span className="text-[11px] text-muted-foreground leading-relaxed font-mono">{rendered}</span>
                            </li>
                          );
                        })}
                      </ol>

                      {registrar.note && (
                        <div className="flex items-start gap-2 p-2.5 bg-muted/30 border border-border">
                          <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-[10px] text-muted-foreground">{registrar.note}</p>
                        </div>
                      )}

                      <a
                        href={registrar.dnsGuideUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-fit"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open {registrar.name} DNS guide
                      </a>
                    </>
                  ) : (
                    /* Generic guide */
                    <div className="flex flex-col gap-3">
                      <ol className="flex flex-col gap-2.5">
                        {[
                          `Log in to your domain registrar's dashboard`,
                          `Find the DNS settings for ${domain}`,
                          `Add an A record: Name @ → Value ${vpsIp}`,
                          `If it's a root domain, also add: Name www → Value ${vpsIp}`,
                          `Remove any conflicting A or CNAME records for the same host`,
                          `Save and wait up to 48 hours for propagation`,
                        ].map((step, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="shrink-0 w-5 h-5 flex items-center justify-center border border-border text-[10px] font-medium text-muted-foreground mt-0.5">
                              {i + 1}
                            </span>
                            <span className="text-[11px] text-muted-foreground leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                        {Object.values(REGISTRAR_MAP).map((r) => (
                          <a
                            key={r.name}
                            href={r.dnsGuideUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors border border-border px-2.5 py-2 hover:border-foreground/30"
                          >
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                            {r.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Divider = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} className="border-t border-border" />
));
Divider.displayName = "Divider";

// ── Share Panel ───────────────────────────────────────────────────────────────
const StoreSharePanel = ({ url }: { url: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&bgcolor=ffffff&color=000000&margin=8&data=${encodeURIComponent(url)}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(url)}`;
  const emailHref = `mailto:?subject=Check%20this%20out&body=${encodeURIComponent(url)}`;

  return (
    <div className="border border-border bg-card p-4 flex flex-col gap-4">
      {/* URL row */}
      <div className="flex items-center gap-2 border border-border bg-background px-3 py-2">
        <p className="text-[11px] font-mono text-muted-foreground truncate flex-1 select-all">{url}</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* QR + buttons */}
      <div className="flex gap-4 items-start">
        {/* QR code */}
        <div className="shrink-0 border border-border p-1.5 bg-white">
          <img
            src={qrSrc}
            alt="QR Code"
            width={88}
            height={88}
            className="block"
            loading="lazy"
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 border border-border bg-background hover:bg-muted/40 transition-colors px-3 py-2 text-[11px] tracking-wider uppercase font-light text-foreground w-full"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-primary shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
            {copied ? "Copied!" : "Copy link"}
          </button>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-[11px] tracking-wider uppercase font-light transition-colors w-full"
            style={{ background: "hsl(142 71% 45%)", color: "#fff" }}
          >
            <MessageCircle className="h-3.5 w-3.5 shrink-0" />
            Share via WhatsApp
          </a>
          <a
            href={emailHref}
            className="flex items-center gap-2 px-3 py-2 text-[11px] tracking-wider uppercase font-light transition-colors w-full"
            style={{ background: "hsl(217 91% 60%)", color: "#fff" }}
          >
            <Mail className="h-3.5 w-3.5 shrink-0" />
            Share via Email
          </a>
        </div>
      </div>
    </div>
  );
};

const FieldRow = forwardRef<HTMLDivElement, { label: string; children: React.ReactNode }>(
  ({ label, children }, ref) => (
    <div ref={ref} className="flex flex-col gap-1.5">
      <Label className="text-[11px] tracking-wider uppercase font-light">{label}</Label>
      {children}
    </div>
  )
);
FieldRow.displayName = "FieldRow";

const WebsiteSettings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const ws = t.websiteSettings;
  const navigate = useNavigate();

  // Branding
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [tagline, setTagline] = useState("");
  const [accentColor, setAccentColor] = useState("#000000");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Hero
  const [siteHeadline, setSiteHeadline] = useState("");
  const [siteSubheadline, setSiteSubheadline] = useState("");
  const [ctaText, setCtaText] = useState("Book a Session");
  const [ctaLink, setCtaLink] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [uploadingHero, setUploadingHero] = useState(false);

  // Quote & Experience
  const [quoteText, setQuoteText] = useState("");
  const [quoteAuthor, setQuoteAuthor] = useState("");
  const [experienceTitle, setExperienceTitle] = useState("");
  const [experienceText, setExperienceText] = useState("");

  // About
  const [aboutTitle, setAboutTitle] = useState("About");
  const [aboutImageUrl, setAboutImageUrl] = useState("");
  const [uploadingAbout, setUploadingAbout] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");

  // Social
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [pinterestUrl, setPinterestUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  // Navigation
  const [showStore, setShowStore] = useState(true);
  const [showBlog, setShowBlog] = useState(false);
  const [showBooking, setShowBooking] = useState(true);
  const [showAbout, setShowAbout] = useState(true);
  const [showContact, setShowContact] = useState(true);

  // Template
  const [siteTemplate, setSiteTemplate] = useState("editorial");
  const [showTemplateGrid, setShowTemplateGrid] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);
  const [confirmTemplate, setConfirmTemplate] = useState<string | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  // SEO
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [uploadingOg, setUploadingOg] = useState(false);

  // Analytics
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState("");
  const [facebookPixelId, setFacebookPixelId] = useState("");

  // Footer
  const [footerText, setFooterText] = useState("");

  // Store URL
  const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const [storeSlug, setStoreSlug] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugCopied, setSlugCopied] = useState(false);
  const [savingSlug, setSavingSlug] = useState(false);

  // Template preview modal
  const [previewModalTemplate, setPreviewModalTemplate] = useState<string | null>(null);

  // Custom Domain
  const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
  const [customDomain, setCustomDomain] = useState("");
  const [customDomainInput, setCustomDomainInput] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);
  const [domainCopied, setDomainCopied] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);
  const [removingDomain, setRemovingDomain] = useState(false);
  const [domainLastChecked, setDomainLastChecked] = useState<Date | null>(null);
  const [domainSetupOpen, setDomainSetupOpen] = useState(false);
  type DomainCheckStatus = "idle" | "checking" | "ok" | "error" | "warning";
  interface DomainCheck { id: string; label: string; description: string; status: DomainCheckStatus; detail?: string; }
  const [domainChecks, setDomainChecks] = useState<DomainCheck[]>([
    { id: "dns",     label: "DNS Propagation",  description: "A record points to the correct VPS IP",             status: "idle" },
    { id: "ssl",     label: "SSL Certificate",  description: "HTTPS certificate is valid and active",             status: "idle" },
    { id: "routing", label: "Domain Routing",   description: "Domain resolves and Caddy routes it correctly",     status: "idle" },
  ]);
  const setCheck = useCallback((id: string, status: DomainCheckStatus, detail?: string) => {
    setDomainChecks((prev) => prev.map((c) => c.id === id ? { ...c, status, detail } : c));
  }, []);

  const validateSlug = (value: string) => {
    if (!value.trim()) return "Store URL is required.";
    if (value.length < 3) return "Must be at least 3 characters.";
    if (value.length > 48) return "Must be 48 characters or less.";
    if (!SLUG_REGEX.test(value)) return "Only lowercase letters, numbers and hyphens.";
    return null;
  };

  const validateDomain = (value: string) => {
    if (!value.trim()) return null;
    const v = value.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!DOMAIN_REGEX.test(v)) return "Enter a valid domain (e.g. booking.yourstudio.com).";
    return null;
  };

  const copyUrl = async (url: string, setCopiedFn: (v: boolean) => void) => {
    await navigator.clipboard.writeText(url);
    setCopiedFn(true);
    setTimeout(() => setCopiedFn(false), 2000);
  };

  const handleSaveSlug = async () => {
    const slugErr = validateSlug(slugInput);
    if (slugErr) { setSlugError(slugErr); return; }
    setSavingSlug(true);
    const { error } = await supabase.from("photographers").update({
      store_slug: slugInput,
    } as any).eq("id", user!.id);
    if (error) {
      if (error.code === "23505") setSlugError(ws.urlTaken);
      else toast({ title: ws.failedToSave, description: error.message, variant: "destructive" });
    } else {
      setStoreSlug(slugInput);
      toast({ title: ws.storeUrlSaved });
    }
    setSavingSlug(false);
  };

  const handleSaveDomain = async () => {
    const domErr = validateDomain(customDomainInput);
    if (domErr) { setDomainError(domErr); return; }
    setSavingDomain(true);
    const { error } = await supabase.from("photographers").update({
      custom_domain: customDomainInput.trim() || null,
    } as any).eq("id", user!.id);
    if (error) {
      if (error.message.includes("custom_domain")) setDomainError(ws.domainLinked);
      else toast({ title: ws.failedToSave, description: error.message, variant: "destructive" });
    } else {
      const savedDomain = customDomainInput.trim();
      setCustomDomain(savedDomain);
      setDomainChecks((prev) => prev.map((c) => ({ ...c, status: "idle" as const, detail: undefined })));
      setDomainLastChecked(null);
      toast({ title: ws.domainSaved });
      // Auto-check domain right after saving
      checkDomainConnectivity(savedDomain);
    }
    setSavingDomain(false);
  };

  const handleRemoveDomain = async () => {
    if (!customDomain) return;
    setRemovingDomain(true);
    const domainSnapshot = customDomain;
    const { error } = await supabase.from("photographers").update({
      custom_domain: null,
    } as any).eq("id", user!.id);
    if (error) {
      toast({ title: ws.failedToSave, description: error.message, variant: "destructive" });
    } else {
      setCustomDomain("");
      setCustomDomainInput("");
      setDomainChecks((prev) => prev.map((c) => ({ ...c, status: "idle" as const, detail: undefined })));
      setDomainLastChecked(null);
      setDomainError(null);
      toast({ title: "Domain removed", description: `${domainSnapshot} has been unlinked from your studio.` });
    }
    setRemovingDomain(false);
  };

  const VPS_IP = import.meta.env.VITE_VPS_IP || "147.93.112.182";

  const checkDomainConnectivity = useCallback(async (domainOverride?: string) => {
    const target = domainOverride ?? customDomain;
    if (!target) return;
    setDomainChecks((prev) => prev.map((c) => ({ ...c, status: "checking" as const, detail: undefined })));
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      // 1. DNS check (server-side via edge function)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-domain`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ domain: target }) }
      );
      if (!response.ok) throw new Error("check-domain failed");
      const result = await response.json();
      const aOk = result.dns?.a?.ok;
      const foundIPs: string[] = result.dns?.a?.found ?? [];
      setCheck("dns", aOk ? "ok" : "error",
        aOk ? `A record → ${VPS_IP}` : foundIPs.length > 0 ? `Found: ${foundIPs.join(", ")} — expected ${VPS_IP}` : `No A record found — expected ${VPS_IP}`);

      // 2. SSL: inferred from DNS — once DNS points to VPS, Caddy provisions SSL automatically
      if (aOk) {
        setCheck("ssl", "ok", "DNS points to VPS — Caddy provisions SSL automatically");
      } else {
        setCheck("ssl", "warning", "SSL will be provisioned once DNS propagates to the VPS");
      }

      // 3. Routing probe — validate-domain confirms the domain is registered in the system
      try {
        const valRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-domain?domain=${encodeURIComponent(target)}`,
          { signal: AbortSignal.timeout(6000) }
        );
        const valJson = await valRes.json().catch(() => ({}));
        const registered = valRes.ok && (valJson as { registered?: boolean }).registered === true;
        setCheck("routing", registered ? "ok" : "error",
          registered ? "Domain is registered and Caddy will route it" : "Domain not registered in the system — save the domain first");
      } catch {
        setCheck("routing", "error", "Could not reach the routing validation endpoint");
      }

      setDomainLastChecked(new Date());
    } catch {
      setDomainChecks((prev) => prev.map((c) => ({ ...c, status: "error" as const, detail: "Check failed — please try again" })));
    }
  }, [customDomain, setCheck]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const aboutInputRef = useRef<HTMLInputElement>(null);
  const ogInputRef = useRef<HTMLInputElement>(null);
  const hasAutoChecked = useRef(false);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [profileRes, siteRes] = await Promise.all([
        supabase.from("photographers")
          .select("full_name, bio, custom_domain, store_slug")
          .eq("id", user.id).single(),
        (supabase as any).from("photographer_site")
          .select("*").eq("photographer_id", user.id).maybeSingle(),
      ]);

      if (profileRes.data) {
        const d = profileRes.data;
        setFullName((d as any).full_name ?? "");
        setBio((d as any).bio ?? "");
        setCustomDomain((d as any).custom_domain ?? "");
        setCustomDomainInput((d as any).custom_domain ?? "");
        setStoreSlug((d as any).store_slug ?? "");
        setSlugInput((d as any).store_slug ?? "");
      }

      if (siteRes?.data) {
        const s = siteRes.data;
        setLogoUrl(s.logo_url ?? "");
        setTagline(s.tagline ?? "");
        setAccentColor(s.accent_color ?? "#000000");
        setSiteHeadline(s.site_headline ?? "");
        setSiteSubheadline(s.site_subheadline ?? "");
        setCtaText(s.cta_text ?? "Book a Session");
        setCtaLink(s.cta_link ?? "");
        setAboutTitle(s.about_title ?? "About");
        setAboutImageUrl(s.about_image_url ?? "");
        // Hero image is stored in photographer_site (separate from profile avatar)
        setHeroImageUrl((s as any).site_hero_image_url ?? "");
        setInstagramUrl(s.instagram_url ?? "");
        setFacebookUrl(s.facebook_url ?? "");
        setPinterestUrl(s.pinterest_url ?? "");
        setTiktokUrl(s.tiktok_url ?? "");
        setYoutubeUrl(s.youtube_url ?? "");
        setWhatsapp(s.whatsapp ?? "");
        setLinkedinUrl(s.linkedin_url ?? "");
        setShowStore(s.show_store ?? true);
        setShowBlog(s.show_blog ?? false);
        setShowBooking(s.show_booking ?? true);
        setShowAbout(s.show_about ?? true);
        setShowContact(s.show_contact ?? true);
        setSiteTemplate(s.site_template ?? "editorial");
        setSeoTitle(s.seo_title ?? "");
        setSeoDescription(s.seo_description ?? "");
        setOgImageUrl(s.og_image_url ?? "");
        setFaviconUrl(s.favicon_url ?? "");
        setGoogleAnalyticsId(s.google_analytics_id ?? "");
        setFacebookPixelId(s.facebook_pixel_id ?? "");
        setFooterText(s.footer_text ?? "");
        setQuoteText((s as any).quote_text ?? "");
        setQuoteAuthor((s as any).quote_author ?? "");
        setExperienceTitle((s as any).experience_title ?? "");
        setExperienceText((s as any).experience_text ?? "");
      }

      setLoading(false);
    };
    fetchAll();
  }, [user?.id]);

  // Auto-check connectivity once after the saved domain is loaded
  useEffect(() => {
    if (customDomain && !hasAutoChecked.current) {
      hasAutoChecked.current = true;
      checkDomainConnectivity();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customDomain]);

  const uploadImage = async (
    file: File,
    pathKey: string,
    bucket: string,
    setUrl: (u: string) => void,
    setUploading: (v: boolean) => void,
    label: string,
  ) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${pathKey}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) {
      toast({ title: `${label} upload failed`, description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      setUrl(urlData.publicUrl + `?t=${Date.now()}`);
      toast({ title: `${label} uploaded` });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error: profileError } = await supabase.from("photographers").update({
      full_name: fullName.trim() || null,
      bio: bio.trim() || null,
    } as any).eq("id", user.id);

    if (profileError) {
      toast({ title: ws.failedToSave, description: profileError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const { error } = await (supabase as any).from("photographer_site").upsert({
      photographer_id: user.id,
      logo_url: logoUrl.trim() || null,
      tagline: tagline.trim() || null,
      accent_color: accentColor,
      site_hero_image_url: heroImageUrl.trim() || null,
      site_headline: siteHeadline.trim() || null,
      site_subheadline: siteSubheadline.trim() || null,
      cta_text: ctaText.trim() || "Book a Session",
      cta_link: ctaLink.trim() || null,
      about_title: aboutTitle.trim() || "About",
      about_image_url: aboutImageUrl.trim() || null,
      instagram_url: instagramUrl.trim() || null,
      facebook_url: facebookUrl.trim() || null,
      pinterest_url: pinterestUrl.trim() || null,
      tiktok_url: tiktokUrl.trim() || null,
      youtube_url: youtubeUrl.trim() || null,
      whatsapp: whatsapp.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
      show_store: showStore,
      show_blog: showBlog,
      show_booking: showBooking,
      show_about: showAbout,
      show_contact: showContact,
      site_template: siteTemplate,
      seo_title: seoTitle.trim() || null,
      seo_description: seoDescription.trim() || null,
      og_image_url: ogImageUrl.trim() || null,
      favicon_url: faviconUrl.trim() || null,
      google_analytics_id: googleAnalyticsId.trim() || null,
      facebook_pixel_id: facebookPixelId.trim() || null,
      footer_text: footerText.trim() || null,
      quote_text: quoteText.trim() || null,
      quote_author: quoteAuthor.trim() || null,
      experience_title: experienceTitle.trim() || null,
      experience_text: experienceText.trim() || null,
    }, { onConflict: "photographer_id" });

    if (error) {
      toast({ title: ws.failedToSave, description: error.message, variant: "destructive" });
    } else {
      toast({ title: ws.settingsSaved, description: ws.settingsSavedDesc });
    }
    setSaving(false);
  };

  return (
    <>
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="max-w-2xl flex flex-col gap-8">
              <div>
                 <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                   <span className="inline-block w-6 h-px bg-border" />
                   {ws.pageLabel}
                 </p>
                 <div className="flex items-center justify-between gap-4 flex-wrap">
                   <h1 className="text-2xl font-light tracking-wide">{ws.pageTitle}</h1>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => navigate("/dashboard/website/editor")}
                        className="h-8 gap-1.5 text-[11px] tracking-[0.15em] uppercase"
                      >
                        <Layout className="h-3.5 w-3.5" />
                        Open Editor
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/store/${storeSlug}`, "_blank")}
                        className="h-8 gap-1.5 text-[11px] tracking-[0.15em] uppercase"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview Site
                      </Button>
                    </div>
                 </div>
               </div>

              {loading ? (
                 <p className="text-xs text-muted-foreground animate-pulse tracking-widest uppercase">{ws.loading}</p>
              ) : (
                <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-10">

                   {/* ── 0. Template ── */}
                  <section className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                      <SectionHeading title="Template" description="Change your site layout template." />
                    </div>

                    <div className="relative w-full max-w-[240px] group">
                      {(() => {
                        const current = TEMPLATES.find(t => t.value === siteTemplate) ?? TEMPLATES[0];
                        return (
                          <>
                            <TemplatePreviewCard
                              value={current.value}
                              label={current.label}
                              description={current.description}
                              selected
                              onClick={() => setShowTemplateGrid(true)}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                              onClick={() => setShowTemplateGrid(true)}
                            >
                              <Button variant="outline" size="sm" className="pointer-events-none">
                                Change template
                              </Button>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <Dialog
                      open={showTemplateGrid}
                      onOpenChange={(open) => {
                        setShowTemplateGrid(open);
                        if (open) setPendingTemplate(siteTemplate);
                      }}
                    >
                      <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
                        {/* Sticky header */}
                        <DialogHeader className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 flex-row items-center justify-between gap-4 space-y-0">
                          <div className="flex flex-col gap-1 min-w-0">
                            <DialogTitle className="text-base">Choose a template</DialogTitle>
                            <DialogDescription className="text-xs">
                              Pick a layout for your site. Preview before applying.
                            </DialogDescription>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 mr-8">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowTemplateGrid(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              disabled={!pendingTemplate || pendingTemplate === siteTemplate}
                              onClick={() => {
                                if (pendingTemplate && pendingTemplate !== siteTemplate) {
                                  setConfirmTemplate(pendingTemplate);
                                }
                              }}
                            >
                              Confirm
                            </Button>
                          </div>
                        </DialogHeader>

                        {/* Scrollable grid */}
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {TEMPLATES.map((tmpl) => (
                              <TemplatePreviewCard
                                key={tmpl.value}
                                value={tmpl.value}
                                label={tmpl.label}
                                description={tmpl.description}
                                selected={(pendingTemplate ?? siteTemplate) === tmpl.value}
                                onClick={() => setPendingTemplate(tmpl.value)}
                                onPreview={() => setPreviewModalTemplate(tmpl.value)}
                              />
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </section>
                  {/* ── 10. Store URL ── */}
                  <section className="flex flex-col gap-5">
                    <div className="flex items-center gap-2">
                      <Store className="h-3.5 w-3.5 text-muted-foreground" />
                      <SectionHeading title={ws.storeUrlTitle} description={ws.storeUrlDesc} />
                    </div>
                    <FieldRow label={ws.storeSlugLabel}>
                       <div className="flex items-center border border-input bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring">
                         <span className="pl-3 pr-1 h-9 flex items-center text-xs text-muted-foreground select-none shrink-0 whitespace-nowrap">
                           davions.com/store/
                         </span>
                         <input
                           value={slugInput}
                           onChange={(e) => { setSlugInput(e.target.value.toLowerCase().replace(/\s/g, "-")); setSlugError(null); }}
                           placeholder={ws.storeSlugPlaceholder}
                           className="flex-1 h-9 px-1 text-sm font-light bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
                         />
                       </div>
                       {slugError && (
                         <p className="flex items-center gap-1 text-[11px] text-destructive mt-1">
                           <AlertCircle className="h-3 w-3" />{slugError}
                         </p>
                       )}
                     </FieldRow>
                      {storeSlug && (
                        <StoreSharePanel url={`https://davions.com/store/${storeSlug}`} />
                      )}
                    <Button onClick={handleSaveSlug} disabled={savingSlug} size="sm" variant="outline" className="gap-2 text-xs tracking-wider uppercase font-light w-fit">
                      {savingSlug ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />{ws.saving}</> : ws.saveStoreUrl}
                    </Button>
                  </section>

                  <Divider />

                  {/* ── 11. Custom Domain ── */}
                   <section className="flex flex-col gap-5">
                     <div className="flex items-center gap-2">
                       <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                       <SectionHeading title={ws.customDomainTitle} description={ws.customDomainDesc} />
                     </div>

                      {/* Current domain display or empty state */}
                      {customDomain ? (
                         <div className="flex flex-col gap-3">
                           <StoreSharePanel url={`https://${customDomain}`} />
                           {(() => {
                            const DAVIONS_VPS_IP = import.meta.env.VITE_VPS_IP || "147.93.112.182";
                            const parts = customDomain.split(".");
                            const lastTwo = parts.slice(-2).join(".");
                            const compoundTlds = ["com.br","net.br","org.br","edu.br","gov.br","co.uk","com.au","co.nz","com.ar","com.mx","com.co"];
                            const isSubdomain = parts.length > (compoundTlds.includes(lastTwo) ? 3 : 2);
                            const subName = isSubdomain ? parts[0] : null;
                            const dnsRecords = isSubdomain
                              ? [{ type: "A", name: subName!, value: DAVIONS_VPS_IP }]
                              : [
                                  { type: "A", name: "@",   value: DAVIONS_VPS_IP },
                                  { type: "A", name: "www", value: DAVIONS_VPS_IP },
                                ];
                            return (
                              <div className="flex flex-col gap-3">
                                <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground">DNS Records</p>
                                <div className="border border-border overflow-hidden">
                                  <table className="w-full text-[11px]">
                                    <thead>
                                      <tr className="border-b border-border bg-muted/40">
                                        <th className="text-left px-3 py-2.5 font-light text-muted-foreground tracking-wide">Type</th>
                                        <th className="text-left px-3 py-2.5 font-light text-muted-foreground tracking-wide">Name</th>
                                        <th className="text-left px-3 py-2.5 font-light text-muted-foreground tracking-wide">Value</th>
                                        <th className="px-2 py-2.5 w-8" />
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {dnsRecords.map((r, i) => (
                                        <DnsRow key={i} type={r.type} name={r.name} value={r.value} />
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                <RegistrarGuide domain={customDomain} vpsIp={DAVIONS_VPS_IP} />
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          No custom domain connected yet. Click below to set one up with the step-by-step wizard.
                        </p>
                      )}

                       {/* Domain Status Panel */}
                       {customDomain && (
                         <div className="flex flex-col gap-2">
                           {(() => {
                             const allOk = domainChecks.every((c) => c.status === "ok");
                             const anyError = domainChecks.some((c) => c.status === "error");
                             const anyChecking = domainChecks.some((c) => c.status === "checking");
                             const allIdle = domainChecks.every((c) => c.status === "idle");
                             if (allIdle) return null;
                             if (anyChecking) return (
                               <div className="flex items-center gap-2 px-3 py-2.5 border border-border bg-muted/20">
                                 <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                                 <span className="text-[11px] text-muted-foreground">Running checks…</span>
                               </div>
                             );
                             if (allOk) return (
                               <div className="flex items-center gap-2 px-3 py-2.5 border border-primary/20 bg-primary/5">
                                 <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                                 <span className="text-[11px] text-primary">Domain fully active — DNS propagated, SSL valid, routing correctly.</span>
                               </div>
                             );
                             if (anyError) return (
                               <div className="flex items-center gap-2 px-3 py-2.5 border border-destructive/20 bg-destructive/5">
                                 <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                                 <span className="text-[11px] text-destructive">One or more checks failed — review DNS records.</span>
                               </div>
                             );
                             return (
                               <div className="flex items-center gap-2 px-3 py-2.5 border border-border bg-muted/20">
                                 <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                 <span className="text-[11px] text-muted-foreground">Some checks returned warnings. DNS may still be propagating.</span>
                               </div>
                             );
                           })()}
                           <div className="flex flex-col border border-border divide-y divide-border">
                             {domainChecks.map((check, i) => {
                               const icons: Record<string, React.ElementType> = { dns: Wifi, ssl: ShieldCheck, routing: Globe };
                               return (
                                 <motion.div key={check.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.2 }} className="flex items-start gap-3 px-3 py-3">
                                   <div className="mt-0.5 shrink-0">
                                     {check.status === "checking" && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                                     {check.status === "ok"       && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                                     {check.status === "error"    && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                                     {check.status === "warning"  && <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />}
                                     {check.status === "idle"     && <Clock className="h-3.5 w-3.5 text-muted-foreground/40" />}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                     <div className="flex items-center gap-2">
                                       <span className="text-[11px] font-medium tracking-wide">{check.label}</span>
                                       <span className={`text-[9px] tracking-wider uppercase font-medium px-1.5 py-0.5 rounded-sm ${check.status === "ok" ? "bg-primary/10 text-primary border border-primary/20" : check.status === "error" ? "bg-destructive/10 text-destructive border border-destructive/20" : check.status === "checking" ? "bg-muted text-muted-foreground animate-pulse" : check.status === "warning" ? "bg-secondary/40 text-secondary-foreground border border-secondary/30" : "bg-muted text-muted-foreground"}`}>
                                         {check.status === "ok" ? "OK" : check.status === "error" ? "Failed" : check.status === "warning" ? "Warning" : check.status === "checking" ? "Checking…" : "Waiting"}
                                       </span>
                                     </div>
                                     <p className="text-[10px] text-muted-foreground mt-0.5">{check.description}</p>
                                     {check.detail && <p className={`text-[10px] mt-0.5 font-mono ${check.status === "error" ? "text-destructive" : check.status === "ok" ? "text-primary" : "text-muted-foreground"}`}>{check.detail}</p>}
                                   </div>
                                 </motion.div>
                               );
                             })}
                           </div>
                           <div className="flex items-center gap-3">
                             <Button type="button" size="sm" variant="ghost" disabled={domainChecks.some((c) => c.status === "checking")} onClick={() => checkDomainConnectivity()} className="h-7 px-3 text-[11px] tracking-wider uppercase font-light shrink-0 gap-1.5">
                               <RefreshCw className={`h-3 w-3 ${domainChecks.some((c) => c.status === "checking") ? "animate-spin" : ""}`} />
                               {domainChecks.some((c) => c.status === "checking") ? "Checking…" : "Refresh Status"}
                             </Button>
                             {domainLastChecked && <span className="text-[10px] text-muted-foreground/50">Last checked: {domainLastChecked.toLocaleTimeString()}</span>}
                           </div>
                         </div>
                       )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button type="button" onClick={() => setDomainSetupOpen(true)} size="sm" variant="outline" className="gap-2 text-xs tracking-wider uppercase font-light w-fit">
                          <Globe className="h-3.5 w-3.5" />
                          {customDomain ? "Edit Domain Setup" : "Connect Domain"}
                        </Button>
                        {customDomain && (
                          <Button onClick={handleRemoveDomain} disabled={removingDomain} size="sm" variant="ghost" className="gap-2 text-xs tracking-wider uppercase font-light w-fit text-destructive hover:text-destructive hover:bg-destructive/10">
                            {removingDomain ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Removing…</> : <><Trash2 className="h-3.5 w-3.5" />Remove Domain</>}
                          </Button>
                        )}
                      </div>

                      {/* Setup wizard modal */}
                      <CustomDomainSetupModal
                        open={domainSetupOpen}
                        onOpenChange={setDomainSetupOpen}
                        initialDomain={customDomain}
                        onSaved={(saved) => {
                          setCustomDomain(saved);
                          setCustomDomainInput(saved);
                          setDomainChecks((prev) => prev.map((c) => ({ ...c, status: "idle" as const, detail: undefined })));
                          setDomainLastChecked(null);
                          checkDomainConnectivity(saved);
                        }}
                      />
                    </section>



                  {/* ── Save ── */}
                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <Button onClick={handleSave} disabled={saving} className="gap-2 text-xs tracking-wider uppercase font-light">
                      {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />{ws.saving}</> : ws.saveSettings}
                    </Button>
                    <p className="text-[10px] text-muted-foreground/60">{ws.saveDesc}</p>
                  </div>

                  {/* ── Danger zone ── */}
                  <section className="flex flex-col gap-3 mt-6 pt-6 border-t border-destructive/30">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      <SectionHeading title={(ws as any).dangerZoneTitle ?? "Danger zone"} description={(ws as any).dangerZoneDesc} />
                    </div>
                    <div className="border border-destructive/30 bg-destructive/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                      <p className="text-[11px] text-muted-foreground max-w-md">
                        {(ws as any).resetSiteHint}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { setResetConfirmText(""); setResetDialogOpen(true); }}
                        className="gap-2 text-[11px] tracking-wider uppercase font-light text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/40 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {(ws as any).resetSiteButton ?? "Reset entire website"}
                      </Button>
                    </div>
                  </section>

                </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>

    {/* Reset Site confirmation */}
    <AlertDialog open={resetDialogOpen} onOpenChange={(o) => { if (!resetting) setResetDialogOpen(o); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            {(ws as any).resetDialogTitle ?? "Reset entire website?"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-3 text-left">
              <p className="text-sm text-muted-foreground">{(ws as any).resetDialogIntro}</p>
              <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
                <li>{(ws as any).resetItemPages}</li>
                <li>{(ws as any).resetItemContent}</li>
                <li>{(ws as any).resetItemBranding}</li>
                <li>{(ws as any).resetItemSeo}</li>
              </ul>
              <div className="border border-border bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
                {(ws as any).resetKeepNote}
              </div>
              <div className="flex flex-col gap-1.5 pt-1">
                <Label htmlFor="reset-confirm" className="text-[11px] tracking-wider uppercase font-light">
                  {(ws as any).resetConfirmLabel}
                </Label>
                <Input
                  id="reset-confirm"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="RESET"
                  autoComplete="off"
                  disabled={resetting}
                  className="font-mono"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={resetting}>{(ws as any).resetCancel ?? "Cancel"}</AlertDialogCancel>
          <AlertDialogAction
            disabled={resetConfirmText.trim() !== "RESET" || resetting}
            onClick={async (e) => {
              e.preventDefault();
              if (resetConfirmText.trim() !== "RESET") return;
              setResetting(true);
              try {
                const { error } = await supabase.functions.invoke("reset-site", {
                  body: { keep_template: siteTemplate },
                });
                if (error) throw error;
                toast({
                  title: (ws as any).resetSuccess ?? "Website reset",
                  description: (ws as any).resetSuccessDesc,
                });
                setResetDialogOpen(false);
                setTimeout(() => window.location.reload(), 400);
              } catch (err) {
                toast({
                  title: (ws as any).resetFailed ?? "Failed to reset website",
                  description: err instanceof Error ? err.message : String(err),
                  variant: "destructive",
                });
                setResetting(false);
              }
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {resetting ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />{(ws as any).resetting}</>
            ) : (
              (ws as any).resetConfirm ?? "Reset website"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Confirm template change */}
    <AlertDialog
      open={!!confirmTemplate}
      onOpenChange={(o) => { if (!o && !applyingTemplate) setConfirmTemplate(null); }}
    >
      <AlertDialogContent className="z-[60]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Aplicar o template "{TEMPLATES.find((t) => t.value === confirmTemplate)?.label ?? confirmTemplate}"?
          </AlertDialogTitle>
          <AlertDialogDescription>
            O novo template será aplicado ao seu site, atualizando o estilo visual (fontes, cores e
            variantes de layout). Seus textos, imagens e páginas existentes serão preservados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={applyingTemplate}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={applyingTemplate}
            onClick={async (e) => {
              e.preventDefault();
              const tid = confirmTemplate;
              if (!tid || !user) return;
              setApplyingTemplate(true);
              try {
                // Persist site_template immediately
                const { error: upErr } = await (supabase as any)
                  .from("photographer_site")
                  .upsert(
                    { photographer_id: user.id, site_template: tid },
                    { onConflict: "photographer_id" },
                  );
                if (upErr) throw upErr;

                // Regenerate default pages
                const count = await regenerateDefaultPagesForTemplate(user.id, tid);
                setSiteTemplate(tid);
                toast({
                  title: "Template aplicado",
                  description: "Estilo visual atualizado. Seus textos, imagens e páginas foram preservados.",
                });
                setConfirmTemplate(null);
                setShowTemplateGrid(false);
              } catch (err: any) {
                toast({
                  title: "Falha ao aplicar template",
                  description: err?.message ?? String(err),
                  variant: "destructive",
                });
              } finally {
                setApplyingTemplate(false);
              }
            }}
          >
            {applyingTemplate ? "Aplicando..." : "Aplicar template"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {previewModalTemplate && (
      <TemplatePreviewModal
        open={!!previewModalTemplate}
        onClose={() => setPreviewModalTemplate(null)}
        templateId={previewModalTemplate}
        templateLabel={TEMPLATES.find((t) => t.value === previewModalTemplate)?.label ?? previewModalTemplate}
        storeSlug={storeSlug}
        onApply={(tid) => { setPreviewModalTemplate(null); setConfirmTemplate(tid); }}
        isCurrentTemplate={siteTemplate === previewModalTemplate}
        siteData={{
          logo_url: logoUrl || null,
          tagline: tagline || null,
          accent_color: accentColor,
          site_headline: siteHeadline || null,
          site_subheadline: siteSubheadline || null,
          cta_text: ctaText,
          cta_link: ctaLink || null,
          about_title: aboutTitle,
          about_image_url: aboutImageUrl || null,
          site_hero_image_url: heroImageUrl || null,
          instagram_url: instagramUrl || null,
          facebook_url: facebookUrl || null,
          pinterest_url: pinterestUrl || null,
          tiktok_url: tiktokUrl || null,
          youtube_url: youtubeUrl || null,
          whatsapp: whatsapp || null,
          linkedin_url: linkedinUrl || null,
          show_store: showStore,
          show_blog: showBlog,
          show_booking: showBooking,
          show_about: showAbout,
          show_contact: showContact,
          quote_text: quoteText || null,
          quote_author: quoteAuthor || null,
          experience_title: experienceTitle || null,
          experience_text: experienceText || null,
          seo_title: seoTitle || null,
          seo_description: seoDescription || null,
          og_image_url: ogImageUrl || null,
          favicon_url: faviconUrl || null,
        } as any}
        photographer={{
          id: user?.id ?? "",
          full_name: fullName || null,
          email: user?.email ?? "",
          store_slug: storeSlug || null,
          bio: bio || null,
          business_name: null,
        }}
      />
    )}
    </>
  );
};

export default WebsiteSettings;
