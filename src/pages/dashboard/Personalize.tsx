import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Check, Copy, AlertCircle, Store, Globe, ExternalLink,
  Upload, Loader2, X, Plus, Pencil, Trash2, Type, Image,
  Instagram, Youtube, Linkedin, Facebook, BarChart2, Palette,
  Layout, FileText, Link2, Phone, ChevronDown, ChevronUp, Download,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WatermarkEditor, WatermarkData } from "@/components/dashboard/WatermarkEditor";
import SessionTypeManager, { SessionType } from "@/components/dashboard/SessionTypeManager";

// ── Briefing types ─────────────────────────────────────────────────────────────
type QuestionType = "short_text" | "long_text" | "multiple_choice" | "checkboxes" | "yes_no";
interface BriefingQuestion {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options: string[];
}
interface Briefing { id: string; name: string; questions: BriefingQuestion[]; }
const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  multiple_choice: "Multiple choice",
  checkboxes: "Checkboxes",
  yes_no: "Yes / No",
};

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

// ── Site templates ────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    value: "editorial",
    label: "Editorial",
    description: "Full-bleed hero, minimal typography, luxury feel.",
    preview: "bg-foreground",
  },
  {
    value: "grid",
    label: "Grid",
    description: "Photo-first grid layout with sidebar details.",
    preview: "bg-muted",
  },
  {
    value: "magazine",
    label: "Magazine",
    description: "Bold columns, mixed-size cards, editorial headlines.",
    preview: "bg-muted/60",
  },
  {
    value: "clean",
    label: "Clean",
    description: "Centered, whitespace-heavy, distraction-free.",
    preview: "bg-background border border-border",
  },
];

// ── Section label ──────────────────────────────────────────────────────────────
function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <p className="text-[11px] tracking-[0.25em] uppercase font-light mb-0.5">{title}</p>
      {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider() {
  return <div className="border-t border-border" />;
}

// ── Field row ─────────────────────────────────────────────────────────────────
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] tracking-wider uppercase font-light">{label}</Label>
      {children}
    </div>
  );
}

const Personalize = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // ── Store / Domain ───────────────────────────────────────────────────────────
  const [storeSlug, setStoreSlug] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [customDomainInput, setCustomDomainInput] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [domainCopied, setDomainCopied] = useState(false);
  const [savingStore, setSavingStore] = useState(false);

  // ── Site settings (photographer_site) ──────────────────────────────────────
  // Branding
  const [logoUrl, setLogoUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [accentColor, setAccentColor] = useState("#000000");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Hero
  const [siteHeadline, setSiteHeadline] = useState("");
  const [siteSubheadline, setSiteSubheadline] = useState("");
  const [ctaText, setCtaText] = useState("Book a Session");
  const [ctaLink, setCtaLink] = useState("");

  // About
  const [aboutTitle, setAboutTitle] = useState("About");
  const [aboutImageUrl, setAboutImageUrl] = useState("");
  const [uploadingAbout, setUploadingAbout] = useState(false);

  // Hero image (from photographers table)
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [uploadingHero, setUploadingHero] = useState(false);

  // About / bio (from photographers table)
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

  // Navigation visibility
  const [showStore, setShowStore] = useState(true);
  const [showBlog, setShowBlog] = useState(false);
  const [showBooking, setShowBooking] = useState(true);
  const [showAbout, setShowAbout] = useState(true);
  const [showContact, setShowContact] = useState(true);

  // Template
  const [siteTemplate, setSiteTemplate] = useState("editorial");

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

  const [savingSite, setSavingSite] = useState(false);

  // ── Shared ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);

  // ── Business tab ────────────────────────────────────────────────────────────
  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessCity, setBusinessCity] = useState("");
  const [businessCountry, setBusinessCountry] = useState("");
  const [businessCurrency, setBusinessCurrency] = useState("USD");
  const [businessTaxId, setBusinessTaxId] = useState("");
  const [savingBusiness, setSavingBusiness] = useState(false);

  // ── Gallery settings ────────────────────────────────────────────────────────
  const [galleryExpiryDays, setGalleryExpiryDays] = useState<string>("");
  const [galleryReactivationFee, setGalleryReactivationFee] = useState<string>("");
  const [savingExpiry, setSavingExpiry] = useState(false);
  const [savingFee, setSavingFee] = useState(false);

  // ── Watermarks ──────────────────────────────────────────────────────────────
  const [watermarks, setWatermarks] = useState<WatermarkData[]>([]);
  const [watermarkEditorOpen, setWatermarkEditorOpen] = useState(false);
  const [editingWatermark, setEditingWatermark] = useState<WatermarkData | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Studio tab ──────────────────────────────────────────────────────────────
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

  // ── Contracts ───────────────────────────────────────────────────────────────
  interface Contract { id: string; name: string; body: string; }
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [deletingContractId, setDeletingContractId] = useState<string | null>(null);

  // ── Briefings ────────────────────────────────────────────────────────────────
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [briefingDialogOpen, setBriefingDialogOpen] = useState(false);
  const [editingBriefing, setEditingBriefing] = useState<Briefing | null>(null);
  const [briefingName, setBriefingName] = useState("");
  const [briefingQuestions, setBriefingQuestions] = useState<BriefingQuestion[]>([]);
  const [savingBriefing, setSavingBriefing] = useState(false);
  const [deletingBriefingId, setDeletingBriefingId] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const aboutInputRef = useRef<HTMLInputElement>(null);
  const ogInputRef = useRef<HTMLInputElement>(null);

  const fetchSessionTypes = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("session_types")
      .select("id, name")
      .eq("photographer_id", user.id)
      .order("created_at", { ascending: true });
    if (data) setSessionTypes(data as SessionType[]);
  }, [user]);

  const fetchContracts = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("contracts")
      .select("id, name, body")
      .eq("photographer_id", user.id)
      .order("created_at", { ascending: true });
    if (data) setContracts(data);
  }, [user]);

  const fetchBriefings = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("briefings")
      .select("id, name, questions")
      .eq("photographer_id", user.id)
      .order("created_at", { ascending: true });
    if (data) setBriefings(data as Briefing[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [profileRes, siteRes, watermarksRes, gallerySettingsRes, businessRes] = await Promise.all([
        supabase.from("photographers")
          .select("full_name, store_slug, custom_domain, bio, hero_image_url")
          .eq("id", user.id).single(),
        (supabase as any).from("photographer_site")
          .select("*").eq("photographer_id", user.id).maybeSingle(),
        (supabase as any).from("watermarks")
          .select("*").eq("photographer_id", user.id).order("created_at", { ascending: true }),
        (supabase as any).from("gallery_settings")
          .select("key, value").eq("photographer_id", user.id),
        (supabase as any).from("photographers")
          .select("business_name, business_phone, business_address, business_city, business_country, business_currency, business_tax_id")
          .eq("id", user.id).single(),
        fetchSessionTypes(),
        fetchContracts(),
        fetchBriefings(),
      ]);

      if (profileRes.data) {
        const d = profileRes.data;
        setFullName(d.full_name ?? "");
        setStoreSlug(d.store_slug ?? "");
        setSlugInput(d.store_slug ?? "");
        setCustomDomain((d as any).custom_domain ?? "");
        setCustomDomainInput((d as any).custom_domain ?? "");
        setBio((d as any).bio ?? "");
        setHeroImageUrl((d as any).hero_image_url ?? "");
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
        setGoogleAnalyticsId(s.google_analytics_id ?? "");
        setFacebookPixelId(s.facebook_pixel_id ?? "");
        setFooterText(s.footer_text ?? "");
      }

      if (watermarksRes.data) setWatermarks(watermarksRes.data as WatermarkData[]);

      if (gallerySettingsRes?.data) {
        const expiryRow = gallerySettingsRes.data.find((r: any) => r.key === "default_expiry_days");
        if (expiryRow) setGalleryExpiryDays(expiryRow.value ?? "");
        const feeRow = gallerySettingsRes.data.find((r: any) => r.key === "reactivation_fee");
        if (feeRow) setGalleryReactivationFee(feeRow.value ?? "");
      }

      if (businessRes?.data) {
        const b = businessRes.data;
        setBusinessName(b.business_name ?? "");
        setBusinessPhone(b.business_phone ?? "");
        setBusinessAddress(b.business_address ?? "");
        setBusinessCity(b.business_city ?? "");
        setBusinessCountry(b.business_country ?? "");
        setBusinessCurrency(b.business_currency ?? "USD");
        setBusinessTaxId(b.business_tax_id ?? "");
      }

      setLoading(false);
    };
    fetchAll();
  }, [user, fetchSessionTypes, fetchContracts]);

  // ── Validators ──────────────────────────────────────────────────────────────
  const validateSlug = (value: string) => {
    if (!value.trim()) return "Store URL is required.";
    if (value.length < 3) return "Must be at least 3 characters.";
    if (value.length > 48) return "Must be 48 characters or less.";
    if (!SLUG_REGEX.test(value))
      return "Only lowercase letters, numbers and hyphens.";
    return null;
  };

  const validateDomain = (value: string) => {
    if (!value.trim()) return null;
    const v = value.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!DOMAIN_REGEX.test(v)) return "Enter a valid domain (e.g. booking.yourstudio.com).";
    return null;
  };

  // ── Upload helpers ───────────────────────────────────────────────────────────
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

  // ── Save handlers ────────────────────────────────────────────────────────────

  const handleSaveStore = async () => {
    const slugErr = validateSlug(slugInput);
    const domErr = validateDomain(customDomainInput);
    if (slugErr) { setSlugError(slugErr); return; }
    if (domErr) { setDomainError(domErr); return; }
    setSavingStore(true);
    const { error } = await supabase.from("photographers").update({
      full_name: fullName,
      store_slug: slugInput,
      custom_domain: customDomainInput.trim() || null,
    } as any).eq("id", user!.id);
    if (error) {
      if (error.code === "23505") {
        if (error.message.includes("store_slug")) setSlugError("This URL is already taken.");
        else if (error.message.includes("custom_domain")) setDomainError("This domain is already linked to another account.");
        else toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      }
    } else {
      setStoreSlug(slugInput);
      setCustomDomain(customDomainInput.trim());
      toast({ title: "URL & domain saved" });
    }
    setSavingStore(false);
  };

  const handleSaveSite = async () => {
    if (!user) return;
    setSavingSite(true);

    // Also save bio + hero to photographers table
    await supabase.from("photographers").update({
      full_name: fullName.trim() || null,
      bio: bio.trim() || null,
      hero_image_url: heroImageUrl.trim() || null,
    } as any).eq("id", user.id);

    const { error } = await (supabase as any).from("photographer_site").upsert({
      photographer_id: user.id,
      logo_url: logoUrl.trim() || null,
      tagline: tagline.trim() || null,
      accent_color: accentColor,
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
      google_analytics_id: googleAnalyticsId.trim() || null,
      facebook_pixel_id: facebookPixelId.trim() || null,
      footer_text: footerText.trim() || null,
    }, { onConflict: "photographer_id" });

    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Site settings saved", description: "Your website configuration has been updated." });
    }
    setSavingSite(false);
  };

  const handleSaveBusiness = async () => {
    setSavingBusiness(true);
    const { error } = await (supabase as any).from("photographers").update({
      business_name: businessName.trim() || null,
      business_phone: businessPhone.trim() || null,
      business_address: businessAddress.trim() || null,
      business_city: businessCity.trim() || null,
      business_country: businessCountry.trim() || null,
      business_currency: businessCurrency.trim() || null,
      business_tax_id: businessTaxId.trim() || null,
    }).eq("id", user!.id);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Business settings saved" });
    }
    setSavingBusiness(false);
  };

  const handleSaveExpiry = async () => {
    if (!user) return;
    setSavingExpiry(true);
    const days = parseInt(galleryExpiryDays, 10);
    const expiryValue = (!galleryExpiryDays.trim() || isNaN(days) || days <= 0) ? null : String(days);
    const { error } = await (supabase as any).from("gallery_settings").upsert(
      { photographer_id: user.id, key: "default_expiry_days", value: expiryValue },
      { onConflict: "photographer_id,key" }
    );
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Default expiration saved" });
    }
    setSavingExpiry(false);
  };

  const handleSaveReactivationFee = async () => {
    if (!user) return;
    setSavingFee(true);
    const fee = parseFloat(galleryReactivationFee);
    const feeValue = (!galleryReactivationFee.trim() || isNaN(fee) || fee < 0) ? null : String(fee);
    const { error } = await (supabase as any).from("gallery_settings").upsert(
      { photographer_id: user.id, key: "reactivation_fee", value: feeValue },
      { onConflict: "photographer_id,key" }
    );
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reactivation fee saved" });
    }
    setSavingFee(false);
  };

  const handleWatermarkSaved = (wm: WatermarkData) => {
    setWatermarks((prev) => {
      const exists = prev.find((w) => w.id === wm.id);
      return exists ? prev.map((w) => (w.id === wm.id ? wm : w)) : [...prev, wm];
    });
    setWatermarkEditorOpen(false);
    setEditingWatermark(undefined);
  };

  const handleWatermarkDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await (supabase as any).from("watermarks").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting watermark", description: error.message, variant: "destructive" });
    } else {
      setWatermarks((prev) => prev.filter((w) => w.id !== id));
      toast({ title: "Watermark deleted" });
    }
    setDeletingId(null);
  };

  const copyUrl = async (url: string, setCopiedFn: (v: boolean) => void) => {
    await navigator.clipboard.writeText(url);
    setCopiedFn(true);
    setTimeout(() => setCopiedFn(false), 2000);
  };

  const storeUrl = slugInput ? `${window.location.origin}/store/${slugInput}` : null;
  const appHost = window.location.host;

  return (
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
                  Photographers
                </p>
                <h1 className="text-2xl font-light tracking-wide">Personalize</h1>
              </div>

              {loading ? (
                <p className="text-xs text-muted-foreground animate-pulse tracking-widest uppercase">Loading…</p>
              ) : (
                <Tabs defaultValue="studio" className="w-full">
                  <TabsList className="h-auto bg-transparent p-0 border-b border-border rounded-none w-full justify-start gap-0 mb-8">
                    {[
                      { value: "studio", label: "Studio" },
                      { value: "business", label: "Business" },
                      { value: "galleries", label: "Galleries" },
                    ].map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="
                          rounded-none bg-transparent px-5 py-2.5
                          text-[11px] tracking-[0.2em] uppercase font-light
                          text-muted-foreground border-b-2 border-transparent
                          data-[state=active]:text-foreground
                          data-[state=active]:border-foreground
                          data-[state=active]:bg-transparent
                          data-[state=active]:shadow-none
                          hover:text-foreground transition-colors
                        "
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {/* ── STUDIO TAB ── */}
                  <TabsContent value="studio" className="mt-0 flex flex-col gap-8">
                    <section className="flex flex-col gap-4">
                      <SectionHeading
                        title="Session Types"
                        description="Categorize your sessions by type (e.g. Newborn, Wedding, Portrait)."
                      />
                      {user && (
                        <SessionTypeManager
                          photographerId={user.id}
                          sessionTypes={sessionTypes}
                          selectedTypeId={selectedTypeId}
                          onSelect={setSelectedTypeId}
                          onRefetch={fetchSessionTypes}
                          mode="manage"
                        />
                      )}
                    </section>

                    <div className="border-t border-border" />

                    {/* Contracts */}
                    <section className="flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-4">
                        <SectionHeading
                          title="Contracts"
                          description="Create reusable service agreements to attach to your booking sessions."
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1.5 text-xs tracking-wider uppercase font-light"
                          onClick={() => navigate("/dashboard/contracts/new")}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          New contract
                        </Button>
                      </div>

                      {contracts.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No contracts yet. Create one to attach to your sessions.</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {contracts.map((c) => (
                            <div key={c.id} className="border border-border p-4 flex items-start justify-between gap-4 group">
                              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                <p className="text-xs tracking-wider uppercase font-light truncate">{c.name || "Untitled"}</p>
                                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                  {c.body
                                    ? c.body.replace(/<[^>]+>/g, " ").replace(/\[\[(\w+)\]\]/g, "{{$1}}").replace(/\s+/g, " ").trim().slice(0, 80) + (c.body.length > 80 ? "…" : "")
                                    : "No content yet"}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-3 text-[10px] tracking-wider uppercase font-light"
                                  onClick={() => navigate(`/dashboard/contracts/${c.id}/edit`)}
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  disabled={deletingContractId === c.id}
                                  onClick={async () => {
                                    setDeletingContractId(c.id);
                                    await (supabase as any).from("contracts").delete().eq("id", c.id);
                                    await fetchContracts();
                                    setDeletingContractId(null);
                                  }}
                                >
                                  {deletingContractId === c.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <div className="border-t border-border" />

                    {/* Briefings */}
                    <section className="flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-4">
                        <SectionHeading
                          title="Briefings"
                          description="Build questionnaires to understand your clients before the session."
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1.5 text-xs tracking-wider uppercase font-light"
                          onClick={() => {
                            setEditingBriefing(null);
                            setBriefingName("");
                            setBriefingQuestions([]);
                            setBriefingDialogOpen(true);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          New briefing
                        </Button>
                      </div>

                      {briefings.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No briefings yet. Create one to collect info from clients after they book.</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {briefings.map((b) => (
                            <div key={b.id} className="border border-border p-4 flex items-start justify-between gap-4">
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <p className="text-xs tracking-wider uppercase font-light truncate">{b.name || "Untitled"}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {b.questions.length} question{b.questions.length !== 1 ? "s" : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setEditingBriefing(b);
                                    setBriefingName(b.name);
                                    setBriefingQuestions(b.questions);
                                    setBriefingDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  disabled={deletingBriefingId === b.id}
                                  onClick={async () => {
                                    setDeletingBriefingId(b.id);
                                    await (supabase as any).from("briefings").delete().eq("id", b.id);
                                    await fetchBriefings();
                                    setDeletingBriefingId(null);
                                  }}
                                >
                                  {deletingBriefingId === b.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </TabsContent>

                  {/* Briefing dialog */}
                  <Dialog open={briefingDialogOpen} onOpenChange={(open) => {
                    setBriefingDialogOpen(open);
                  }}>
                    <DialogContent className="max-w-2xl w-full" style={{ maxHeight: "90vh", overflowY: "auto" }}>
                      <DialogHeader>
                        <DialogTitle className="text-sm tracking-widest uppercase font-light">
                          {editingBriefing ? "Edit Briefing" : "New Briefing"}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col gap-5 pt-2">
                        {/* Briefing name */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-[11px] tracking-wider uppercase font-light">Briefing Name</Label>
                          <Input
                            value={briefingName}
                            onChange={(e) => setBriefingName(e.target.value)}
                            placeholder="e.g. Newborn Briefing"
                            className="text-sm font-light"
                          />
                        </div>

                        {/* Questions */}
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-[11px] tracking-wider uppercase font-light">Questions</Label>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-1 text-[10px] tracking-wider uppercase font-light h-7 px-3"
                              onClick={() => {
                                const newQ: BriefingQuestion = {
                                  id: crypto.randomUUID(),
                                  type: "short_text",
                                  label: "",
                                  required: false,
                                  options: [],
                                };
                                setBriefingQuestions((prev) => [...prev, newQ]);
                              }}
                            >
                              <Plus className="h-3 w-3" />
                              Add question
                            </Button>
                          </div>

                          {briefingQuestions.length === 0 && (
                            <p className="text-[11px] text-muted-foreground italic text-center py-4 border border-dashed border-border">
                              No questions yet — click "Add question" to start building.
                            </p>
                          )}

                          {briefingQuestions.map((q, idx) => (
                            <div key={q.id} className="border border-border p-4 flex flex-col gap-3">
                              {/* Question header */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] tracking-wider uppercase text-muted-foreground">Question {idx + 1}</span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => setBriefingQuestions((prev) => prev.filter((_, i) => i !== idx))}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Type + Required row */}
                              <div className="flex items-center gap-3 flex-wrap">
                                <select
                                  value={q.type}
                                  onChange={(e) => {
                                    const newType = e.target.value as QuestionType;
                                    setBriefingQuestions((prev) => prev.map((item, i) =>
                                      i === idx ? { ...item, type: newType, options: ["multiple_choice", "checkboxes"].includes(newType) ? (item.options.length ? item.options : [""]) : [] } : item
                                    ));
                                  }}
                                  className="h-8 px-2 text-xs font-light bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                  {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                  ))}
                                </select>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    id={`req-${q.id}`}
                                    checked={q.required}
                                    onCheckedChange={(v) => setBriefingQuestions((prev) => prev.map((item, i) => i === idx ? { ...item, required: v } : item))}
                                  />
                                  <label htmlFor={`req-${q.id}`} className="text-[11px] text-muted-foreground cursor-pointer">Required</label>
                                </div>
                              </div>

                              {/* Question label */}
                              <Input
                                value={q.label}
                                onChange={(e) => setBriefingQuestions((prev) => prev.map((item, i) => i === idx ? { ...item, label: e.target.value } : item))}
                                placeholder="Type your question here…"
                                className="text-sm font-light h-8"
                              />

                              {/* Options (for multiple_choice / checkboxes) */}
                              {(q.type === "multiple_choice" || q.type === "checkboxes") && (
                                <div className="flex flex-col gap-2 pl-1">
                                  <p className="text-[10px] tracking-wider uppercase text-muted-foreground">Options</p>
                                  {q.options.map((opt, optIdx) => (
                                    <div key={optIdx} className="flex items-center gap-2">
                                      <Input
                                        value={opt}
                                        onChange={(e) => {
                                          const updated = [...q.options];
                                          updated[optIdx] = e.target.value;
                                          setBriefingQuestions((prev) => prev.map((item, i) => i === idx ? { ...item, options: updated } : item));
                                        }}
                                        placeholder={`Option ${optIdx + 1}`}
                                        className="h-7 text-xs font-light flex-1"
                                      />
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => {
                                          const updated = q.options.filter((_, oi) => oi !== optIdx);
                                          setBriefingQuestions((prev) => prev.map((item, i) => i === idx ? { ...item, options: updated } : item));
                                        }}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    className="text-[10px] tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors w-fit flex items-center gap-1 mt-0.5"
                                    onClick={() => setBriefingQuestions((prev) => prev.map((item, i) => i === idx ? { ...item, options: [...item.options, ""] } : item))}
                                  >
                                    <Plus className="h-3 w-3" />
                                    Add option
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Footer actions */}
                        <div className="flex justify-end gap-2 pt-1 border-t border-border">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs tracking-wider uppercase font-light"
                            onClick={() => setBriefingDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={savingBriefing || !briefingName.trim()}
                            className="gap-1.5 text-xs tracking-wider uppercase font-light"
                            onClick={async () => {
                              if (!user || !briefingName.trim()) return;
                              setSavingBriefing(true);
                              const payload = {
                                name: briefingName.trim(),
                                questions: briefingQuestions,
                                updated_at: new Date().toISOString(),
                              };
                              if (editingBriefing) {
                                await (supabase as any).from("briefings").update(payload).eq("id", editingBriefing.id);
                              } else {
                                await (supabase as any).from("briefings").insert({ ...payload, photographer_id: user.id });
                              }
                              await fetchBriefings();
                              setSavingBriefing(false);
                              setBriefingDialogOpen(false);
                              toast({ title: editingBriefing ? "Briefing updated" : "Briefing created" });
                            }}
                          >
                            {savingBriefing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Save briefing
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>


                  {/* ── BUSINESS TAB ── */}
                  <TabsContent value="business" className="mt-0 flex flex-col gap-8">
                    <section className="flex flex-col gap-5">
                      <SectionHeading
                        title="Business Information"
                        description="Details used on invoices, contracts, and client-facing documents."
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FieldRow label="Business Name">
                          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Acme Photography LLC" className="h-9 text-sm font-light" />
                        </FieldRow>
                        <FieldRow label="Phone">
                          <Input value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="h-9 text-sm font-light" />
                        </FieldRow>
                      </div>
                      <FieldRow label="Street Address">
                        <Input value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="123 Main St, Suite 4" className="h-9 text-sm font-light" />
                      </FieldRow>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FieldRow label="City">
                          <Input value={businessCity} onChange={(e) => setBusinessCity(e.target.value)} placeholder="New York" className="h-9 text-sm font-light" />
                        </FieldRow>
                        <FieldRow label="Country">
                          <Input value={businessCountry} onChange={(e) => setBusinessCountry(e.target.value)} placeholder="United States" className="h-9 text-sm font-light" />
                        </FieldRow>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FieldRow label="Currency">
                          <select
                            value={businessCurrency}
                            onChange={(e) => setBusinessCurrency(e.target.value)}
                            className="h-9 px-3 text-sm font-light bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {[
                              { code: "USD", label: "USD — US Dollar" },
                              { code: "EUR", label: "EUR — Euro" },
                              { code: "GBP", label: "GBP — British Pound" },
                              { code: "CAD", label: "CAD — Canadian Dollar" },
                              { code: "AUD", label: "AUD — Australian Dollar" },
                              { code: "BRL", label: "BRL — Brazilian Real" },
                              { code: "MXN", label: "MXN — Mexican Peso" },
                            ].map((c) => (
                              <option key={c.code} value={c.code}>{c.label}</option>
                            ))}
                          </select>
                        </FieldRow>
                        <FieldRow label="Tax ID / VAT Number">
                          <Input value={businessTaxId} onChange={(e) => setBusinessTaxId(e.target.value)} placeholder="e.g. 12-3456789" className="h-9 text-sm font-light" />
                        </FieldRow>
                      </div>
                    </section>
                    <Button onClick={handleSaveBusiness} disabled={savingBusiness} size="sm" className="gap-2 text-xs tracking-wider uppercase font-light w-fit">
                      {savingBusiness ? "Saving…" : "Save changes"}
                    </Button>
                  </TabsContent>



                  {/* ── GALLERIES TAB ── */}
                  <TabsContent value="galleries" className="mt-0 flex flex-col gap-8">
                    <section className="flex flex-col gap-5">
                      <SectionHeading title="Default Expiration" description="Galleries without a specific expiry will automatically expire after this many days. Leave blank to disable." />
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-border bg-background overflow-hidden w-40">
                          <input type="number" min="1" max="3650" value={galleryExpiryDays} onChange={(e) => setGalleryExpiryDays(e.target.value)} placeholder="e.g. 90"
                            className="flex-1 h-9 px-3 text-sm font-light bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50" />
                          <span className="px-3 h-9 flex items-center text-xs text-muted-foreground bg-muted/40 border-l border-border shrink-0 select-none">days</span>
                        </div>
                        <Button onClick={handleSaveExpiry} disabled={savingExpiry} size="sm" className="gap-2 text-xs tracking-wider uppercase font-light">
                          {savingExpiry ? "Saving…" : "Save"}
                        </Button>
                      </div>
                      {galleryExpiryDays && parseInt(galleryExpiryDays) > 0 && (
                        <p className="text-[11px] text-muted-foreground/70 -mt-2">New galleries without a set expiry will expire <strong>{galleryExpiryDays} days</strong> after creation.</p>
                      )}
                    </section>

                    <Divider />

                    <section className="flex flex-col gap-5">
                      <SectionHeading title="Reactivation Fee" description="Amount charged to reactivate access to an expired gallery. Leave blank to allow free reactivation." />
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-border bg-background overflow-hidden w-40">
                          <span className="pl-3 h-9 flex items-center text-xs text-muted-foreground bg-muted/40 border-r border-border shrink-0 select-none">$</span>
                          <input type="number" min="0" step="0.01" value={galleryReactivationFee} onChange={(e) => setGalleryReactivationFee(e.target.value)} placeholder="0.00"
                            className="flex-1 h-9 px-3 text-sm font-light bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50" />
                        </div>
                        <Button onClick={handleSaveReactivationFee} disabled={savingFee} size="sm" className="gap-2 text-xs tracking-wider uppercase font-light">
                          {savingFee ? "Saving…" : "Save"}
                        </Button>
                      </div>
                      {galleryReactivationFee && parseFloat(galleryReactivationFee) > 0 && (
                        <p className="text-[11px] text-muted-foreground/70 -mt-2">Clients will be charged <strong>${parseFloat(galleryReactivationFee).toFixed(2)}</strong> to reactivate an expired gallery.</p>
                      )}
                    </section>

                    <Divider />

                    {/* Watermarks */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] tracking-[0.25em] uppercase font-light mb-0.5">Watermarks</p>
                        <p className="text-[11px] text-muted-foreground">Create text or image watermarks to apply to Proof galleries.</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => { setEditingWatermark(undefined); setWatermarkEditorOpen(true); }}
                        className="gap-1.5 text-[10px] tracking-widest uppercase font-light rounded-none shrink-0">
                        <Plus className="h-3.5 w-3.5" />New watermark
                      </Button>
                    </div>
                    {watermarks.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground/60 border border-dashed border-border px-3 py-6 text-center">
                        No watermarks yet — click "New watermark" to create one.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {watermarks.map((wm) => (
                          <div key={wm.id} className="border border-border flex items-center px-4 py-3 gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-light truncate">{wm.name}</p>
                              <div className="flex items-center gap-3 mt-0.5">
                                {wm.text_enabled && wm.text_content && (
                                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Type className="h-2.5 w-2.5" />{wm.text_content}</span>
                                )}
                                {wm.image_enabled && wm.image_url && (
                                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Image className="h-2.5 w-2.5" />Image</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button type="button" onClick={() => { setEditingWatermark(wm); setWatermarkEditorOpen(true); }} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" disabled={deletingId === wm.id} onClick={() => wm.id && handleWatermarkDelete(wm.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                                {deletingId === wm.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <Divider />

                    {/* Lightroom Plugin */}
                    <section className="flex flex-col gap-5">
                      <SectionHeading
                        title="Lightroom Plugin"
                        description="Publish photos directly from Lightroom Classic to your galleries using the Davions plugin."
                      />
                      <div className="flex items-start gap-4 p-5 border border-border bg-card">
                        <Download className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-2">
                          <div className="space-y-0.5">
                            <p className="text-sm font-light">DavionsConnect-1.0.lrplugin</p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              Compatible with Lightroom Classic 9 (2019) and later. macOS and Windows.
                            </p>
                          </div>
                          <a
                            href="/downloads/DavionsConnect-1.0.lrplugin.zip"
                            download="DavionsConnect-1.0.lrplugin.zip"
                            className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-background hover:bg-accent text-[11px] font-light tracking-wide transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download Plugin (.zip)
                          </a>
                        </div>
                      </div>
                      <div className="space-y-px">
                        {[
                          { n: "01", title: "Download and unzip the plugin", desc: "Click the download button above to get the latest DavionsConnect package. Unzip it to a permanent folder — do not move it after installation." },
                          { n: "02", title: "Open the Plug-in Manager in Lightroom Classic", desc: 'Go to File → Plug-in Manager (or press Ctrl/⌘ + Alt + Shift + ,). Click "Add" and navigate to the unzipped .lrplugin folder.' },
                          { n: "03", title: "Sign in with your Davions account", desc: "In the plugin settings panel, enter the same email and password you use to log in to Davions. This authenticates the plugin with your account." },
                          { n: "04", title: "Create a Publish Service collection", desc: 'In the Library module, go to Publish Services and click "Set Up" next to Davions. Create a collection for each gallery you want to sync.' },
                        ].map((step) => (
                          <div key={step.n} className="flex gap-4 p-4 border border-border bg-card">
                            <span className="text-xl font-light text-muted-foreground/30 shrink-0 w-7 text-right leading-none mt-0.5">{step.n}</span>
                            <div className="space-y-0.5">
                              <p className="text-[12px] font-light">{step.title}</p>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">{step.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </TabsContent>

                </Tabs>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Watermark Editor Dialog */}
      <Dialog open={watermarkEditorOpen} onOpenChange={(open) => { setWatermarkEditorOpen(open); if (!open) setEditingWatermark(undefined); }}>
        <DialogContent className="max-w-4xl w-full p-0 rounded-none border-border overflow-hidden" style={{ height: "90vh", maxHeight: "780px" }}>
          <DialogHeader className="px-5 py-3 border-b border-border shrink-0">
            <DialogTitle className="text-sm font-light tracking-wide">{editingWatermark ? "Edit Watermark" : "New Watermark"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden" style={{ height: "calc(100% - 57px)" }}>
            <WatermarkEditor
              initial={editingWatermark}
              onSaved={handleWatermarkSaved}
              onCancel={() => { setWatermarkEditorOpen(false); setEditingWatermark(undefined); }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default Personalize;
