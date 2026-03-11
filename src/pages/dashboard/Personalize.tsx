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
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Check, Copy, AlertCircle, Store, Globe, ExternalLink,
  Upload, Loader2, X, Plus, Pencil, Trash2, Type, Image,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WatermarkEditor, WatermarkData } from "@/components/dashboard/WatermarkEditor";
import SessionTypeManager, { SessionType } from "@/components/dashboard/SessionTypeManager";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

const Personalize = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  // Profile (needed for Store tab)
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [customDomainInput, setCustomDomainInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [domainCopied, setDomainCopied] = useState(false);

  // Watermarks
  const [watermarks, setWatermarks] = useState<WatermarkData[]>([]);
  const [watermarkEditorOpen, setWatermarkEditorOpen] = useState(false);
  const [editingWatermark, setEditingWatermark] = useState<WatermarkData | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Session Types (Studio tab)
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

  // Gallery settings
  const [galleryExpiryDays, setGalleryExpiryDays] = useState<string>("");
  const [savingGallerySettings, setSavingGallerySettings] = useState(false);

  // Business tab
  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessCity, setBusinessCity] = useState("");
  const [businessCountry, setBusinessCountry] = useState("");
  const [businessCurrency, setBusinessCurrency] = useState("USD");
  const [businessTaxId, setBusinessTaxId] = useState("");
  const [savingBusiness, setSavingBusiness] = useState(false);

  const heroInputRef = useRef<HTMLInputElement>(null);

  const fetchSessionTypes = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("session_types")
      .select("id, name")
      .eq("photographer_id", user.id)
      .order("created_at", { ascending: true });
    if (data) setSessionTypes(data as SessionType[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [profileRes, watermarksRes, gallerySettingsRes, businessRes] = await Promise.all([
        supabase
          .from("photographers")
          .select("full_name, store_slug, custom_domain, bio, hero_image_url")
          .eq("id", user.id)
          .single(),
        (supabase as any)
          .from("watermarks")
          .select("*")
          .eq("photographer_id", user.id)
          .order("created_at", { ascending: true }),
        (supabase as any)
          .from("gallery_settings")
          .select("key, value")
          .eq("photographer_id", user.id),
        (supabase as any)
          .from("photographers")
          .select("business_name, business_phone, business_address, business_city, business_country, business_currency, business_tax_id")
          .eq("id", user.id)
          .single(),
        fetchSessionTypes(),
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

      if (watermarksRes.data) {
        setWatermarks(watermarksRes.data as WatermarkData[]);
      }

      if (gallerySettingsRes?.data) {
        const expiryRow = gallerySettingsRes.data.find((r: any) => r.key === "default_expiry_days");
        if (expiryRow) setGalleryExpiryDays(expiryRow.value ?? "");
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
  }, [user, fetchSessionTypes]);

  const validateSlug = (value: string) => {
    if (!value.trim()) return "Store URL is required.";
    if (value.length < 3) return "Must be at least 3 characters.";
    if (value.length > 48) return "Must be 48 characters or less.";
    if (!SLUG_REGEX.test(value))
      return "Only lowercase letters, numbers and hyphens (no leading/trailing hyphens).";
    return null;
  };

  const validateDomain = (value: string) => {
    if (!value.trim()) return null;
    const v = value.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!DOMAIN_REGEX.test(v))
      return "Enter a valid domain (e.g. booking.yourstudio.com).";
    return null;
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/\s+/g, "-");
    setSlugInput(val);
    setSlugError(validateSlug(val));
  };

  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
    setCustomDomainInput(val);
    setDomainError(validateDomain(val));
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/hero.${ext}`;
    const { error: upErr } = await supabase.storage.from("session-covers").upload(path, file, { upsert: true });
    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      setUploadingHero(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("session-covers").getPublicUrl(path);
    setHeroImageUrl(urlData.publicUrl + `?t=${Date.now()}`);
    setUploadingHero(false);
    toast({ title: "Hero image uploaded" });
  };

  const handleSaveStore = async () => {
    const slugErr = validateSlug(slugInput);
    const domErr = validateDomain(customDomainInput);
    if (slugErr) { setSlugError(slugErr); return; }
    if (domErr) { setDomainError(domErr); return; }

    setSaving(true);
    const { error } = await supabase.from("photographers").update({
      full_name: fullName,
      store_slug: slugInput,
      custom_domain: customDomainInput.trim() || null,
      bio: bio.trim() || null,
      hero_image_url: heroImageUrl.trim() || null,
    } as any).eq("id", user!.id);

    if (error) {
      if (error.code === "23505") {
        if (error.message.includes("store_slug")) setSlugError("This URL is already taken. Please choose another.");
        else if (error.message.includes("custom_domain")) setDomainError("This domain is already linked to another account.");
        else toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      }
    } else {
      setStoreSlug(slugInput);
      setCustomDomain(customDomainInput.trim());
      toast({ title: "Settings saved", description: "Your store settings have been updated." });
    }
    setSaving(false);
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

  const handleSaveGallerySettings = async () => {
    if (!user) return;
    setSavingGallerySettings(true);
    const days = parseInt(galleryExpiryDays, 10);
    const valueToSave = (!galleryExpiryDays.trim() || isNaN(days) || days <= 0) ? null : String(days);
    const { error } = await (supabase as any)
      .from("gallery_settings")
      .upsert(
        { photographer_id: user.id, key: "default_expiry_days", value: valueToSave },
        { onConflict: "photographer_id,key" }
      );
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Gallery settings saved" });
    }
    setSavingGallerySettings(false);
  };

  const storeUrl = slugInput ? `${window.location.origin}/store/${slugInput}` : null;
  const copyUrl = async (url: string, setCopiedFn: (v: boolean) => void) => {
    await navigator.clipboard.writeText(url);
    setCopiedFn(true);
    setTimeout(() => setCopiedFn(false), 2000);
  };
  const appHost = window.location.host;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />

        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />

          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="max-w-2xl flex flex-col gap-8">
              {/* Page title */}
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
                      { value: "store", label: "Store" },
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
                      <div>
                        <p className="text-[11px] tracking-[0.25em] uppercase font-light mb-0.5">Session Types</p>
                        <p className="text-[11px] text-muted-foreground">
                          Categorize your sessions by type (e.g. Newborn, Wedding, Portrait). Types can be assigned when creating sessions.
                        </p>
                      </div>

                      {user && (
                        <SessionTypeManager
                          photographerId={user.id}
                          sessionTypes={sessionTypes}
                          selectedTypeId={selectedTypeId}
                          onSelect={setSelectedTypeId}
                          onRefetch={fetchSessionTypes}
                        />
                      )}
                    </section>
                  </TabsContent>

                  {/* ── BUSINESS TAB ── */}
                  <TabsContent value="business" className="mt-0 flex flex-col gap-8">
                    <section className="flex flex-col gap-5">
                      <div>
                        <p className="text-[11px] tracking-[0.25em] uppercase font-light mb-0.5">Business Information</p>
                        <p className="text-[11px] text-muted-foreground">
                          Details used on invoices, contracts, and client-facing documents.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-[11px] tracking-wider uppercase font-light">Business Name</Label>
                          <Input
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            placeholder="Acme Photography LLC"
                            className="h-9 text-sm font-light"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-[11px] tracking-wider uppercase font-light">Phone</Label>
                          <Input
                            value={businessPhone}
                            onChange={(e) => setBusinessPhone(e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            className="h-9 text-sm font-light"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[11px] tracking-wider uppercase font-light">Street Address</Label>
                        <Input
                          value={businessAddress}
                          onChange={(e) => setBusinessAddress(e.target.value)}
                          placeholder="123 Main St, Suite 4"
                          className="h-9 text-sm font-light"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-[11px] tracking-wider uppercase font-light">City</Label>
                          <Input
                            value={businessCity}
                            onChange={(e) => setBusinessCity(e.target.value)}
                            placeholder="New York"
                            className="h-9 text-sm font-light"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-[11px] tracking-wider uppercase font-light">Country</Label>
                          <Input
                            value={businessCountry}
                            onChange={(e) => setBusinessCountry(e.target.value)}
                            placeholder="United States"
                            className="h-9 text-sm font-light"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-[11px] tracking-wider uppercase font-light">Currency</Label>
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
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-[11px] tracking-wider uppercase font-light">Tax ID / VAT Number</Label>
                          <Input
                            value={businessTaxId}
                            onChange={(e) => setBusinessTaxId(e.target.value)}
                            placeholder="e.g. 12-3456789"
                            className="h-9 text-sm font-light"
                          />
                        </div>
                      </div>
                    </section>

                    <div>
                      <Button
                        onClick={handleSaveBusiness}
                        disabled={savingBusiness}
                        size="sm"
                        className="gap-2 text-xs tracking-wider uppercase font-light"
                      >
                        {savingBusiness ? "Saving…" : "Save changes"}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* ── STORE TAB ── */}
                  <TabsContent value="store" className="mt-0 flex flex-col gap-8">
                    {/* Store URL */}
                    <section className="flex flex-col gap-5">
                      <div>
                        <p className="text-[11px] tracking-[0.25em] uppercase font-light mb-0.5">Store URL</p>
                        <p className="text-[11px] text-muted-foreground">
                          Your unique public booking page. Share it with clients so they can browse and book sessions.
                        </p>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className={`flex items-center border ${slugError ? "border-destructive" : "border-border"} bg-background overflow-hidden`}>
                          <span className="px-3 h-9 flex items-center text-xs text-muted-foreground bg-muted/40 border-r border-border shrink-0 select-none whitespace-nowrap">
                            {appHost}/store/
                          </span>
                          <input
                            value={slugInput}
                            onChange={handleSlugChange}
                            placeholder="your-studio"
                            className="flex-1 h-9 px-3 text-sm font-light bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
                          />
                        </div>
                        {slugError && (
                          <p className="flex items-center gap-1.5 text-[11px] text-destructive">
                            <AlertCircle className="h-3 w-3 shrink-0" />{slugError}
                          </p>
                        )}
                      </div>

                      {storeUrl && !slugError && (
                        <div className="flex items-center gap-2 p-3 bg-muted/30 border border-border">
                          <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-[11px] text-muted-foreground flex-1 truncate">{storeUrl}</span>
                          <button
                            onClick={() => copyUrl(storeUrl, setCopied)}
                            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            title="Copy store URL"
                          >
                            {copied ? <Check className="h-3.5 w-3.5 text-foreground" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )}

                      {!storeSlug && (
                        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground border border-border px-2 py-1.5">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          Set your store URL to enable Preview and Share on session cards.
                        </p>
                      )}
                    </section>

                    {/* Custom Domain */}
                    <section className="flex flex-col gap-5">
                      <div>
                        <p className="text-[11px] tracking-[0.25em] uppercase font-light flex items-center gap-1.5 mb-0.5">
                          <Globe className="h-3 w-3" />Custom Domain
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Point your own domain (e.g. <span className="font-mono">booking.yourstudio.com</span>) directly to your booking store.
                        </p>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className={`flex items-center border ${domainError ? "border-destructive" : "border-border"} bg-background overflow-hidden`}>
                          <span className="px-3 h-9 flex items-center text-xs text-muted-foreground bg-muted/40 border-r border-border shrink-0 select-none">
                            https://
                          </span>
                          <input
                            value={customDomainInput}
                            onChange={handleDomainChange}
                            placeholder="booking.yourstudio.com"
                            className="flex-1 h-9 px-3 text-sm font-light bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
                          />
                        </div>
                        {domainError && (
                          <p className="flex items-center gap-1.5 text-[11px] text-destructive">
                            <AlertCircle className="h-3 w-3 shrink-0" />{domainError}
                          </p>
                        )}
                        {customDomain && !domainError && (
                          <div className="flex items-center gap-2 p-3 bg-muted/30 border border-border">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-[11px] text-muted-foreground flex-1 truncate font-mono">https://{customDomain}</span>
                            <button
                              onClick={() => copyUrl(`https://${customDomain}`, setDomainCopied)}
                              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            >
                              {domainCopied ? <Check className="h-3.5 w-3.5 text-foreground" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="border border-border p-4 flex flex-col gap-4">
                        <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">DNS Configuration</p>
                        <p className="text-[11px] text-muted-foreground">
                          At your domain registrar, add the following DNS record pointing to this platform:
                        </p>
                        <div className="flex flex-col gap-1.5">
                          <div className="grid grid-cols-3 gap-2 text-[10px] tracking-wider uppercase text-muted-foreground/60 px-2">
                            <span>Type</span><span>Name</span><span>Value</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 bg-muted/40 border border-border p-2 font-mono text-[11px]">
                            <span className="text-foreground">CNAME</span>
                            <span className="text-muted-foreground">booking</span>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-foreground truncate">{appHost}</span>
                              <button
                                onClick={() => copyUrl(appHost, () => {})}
                                className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground/60">
                          DNS changes can take up to 48 hours to propagate worldwide.
                        </p>
                        <a
                          href="/dashboard/custom-domain-docs"
                          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-fit"
                        >
                          <ExternalLink className="h-3 w-3" />Custom domain documentation
                        </a>
                      </div>
                    </section>

                    <div>
                      <Button
                        onClick={handleSaveStore}
                        disabled={saving || !!slugError || !!domainError}
                        size="sm"
                        className="gap-2 text-xs tracking-wider uppercase font-light"
                      >
                        {saving ? "Saving…" : "Save changes"}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* ── GALLERIES TAB ── */}
                  <TabsContent value="galleries" className="mt-0 flex flex-col gap-8">

                    {/* Default Expiry */}
                    <section className="flex flex-col gap-5">
                      <div>
                        <p className="text-[11px] tracking-[0.25em] uppercase font-light mb-0.5">Default Expiration</p>
                        <p className="text-[11px] text-muted-foreground">
                          Galleries created without a specific expiry date will automatically expire after this many days. Leave blank to disable automatic expiration.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-border bg-background overflow-hidden w-40">
                          <input
                            type="number"
                            min="1"
                            max="3650"
                            value={galleryExpiryDays}
                            onChange={(e) => setGalleryExpiryDays(e.target.value)}
                            placeholder="e.g. 90"
                            className="flex-1 h-9 px-3 text-sm font-light bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
                          />
                          <span className="px-3 h-9 flex items-center text-xs text-muted-foreground bg-muted/40 border-l border-border shrink-0 select-none">days</span>
                        </div>
                        <Button
                          onClick={handleSaveGallerySettings}
                          disabled={savingGallerySettings}
                          size="sm"
                          className="gap-2 text-xs tracking-wider uppercase font-light"
                        >
                          {savingGallerySettings ? "Saving…" : "Save"}
                        </Button>
                      </div>
                      {galleryExpiryDays && parseInt(galleryExpiryDays) > 0 && (
                        <p className="text-[11px] text-muted-foreground/70 -mt-2">
                          New galleries without a set expiry will expire <strong>{galleryExpiryDays} days</strong> after creation.
                        </p>
                      )}
                    </section>

                    <div className="border-t border-border" />

                    {/* Watermarks */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] tracking-[0.25em] uppercase font-light mb-0.5">Watermarks</p>
                        <p className="text-[11px] text-muted-foreground">
                          Create text or image watermarks to apply to Proof galleries.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditingWatermark(undefined); setWatermarkEditorOpen(true); }}
                        className="gap-1.5 text-[10px] tracking-widest uppercase font-light rounded-none shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        New watermark
                      </Button>
                    </div>

                    {/* Watermarks list */}
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
                                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Type className="h-2.5 w-2.5" />
                                    {wm.text_content}
                                  </span>
                                )}
                                {wm.image_enabled && wm.image_url && (
                                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Image className="h-2.5 w-2.5" />
                                    Image
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => { setEditingWatermark(wm); setWatermarkEditorOpen(true); }}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === wm.id}
                                onClick={() => wm.id && handleWatermarkDelete(wm.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                title="Delete"
                              >
                                {deletingId === wm.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Trash2 className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Watermark Editor Dialog */}
      <Dialog
        open={watermarkEditorOpen}
        onOpenChange={(open) => {
          setWatermarkEditorOpen(open);
          if (!open) setEditingWatermark(undefined);
        }}
      >
        <DialogContent
          className="max-w-4xl w-full p-0 rounded-none border-border overflow-hidden"
          style={{ height: "90vh", maxHeight: "780px" }}
        >
          <DialogHeader className="px-5 py-3 border-b border-border shrink-0">
            <DialogTitle className="text-sm font-light tracking-wide">
              {editingWatermark ? "Edit Watermark" : "New Watermark"}
            </DialogTitle>
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
