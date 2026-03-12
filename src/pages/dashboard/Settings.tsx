import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Check, AlertCircle, Loader2, CreditCard, ExternalLink, Unlink,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WatermarkEditor, WatermarkData } from "@/components/dashboard/WatermarkEditor";
import SessionTypeManager, { SessionType } from "@/components/dashboard/SessionTypeManager";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

const Settings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Handle Stripe Connect OAuth callback (code in URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code || !user) return;

    // Clean the URL
    navigate("/dashboard/settings", { replace: true });

    const exchangeCode = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke("stripe-connect-callback", {
          body: { code },
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        if (error || !data?.stripe_account_id) throw new Error(error?.message ?? "Connection failed");
        setStripeAccountId(data.stripe_account_id);
        setStripeConnectedAt(new Date().toISOString());
        toast({ title: "Payments connected!", description: "Your account is now ready to receive payments." });
      } catch (err: any) {
        toast({ title: "Payment connection failed", description: err.message, variant: "destructive" });
      }
    };
    exchangeCode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Payments tab — Stripe Connect
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [stripeConnectedAt, setStripeConnectedAt] = useState<string | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [disconnectingStripe, setDisconnectingStripe] = useState(false);

  // Profile
  const [fullName, setFullName] = useState("");
  
  const [storeSlug, setStoreSlug] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [customDomainInput, setCustomDomainInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      const [profileRes, watermarksRes, gallerySettingsRes] = await Promise.all([
        supabase
          .from("photographers")
          .select("full_name, store_slug, custom_domain, hero_image_url, stripe_account_id, stripe_connected_at")
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
        fetchSessionTypes(),
      ]);

      if (profileRes.data) {
        const d = profileRes.data as any;
        setFullName(d.full_name ?? "");
        setStoreSlug(d.store_slug ?? "");
        setSlugInput(d.store_slug ?? "");
        setCustomDomain(d.custom_domain ?? "");
        setCustomDomainInput(d.custom_domain ?? "");
        setStripeAccountId((d as any).stripe_account_id ?? null);
        setStripeConnectedAt((d as any).stripe_connected_at ?? null);
      }

      if (watermarksRes.data) {
        setWatermarks(watermarksRes.data as WatermarkData[]);
      }

      if (gallerySettingsRes?.data) {
        const expiryRow = gallerySettingsRes.data.find((r: any) => r.key === "default_expiry_days");
        if (expiryRow) setGalleryExpiryDays(expiryRow.value ?? "");
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

  const handleSave = async () => {
    const slugErr = validateSlug(slugInput);
    const domErr = validateDomain(customDomainInput);
    if (slugErr) { setSlugError(slugErr); return; }
    if (domErr) { setDomainError(domErr); return; }

    setSaving(true);
    const { error } = await supabase.from("photographers").update({
      full_name: fullName,
      store_slug: slugInput,
      custom_domain: customDomainInput.trim() || null,
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
      toast({ title: "Settings saved", description: "Your profile has been updated." });
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

  // ── Stripe Connect handlers ──
  const handleConnectStripe = async () => {
    if (!user) return;
    setConnectingStripe(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const redirectUri = `${window.location.origin}/dashboard/settings`;
      const { data, error } = await supabase.functions.invoke("stripe-connect-url", {
        body: { redirectUri },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error || !data?.url) throw new Error(error?.message ?? "Failed to get OAuth URL");
      window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setConnectingStripe(false);
    }
  };

  const handleDisconnectStripe = async () => {
    if (!user) return;
    setDisconnectingStripe(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke("stripe-connect-disconnect", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw new Error(error.message);
      setStripeAccountId(null);
      setStripeConnectedAt(null);
      toast({ title: "Payments disconnected" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDisconnectingStripe(false);
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
                  Account
                </p>
                <h1 className="text-2xl font-light tracking-wide">Settings</h1>
              </div>

              {loading ? (
                <p className="text-xs text-muted-foreground animate-pulse tracking-widest uppercase">Loading…</p>
              ) : (
                <Tabs defaultValue="profile" className="w-full">
                  {/* Tab triggers */}
                  <TabsList className="h-auto bg-transparent p-0 border-b border-border rounded-none w-full justify-start gap-0 mb-8">
                    {[
                   { value: "profile", label: "Profile" },
                   { value: "payments", label: "Payments" },
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

                  {/* ── PROFILE TAB ── */}
                  <TabsContent value="profile" className="mt-0 flex flex-col gap-8">
                    <section className="flex flex-col gap-5">
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[11px] tracking-wider uppercase font-light">Full Name</Label>
                        <Input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Your name"
                          className="h-9 text-sm font-light"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[11px] tracking-wider uppercase font-light">Email</Label>
                        <Input
                          value={user?.email ?? ""}
                          disabled
                          className="h-9 text-sm font-light opacity-60"
                        />
                      </div>

                    </section>

                    <div>
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        size="sm"
                        className="gap-2 text-xs tracking-wider uppercase font-light"
                      >
                        {saving ? "Saving…" : "Save changes"}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* ── PAYMENTS TAB ── */}
                  <TabsContent value="payments" className="mt-0 flex flex-col gap-6">

                    {stripeAccountId ? (
                      /* ── Connected state ── */
                      <div className="flex flex-col gap-5">
                        <div className="flex items-center gap-2 text-[11px] tracking-wider uppercase font-light px-3 py-1.5 border border-border w-fit text-foreground">
                          <Check className="h-3 w-3" />
                          Connected
                        </div>

                        <div className="border border-border p-5 flex flex-col gap-3">
                          <div className="flex flex-col gap-0.5">
                            <p className="text-[9px] tracking-widest uppercase text-muted-foreground">Payment Account</p>
                            <p className="text-sm font-mono font-light tracking-wide">{stripeAccountId}</p>
                          </div>
                          {stripeConnectedAt && (
                            <div className="flex flex-col gap-0.5">
                              <p className="text-[9px] tracking-widest uppercase text-muted-foreground">Connected on</p>
                              <p className="text-xs font-light text-muted-foreground">
                                {new Date(stripeConnectedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                              </p>
                            </div>
                          )}
                        </div>

                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Payments from your clients go directly to this payment account. To switch accounts, disconnect and reconnect.
                        </p>

                        <div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDisconnectStripe}
                            disabled={disconnectingStripe}
                            className="gap-2 text-xs tracking-wider uppercase font-light border-destructive/40 text-destructive hover:bg-destructive/5"
                          >
                            {disconnectingStripe
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Unlink className="h-3.5 w-3.5" />}
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* ── Not connected state ── */
                      <div className="flex flex-col gap-5">
                        <div className="flex items-center gap-2 text-[11px] tracking-wider uppercase font-light px-3 py-1.5 border border-border w-fit text-muted-foreground">
                          <CreditCard className="h-3 w-3" />
                          Not connected
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Connect your Stripe account so your clients pay directly to you.
                          You'll be redirected to Stripe to authorize the connection — no keys to copy or paste.
                        </p>

                        <div className="border border-border p-5 flex flex-col gap-3">
                          <p className="text-[9px] tracking-widest uppercase text-muted-foreground">How it works</p>
                          {[
                            "Click the button below",
                            "Log in to (or create) your Stripe account",
                            "Authorize the connection",
                            "You're redirected back here — done",
                          ].map((step, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <span className="text-[10px] text-muted-foreground shrink-0 w-4">{i + 1}.</span>
                              <p className="text-[11px] font-light leading-relaxed">{step}</p>
                            </div>
                          ))}
                        </div>

                        <div>
                          <Button
                            size="sm"
                            onClick={handleConnectStripe}
                            disabled={connectingStripe}
                            className="gap-2 text-xs tracking-wider uppercase font-light"
                          >
                            {connectingStripe
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <ExternalLink className="h-3.5 w-3.5" />}
                            {connectingStripe ? "Redirecting…" : "Connect with Stripe"}
                          </Button>
                        </div>
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

export default Settings;
