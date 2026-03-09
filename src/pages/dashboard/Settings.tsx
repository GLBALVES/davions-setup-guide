import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Check, Copy, AlertCircle, Store, Globe, ExternalLink, Upload, Loader2, X } from "lucide-react";
import logoPrincipal from "@/assets/logo_principal_preto.png";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

const Settings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

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

  const heroInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("photographers")
        .select("full_name, store_slug, custom_domain, bio, hero_image_url")
        .eq("id", user!.id)
        .single();
      if (data) {
        setFullName(data.full_name ?? "");
        setStoreSlug(data.store_slug ?? "");
        setSlugInput(data.store_slug ?? "");
        setCustomDomain((data as { custom_domain?: string }).custom_domain ?? "");
        setCustomDomainInput((data as { custom_domain?: string }).custom_domain ?? "");
        setBio((data as { bio?: string }).bio ?? "");
        setHeroImageUrl((data as { hero_image_url?: string }).hero_image_url ?? "");
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

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

    const { error: upErr } = await supabase.storage
      .from("session-covers")
      .upload(path, file, { upsert: true });

    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      setUploadingHero(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("session-covers")
      .getPublicUrl(path);

    const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;
    setHeroImageUrl(publicUrl);
    setUploadingHero(false);
    toast({ title: "Hero image uploaded" });
  };

  const handleSave = async () => {
    const slugErr = validateSlug(slugInput);
    const domErr = validateDomain(customDomainInput);
    if (slugErr) { setSlugError(slugErr); return; }
    if (domErr) { setDomainError(domErr); return; }

    setSaving(true);
    const updatePayload: Record<string, string | null> = {
      full_name: fullName,
      store_slug: slugInput,
      custom_domain: customDomainInput.trim() || null,
      bio: bio.trim() || null,
      hero_image_url: heroImageUrl.trim() || null,
    };

    const { error } = await supabase
      .from("photographers")
      .update(updatePayload)
      .eq("id", user!.id);

    if (error) {
      if (error.code === "23505") {
        if (error.message.includes("store_slug")) {
          setSlugError("This URL is already taken. Please choose another.");
        } else if (error.message.includes("custom_domain")) {
          setDomainError("This domain is already linked to another account.");
        } else {
          toast({ title: "Failed to save", description: error.message, variant: "destructive" });
        }
      } else {
        toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      }
    } else {
      setStoreSlug(slugInput);
      setCustomDomain(customDomainInput.trim());
      toast({ title: "Settings saved", description: "Your profile has been updated." });
    }
    setSaving(false);
  };

  const storeUrl = slugInput
    ? `${window.location.origin}/store/${slugInput}`
    : null;

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
          <header className="h-14 border-b border-border flex items-center px-6 shrink-0 gap-3">
            <SidebarTrigger className="text-muted-foreground" />
            <img src={logoPrincipal} alt="Davions" className="h-5 w-auto" />
          </header>

          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="max-w-xl flex flex-col gap-10">
              {/* Page title */}
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                  <span className="inline-block w-6 h-px bg-border" />
                  Account
                </p>
                <h1 className="text-2xl font-light tracking-wide">Settings</h1>
              </div>

              {loading ? (
                <p className="text-xs text-muted-foreground animate-pulse tracking-widest uppercase">
                  Loading…
                </p>
              ) : (
                <>
                  {/* ── Profile ── */}
                  <section className="flex flex-col gap-6">
                    <h2 className="text-xs tracking-[0.25em] uppercase font-light text-muted-foreground border-b border-border pb-2">
                      Profile
                    </h2>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[11px] tracking-wider uppercase font-light">
                          Full Name
                        </Label>
                        <Input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Your name"
                          className="h-9 text-sm font-light"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[11px] tracking-wider uppercase font-light">
                          Email
                        </Label>
                        <Input
                          value={user?.email ?? ""}
                          disabled
                          className="h-9 text-sm font-light opacity-60"
                        />
                      </div>
                    </div>
                  </section>

                  {/* ── Public Store Appearance ── */}
                  <section className="flex flex-col gap-6">
                    <h2 className="text-xs tracking-[0.25em] uppercase font-light text-muted-foreground border-b border-border pb-2">
                      Store Appearance
                    </h2>
                    <div className="flex flex-col gap-5">
                      {/* Hero image */}
                      <div className="flex flex-col gap-2">
                        <Label className="text-[11px] tracking-wider uppercase font-light">
                          Hero Image
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Full-bleed banner displayed at the top of your public booking page.
                        </p>

                        {heroImageUrl ? (
                          <div className="relative group w-full aspect-[16/5] overflow-hidden border border-border">
                            <img
                              src={heroImageUrl}
                              alt="Hero preview"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              <button
                                onClick={() => heroInputRef.current?.click()}
                                className="text-white text-[10px] tracking-widest uppercase border border-white/60 px-3 py-1.5 hover:bg-white/10 transition-colors"
                              >
                                Change
                              </button>
                              <button
                                onClick={() => setHeroImageUrl("")}
                                className="text-white/70 hover:text-white transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => heroInputRef.current?.click()}
                            disabled={uploadingHero}
                            className="w-full aspect-[16/5] border border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-foreground/40 transition-colors text-muted-foreground hover:text-foreground"
                          >
                            {uploadingHero ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <>
                                <Upload className="h-5 w-5" />
                                <span className="text-[10px] tracking-widest uppercase">
                                  Upload hero image
                                </span>
                              </>
                            )}
                          </button>
                        )}
                        <input
                          ref={heroInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleHeroUpload}
                        />
                      </div>

                      {/* Bio */}
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[11px] tracking-wider uppercase font-light">
                          Bio
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          A short introduction shown below your name in the hero section.
                        </p>
                        <Textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Tell clients a bit about you and your style…"
                          className="text-sm font-light resize-none min-h-[80px]"
                          maxLength={280}
                        />
                        <p className="text-[10px] text-muted-foreground/60 text-right">
                          {bio.length}/280
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* ── Booking Store ── */}
                  <section className="flex flex-col gap-6">
                    <h2 className="text-xs tracking-[0.25em] uppercase font-light text-muted-foreground border-b border-border pb-2">
                      Booking Store
                    </h2>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[11px] tracking-wider uppercase font-light">
                          Store URL
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Your unique public booking page. Share it with clients so they can browse and book sessions.
                        </p>
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
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {slugError}
                          </p>
                        )}
                      </div>

                      {storeUrl && !slugError && (
                        <div className="flex items-center gap-2 p-3 bg-muted/30 border border-border">
                          <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-[11px] text-muted-foreground flex-1 truncate">
                            {storeUrl}
                          </span>
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
                    </div>
                  </section>

                  {/* ── Custom Domain ── */}
                  <section className="flex flex-col gap-6">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-xs tracking-[0.25em] uppercase font-light text-muted-foreground border-b border-border pb-2">
                        Custom Domain
                      </h2>
                      <p className="text-[11px] text-muted-foreground pt-2">
                        Point your own domain (e.g. <span className="font-mono">booking.yourstudio.com</span>) directly to your booking store.
                        Clients will see your domain instead of the platform URL.
                      </p>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[11px] tracking-wider uppercase font-light flex items-center gap-1.5">
                          <Globe className="h-3 w-3" />
                          Your Domain
                        </Label>
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
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {domainError}
                          </p>
                        )}
                        {customDomain && !domainError && (
                          <div className="flex items-center gap-2 p-3 bg-muted/30 border border-border">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-[11px] text-muted-foreground flex-1 truncate font-mono">
                              https://{customDomain}
                            </span>
                            <button
                              onClick={() => copyUrl(`https://${customDomain}`, setDomainCopied)}
                              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            >
                              {domainCopied ? <Check className="h-3.5 w-3.5 text-foreground" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* DNS Instructions */}
                      <div className="border border-border p-4 flex flex-col gap-4">
                        <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                          DNS Configuration
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          At your domain registrar, add the following DNS record pointing to this platform:
                        </p>

                        <div className="flex flex-col gap-1.5">
                          <div className="grid grid-cols-3 gap-2 text-[10px] tracking-wider uppercase text-muted-foreground/60 px-2">
                            <span>Type</span>
                            <span>Name</span>
                            <span>Value</span>
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
                          DNS changes can take up to 48 hours to propagate worldwide. Once active, visitors to your custom domain will see your booking store.
                        </p>

                        <a
                          href="https://docs.lovable.dev/features/custom-domain"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-fit"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Custom domain documentation
                        </a>
                      </div>
                    </div>
                  </section>

                  {/* Save */}
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={handleSave}
                      disabled={saving || !!slugError || !!domainError}
                      size="sm"
                      className="gap-2 text-xs tracking-wider uppercase font-light"
                    >
                      {saving ? "Saving…" : "Save changes"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
