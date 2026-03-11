import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  Check, Copy, Upload, Loader2, X, Globe, ExternalLink, AlertCircle,
  Instagram, Youtube, Linkedin, Facebook, BarChart2, Palette,
  Layout, FileText, Link2, Phone, Image,
} from "lucide-react";

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

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <p className="text-[11px] tracking-[0.25em] uppercase font-light mb-0.5">{title}</p>
      {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border" />;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] tracking-wider uppercase font-light">{label}</Label>
      {children}
    </div>
  );
}

const WebsiteSettings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

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
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [uploadingHero, setUploadingHero] = useState(false);

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

  // Custom Domain
  const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
  const [customDomain, setCustomDomain] = useState("");
  const [customDomainInput, setCustomDomainInput] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);
  const [domainCopied, setDomainCopied] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);

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
      if (error.code === "23505") setSlugError("This URL is already taken.");
      else toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      setStoreSlug(slugInput);
      toast({ title: "Store URL saved" });
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
      if (error.message.includes("custom_domain")) setDomainError("This domain is already linked to another account.");
      else toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      setCustomDomain(customDomainInput.trim());
      toast({ title: "Custom domain saved" });
    }
    setSavingDomain(false);
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const aboutInputRef = useRef<HTMLInputElement>(null);
  const ogInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [profileRes, siteRes] = await Promise.all([
        supabase.from("photographers")
          .select("full_name, bio, hero_image_url, custom_domain, store_slug")
          .eq("id", user.id).single(),
        (supabase as any).from("photographer_site")
          .select("*").eq("photographer_id", user.id).maybeSingle(),
      ]);

      if (profileRes.data) {
        const d = profileRes.data;
        setFullName((d as any).full_name ?? "");
        setBio((d as any).bio ?? "");
        setHeroImageUrl((d as any).hero_image_url ?? "");
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

      setLoading(false);
    };
    fetchAll();
  }, [user]);

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
      toast({ title: "Website settings saved", description: "Your website configuration has been updated." });
    }
    setSaving(false);
  };

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
                  Marketing
                </p>
                <h1 className="text-2xl font-light tracking-wide">Website</h1>
              </div>

              {loading ? (
                <p className="text-xs text-muted-foreground animate-pulse tracking-widest uppercase">Loading…</p>
              ) : (
                <div className="flex flex-col gap-10">

                  {/* ── 1. Branding ── */}
                  <section className="flex flex-col gap-5">
                    <div className="flex items-center gap-2">
                      <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                      <SectionHeading title="Branding" description="Visual identity for your public website." />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label className="text-[11px] tracking-wider uppercase font-light">Logo</Label>
                      <div className="flex items-center gap-4">
                        {logoUrl ? (
                          <div className="relative h-14 w-32 border border-border bg-muted/20 flex items-center justify-center overflow-hidden">
                            <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                            <button
                              onClick={() => setLogoUrl("")}
                              className="absolute top-1 right-1 bg-background/80 border border-border rounded-full p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => logoInputRef.current?.click()}
                            className="h-14 w-32 border border-dashed border-border bg-muted/10 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-foreground/30 transition-colors"
                          >
                            {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Upload className="h-4 w-4 text-muted-foreground/50" />}
                            <span className="text-[9px] tracking-widest uppercase text-muted-foreground/50">Upload</span>
                          </div>
                        )}
                        <div className="flex flex-col gap-1">
                          <button onClick={() => logoInputRef.current?.click()} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors text-left">
                            {logoUrl ? "Replace logo" : "Upload logo (PNG, SVG)"}
                          </button>
                          <p className="text-[10px] text-muted-foreground/60">Recommended: transparent PNG or SVG, at least 400px wide.</p>
                        </div>
                      </div>
                      <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "logo", "site-assets", setLogoUrl, setUploadingLogo, "Logo"); }} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FieldRow label="Tagline">
                        <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Capturing life's finest moments" className="h-9 text-sm font-light" />
                      </FieldRow>
                      <FieldRow label="Brand Color">
                        <div className="flex items-center gap-2 h-9 border border-input px-3 bg-background">
                          <input
                            type="color"
                            value={accentColor}
                            onChange={(e) => setAccentColor(e.target.value)}
                            className="h-5 w-5 cursor-pointer border-none bg-transparent p-0"
                          />
                          <span className="text-sm font-mono text-foreground/80 font-light">{accentColor}</span>
                        </div>
                      </FieldRow>
                    </div>
                  </section>

                  <Divider />

                  {/* ── 2. Hero Section ── */}
                  <section className="flex flex-col gap-5">
                    <div className="flex items-center gap-2">
                      <Image className="h-3.5 w-3.5 text-muted-foreground" />
                      <SectionHeading title="Hero Section" description="The full-screen banner shown at the top of your site." />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label className="text-[11px] tracking-wider uppercase font-light">Cover Image</Label>
                      {heroImageUrl ? (
                        <div className="relative w-full h-36 border border-border overflow-hidden bg-muted/10">
                          <img src={heroImageUrl} alt="Hero" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          <button onClick={() => setHeroImageUrl("")} className="absolute top-2 right-2 bg-background/80 border border-border rounded-full p-1 text-muted-foreground hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                          <button onClick={() => heroInputRef.current?.click()} className="absolute bottom-2 right-2 flex items-center gap-1.5 text-[10px] tracking-widest uppercase bg-background/80 border border-border px-2.5 py-1.5 text-foreground hover:bg-background transition-colors">
                            <Upload className="h-3 w-3" />Replace
                          </button>
                        </div>
                      ) : (
                        <div onClick={() => heroInputRef.current?.click()} className="w-full h-24 border border-dashed border-border bg-muted/10 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-foreground/30 transition-colors">
                          {uploadingHero ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Upload className="h-5 w-5 text-muted-foreground/40" />}
                          <span className="text-[10px] tracking-widest uppercase text-muted-foreground/50">Upload hero image</span>
                        </div>
                      )}
                      <input ref={heroInputRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "hero", "session-covers", setHeroImageUrl, setUploadingHero, "Hero image"); }} />
                    </div>

                    <FieldRow label="Headline">
                      <Input value={siteHeadline} onChange={(e) => setSiteHeadline(e.target.value)} placeholder="Photography that tells your story" className="h-9 text-sm font-light" />
                    </FieldRow>
                    <FieldRow label="Sub-headline">
                      <Input value={siteSubheadline} onChange={(e) => setSiteSubheadline(e.target.value)} placeholder="Based in New York · Available worldwide" className="h-9 text-sm font-light" />
                    </FieldRow>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FieldRow label="CTA Button Text">
                        <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Book a Session" className="h-9 text-sm font-light" />
                      </FieldRow>
                      <FieldRow label="CTA Link (optional)">
                        <Input value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} placeholder="/store/your-studio or external URL" className="h-9 text-sm font-light" />
                      </FieldRow>
                    </div>
                  </section>

                  <Divider />

                  {/* ── 3. About Section ── */}
                  <section className="flex flex-col gap-5">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <SectionHeading title="About Section" description="Introduce yourself to potential clients." />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FieldRow label="Full Name">
                        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" className="h-9 text-sm font-light" />
                      </FieldRow>
                      <FieldRow label="Section Title">
                        <Input value={aboutTitle} onChange={(e) => setAboutTitle(e.target.value)} placeholder="About" className="h-9 text-sm font-light" />
                      </FieldRow>
                    </div>

                    <FieldRow label="Bio / About text">
                      <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell your story — background, style, what makes your work unique…" className="min-h-[100px] text-sm font-light resize-none" />
                    </FieldRow>

                    <div className="flex flex-col gap-2">
                      <Label className="text-[11px] tracking-wider uppercase font-light">Profile / About Photo</Label>
                      <div className="flex items-center gap-4">
                        {aboutImageUrl ? (
                          <div className="relative h-20 w-20 border border-border overflow-hidden rounded-sm bg-muted/10">
                            <img src={aboutImageUrl} alt="About" className="w-full h-full object-cover" />
                            <button onClick={() => setAboutImageUrl("")} className="absolute top-1 right-1 bg-background/80 border border-border rounded-full p-0.5 text-muted-foreground hover:text-destructive">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ) : (
                          <div onClick={() => aboutInputRef.current?.click()} className="h-20 w-20 border border-dashed border-border bg-muted/10 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-foreground/30 transition-colors rounded-sm">
                            {uploadingAbout ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Upload className="h-4 w-4 text-muted-foreground/40" />}
                          </div>
                        )}
                        <button onClick={() => aboutInputRef.current?.click()} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                          {aboutImageUrl ? "Replace photo" : "Upload profile photo"}
                        </button>
                      </div>
                      <input ref={aboutInputRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "about", "site-assets", setAboutImageUrl, setUploadingAbout, "Profile photo"); }} />
                    </div>
                  </section>

                  <Divider />

                  {/* ── 4. Social Media ── */}
                  <section className="flex flex-col gap-5">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <SectionHeading title="Social Media" description="Links displayed in your site header and footer." />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FieldRow label="Instagram">
                        <div className="flex items-center border border-input overflow-hidden h-9 bg-background">
                          <span className="px-2.5 flex items-center bg-muted/40 border-r border-border h-full shrink-0"><Instagram className="h-3.5 w-3.5 text-muted-foreground" /></span>
                          <input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="instagram.com/yourstudio" className="flex-1 h-full px-3 text-sm font-light bg-transparent outline-none" />
                        </div>
                      </FieldRow>
                      <FieldRow label="Facebook">
                        <div className="flex items-center border border-input overflow-hidden h-9 bg-background">
                          <span className="px-2.5 flex items-center bg-muted/40 border-r border-border h-full shrink-0"><Facebook className="h-3.5 w-3.5 text-muted-foreground" /></span>
                          <input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="facebook.com/yourstudio" className="flex-1 h-full px-3 text-sm font-light bg-transparent outline-none" />
                        </div>
                      </FieldRow>
                      <FieldRow label="Pinterest">
                        <div className="flex items-center border border-input overflow-hidden h-9 bg-background">
                          <span className="px-2.5 flex items-center bg-muted/40 border-r border-border h-full shrink-0 text-[10px] tracking-widest text-muted-foreground font-light">P</span>
                          <input value={pinterestUrl} onChange={(e) => setPinterestUrl(e.target.value)} placeholder="pinterest.com/yourstudio" className="flex-1 h-full px-3 text-sm font-light bg-transparent outline-none" />
                        </div>
                      </FieldRow>
                      <FieldRow label="TikTok">
                        <div className="flex items-center border border-input overflow-hidden h-9 bg-background">
                          <span className="px-2.5 flex items-center bg-muted/40 border-r border-border h-full shrink-0 text-[10px] tracking-widest text-muted-foreground font-light">Tk</span>
                          <input value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="tiktok.com/@yourstudio" className="flex-1 h-full px-3 text-sm font-light bg-transparent outline-none" />
                        </div>
                      </FieldRow>
                      <FieldRow label="YouTube">
                        <div className="flex items-center border border-input overflow-hidden h-9 bg-background">
                          <span className="px-2.5 flex items-center bg-muted/40 border-r border-border h-full shrink-0"><Youtube className="h-3.5 w-3.5 text-muted-foreground" /></span>
                          <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="youtube.com/@yourstudio" className="flex-1 h-full px-3 text-sm font-light bg-transparent outline-none" />
                        </div>
                      </FieldRow>
                      <FieldRow label="LinkedIn">
                        <div className="flex items-center border border-input overflow-hidden h-9 bg-background">
                          <span className="px-2.5 flex items-center bg-muted/40 border-r border-border h-full shrink-0"><Linkedin className="h-3.5 w-3.5 text-muted-foreground" /></span>
                          <input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="linkedin.com/in/yourname" className="flex-1 h-full px-3 text-sm font-light bg-transparent outline-none" />
                        </div>
                      </FieldRow>
                      <FieldRow label="WhatsApp">
                        <div className="flex items-center border border-input overflow-hidden h-9 bg-background">
                          <span className="px-2.5 flex items-center bg-muted/40 border-r border-border h-full shrink-0"><Phone className="h-3.5 w-3.5 text-muted-foreground" /></span>
                          <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+1 555 000 0000" className="flex-1 h-full px-3 text-sm font-light bg-transparent outline-none" />
                        </div>
                      </FieldRow>
                    </div>
                  </section>

                  <Divider />

                  {/* ── 5. Navigation ── */}
                  <section className="flex flex-col gap-5">
                    <div className="flex items-center gap-2">
                      <Layout className="h-3.5 w-3.5 text-muted-foreground" />
                      <SectionHeading title="Navigation" description="Choose which sections appear in your site menu." />
                    </div>
                    <div className="flex flex-col gap-3">
                      {[
                        { label: "Store (Sessions)", desc: "List of bookable sessions.", value: showStore, set: setShowStore },
                        { label: "Booking", desc: "Direct booking CTA and calendar.", value: showBooking, set: setShowBooking },
                        { label: "About", desc: "Bio and profile section.", value: showAbout, set: setShowAbout },
                        { label: "Blog", desc: "Articles and behind-the-scenes posts.", value: showBlog, set: setShowBlog },
                        { label: "Contact", desc: "Contact form and social links.", value: showContact, set: setShowContact },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between gap-4 border border-border px-4 py-3">
                          <div>
                            <p className="text-sm font-light">{item.label}</p>
                            <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                          </div>
                          <Switch checked={item.value} onCheckedChange={item.set} />
                        </div>
                      ))}
                    </div>
                  </section>

                  <Divider />

                  {/* ── 6. Template ── */}
                  <section className="flex flex-col gap-5">
                    <SectionHeading title="Site Template" description="Choose the visual layout for your photographer website." />
                    <div className="grid grid-cols-2 gap-3">
                      {TEMPLATES.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setSiteTemplate(t.value)}
                          className={`flex flex-col gap-2 border p-4 text-left transition-colors ${
                            siteTemplate === t.value ? "border-foreground bg-foreground/[0.03]" : "border-border hover:border-foreground/30"
                          }`}
                        >
                          <div className={`w-full h-10 ${t.preview} flex items-end p-1 gap-0.5`}>
                            {t.value === "grid" && (
                              <>
                                <div className="flex-1 h-5 bg-foreground/20" />
                                <div className="flex-1 h-7 bg-foreground/30" />
                                <div className="flex-1 h-4 bg-foreground/20" />
                              </>
                            )}
                            {t.value === "magazine" && (
                              <div className="flex gap-0.5 w-full h-full">
                                <div className="flex-[2] bg-foreground/30" />
                                <div className="flex-1 flex flex-col gap-0.5">
                                  <div className="flex-1 bg-foreground/20" />
                                  <div className="flex-1 bg-foreground/15" />
                                </div>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-light tracking-wider uppercase flex items-center gap-1.5">
                              {siteTemplate === t.value && <Check className="h-3 w-3" />}
                              {t.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{t.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>

                  <Divider />

                  {/* ── 7. SEO ── */}
                  <section className="flex flex-col gap-5">
                    <SectionHeading title="SEO" description="Optimize how your site appears in search results and social shares." />
                    <FieldRow label="Page Title">
                      <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Jane Doe Photography — New York" className="h-9 text-sm font-light" />
                    </FieldRow>
                    <FieldRow label="Meta Description">
                      <Textarea
                        value={seoDescription}
                        onChange={(e) => setSeoDescription(e.target.value.slice(0, 160))}
                        placeholder="Professional photography studio based in New York…"
                        className="min-h-[72px] text-sm font-light resize-none"
                      />
                      <p className="text-[10px] text-muted-foreground/60 -mt-1">{seoDescription.length}/160 characters</p>
                    </FieldRow>
                    <div className="flex flex-col gap-2">
                      <Label className="text-[11px] tracking-wider uppercase font-light">Social Share Image (OG Image)</Label>
                      <p className="text-[11px] text-muted-foreground -mt-1">Shown when your site is shared on social media. Recommended 1200×630px.</p>
                      {ogImageUrl ? (
                        <div className="relative w-full h-24 border border-border overflow-hidden bg-muted/10">
                          <img src={ogImageUrl} alt="OG" className="w-full h-full object-cover" />
                          <button onClick={() => setOgImageUrl("")} className="absolute top-2 right-2 bg-background/80 border border-border rounded-full p-1 text-muted-foreground hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                          <button onClick={() => ogInputRef.current?.click()} className="absolute bottom-2 right-2 flex items-center gap-1.5 text-[10px] tracking-widest uppercase bg-background/80 border border-border px-2.5 py-1.5 text-foreground hover:bg-background transition-colors">
                            <Upload className="h-3 w-3" />Replace
                          </button>
                        </div>
                      ) : (
                        <div onClick={() => ogInputRef.current?.click()} className="w-full h-16 border border-dashed border-border bg-muted/10 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-foreground/30 transition-colors">
                          {uploadingOg ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Upload className="h-4 w-4 text-muted-foreground/40" />}
                          <span className="text-[10px] tracking-widest uppercase text-muted-foreground/50">Upload OG image (1200×630)</span>
                        </div>
                      )}
                      <input ref={ogInputRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "og", "site-assets", setOgImageUrl, setUploadingOg, "OG image"); }} />
                    </div>
                  </section>

                  <Divider />

                  {/* ── 8. Analytics ── */}
                  <section className="flex flex-col gap-5">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <SectionHeading title="Analytics & Tracking" description="Connect tracking tools to measure traffic and conversions." />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FieldRow label="Google Analytics ID">
                        <Input value={googleAnalyticsId} onChange={(e) => setGoogleAnalyticsId(e.target.value)} placeholder="G-XXXXXXXXXX" className="h-9 text-sm font-mono font-light" />
                      </FieldRow>
                      <FieldRow label="Facebook Pixel ID">
                        <Input value={facebookPixelId} onChange={(e) => setFacebookPixelId(e.target.value)} placeholder="123456789012345" className="h-9 text-sm font-mono font-light" />
                      </FieldRow>
                    </div>
                  </section>

                  <Divider />

                   {/* ── 9. Footer ── */}
                  <section className="flex flex-col gap-5">
                    <SectionHeading title="Footer" description="Custom text shown at the bottom of every page." />
                    <FieldRow label="Footer Text">
                      <Input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="© 2025 Jane Doe Photography · All rights reserved" className="h-9 text-sm font-light" />
                    </FieldRow>
                  </section>

                  <Divider />

                  {/* ── 10. Custom Domain ── */}
                  <section className="flex flex-col gap-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        <SectionHeading title="Custom Domain" description="Point your own domain (e.g. booking.yourstudio.com) to your site." />
                      </div>
                      <a
                        href="/dashboard/custom-domain-docs"
                        className="shrink-0 flex items-center gap-1 text-[10px] tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Setup guide
                      </a>
                    </div>
                    <FieldRow label="Domain">
                      <Input
                        value={customDomainInput}
                        onChange={(e) => { setCustomDomainInput(e.target.value.toLowerCase().trim()); setDomainError(null); }}
                        placeholder="booking.yourstudio.com"
                        className="h-9 text-sm font-light font-mono"
                      />
                      {domainError && (
                        <p className="flex items-center gap-1 text-[11px] text-destructive mt-1">
                          <AlertCircle className="h-3 w-3" />{domainError}
                        </p>
                      )}
                    </FieldRow>
                    {customDomain && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <p className="text-[11px] text-muted-foreground font-mono truncate flex-1">{customDomain}</p>
                        <button
                          type="button"
                          onClick={() => copyUrl(`https://${customDomain}`, setDomainCopied)}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                          title="Copy domain URL"
                        >
                          {domainCopied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    )}
                    <Button
                      onClick={handleSaveDomain}
                      disabled={savingDomain}
                      size="sm"
                      variant="outline"
                      className="gap-2 text-xs tracking-wider uppercase font-light w-fit"
                    >
                      {savingDomain ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</> : "Save domain"}
                    </Button>
                  </section>

                  {/* ── Save ── */}
                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <Button onClick={handleSave} disabled={saving} className="gap-2 text-xs tracking-wider uppercase font-light">
                      {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</> : "Save website settings"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground/60">Saves branding, hero, about, social, navigation, template, SEO, analytics & footer.</p>
                  </div>

                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default WebsiteSettings;
