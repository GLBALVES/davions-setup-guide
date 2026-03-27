import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Lang } from "@/lib/i18n/translations";
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
  Check, AlertCircle, Loader2, CreditCard, ExternalLink, Unlink, KeyRound, Trash2, Eye, EyeOff, Camera, UserCircle2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { WatermarkEditor, WatermarkData } from "@/components/dashboard/WatermarkEditor";
import SessionTypeManager, { SessionType } from "@/components/dashboard/SessionTypeManager";
import {
  loadConnectAndInitialize,
  StripeConnectInstance,
} from "@stripe/connect-js";
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from "@stripe/react-connect-js";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

const Settings = () => {
  const { user, signOut, photographerId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { lang, setLang, t } = useLanguage();

  // Payments tab — Stripe Connect
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [stripeConnectedAt, setStripeConnectedAt] = useState<string | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [disconnectingStripe, setDisconnectingStripe] = useState(false);
  const [stripeInstance, setStripeInstance] = useState<StripeConnectInstance | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Profile
  const [fullName, setFullName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [customDomainInput, setCustomDomainInput] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
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

  // Session Types
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

  // Security tab — change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Security tab — delete account
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const fetchSessionTypes = useCallback(async () => {
    if (!photographerId) return;
    const { data } = await supabase
      .from("session_types")
      .select("id, name")
      .eq("photographer_id", photographerId)
      .order("created_at", { ascending: true });
    if (data) setSessionTypes(data as SessionType[]);
  }, [photographerId]);

  useEffect(() => {
    if (!user || !photographerId) return;
    const fetchAll = async () => {
      const [profileRes, watermarksRes, gallerySettingsRes] = await Promise.all([
        supabase
          .from("photographers")
          .select("full_name, store_slug, custom_domain, hero_image_url, stripe_account_id, stripe_connected_at")
          .eq("id", photographerId)
          .single(),
        (supabase as any)
          .from("watermarks")
          .select("*")
          .eq("photographer_id", photographerId)
          .order("created_at", { ascending: true }),
        (supabase as any)
          .from("gallery_settings")
          .select("key, value")
          .eq("photographer_id", photographerId),
        fetchSessionTypes(),
      ]);

      if (profileRes.data) {
        const d = profileRes.data as any;
        setFullName(d.full_name ?? "");
        setStoreSlug(d.store_slug ?? "");
        setSlugInput(d.store_slug ?? "");
        setCustomDomain(d.custom_domain ?? "");
        setCustomDomainInput(d.custom_domain ?? "");
        setAvatarUrl(d.hero_image_url ?? null);
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
  }, [user, photographerId, fetchSessionTypes]);

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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      const { error: updateError } = await supabase
        .from("photographers")
        .update({ hero_image_url: publicUrl } as any)
        .eq("id", user.id);
      if (updateError) throw updateError;
      setAvatarUrl(publicUrl);
      toast({ title: "Profile photo updated" });
    } catch (err: any) {
      toast({ title: "Failed to upload photo", description: err.message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
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
    } as any).eq("id", photographerId ?? user!.id);

    if (error) {
      if (error.code === "23505") {
        if (error.message.includes("store_slug")) setSlugError(t.settings.urlAlreadyTaken);
        else if (error.message.includes("custom_domain")) setDomainError(t.settings.domainAlreadyLinked);
        else toast({ title: t.settings.failedToSave, description: error.message, variant: "destructive" });
      } else {
        toast({ title: t.settings.failedToSave, description: error.message, variant: "destructive" });
      }
    } else {
      setStoreSlug(slugInput);
      setCustomDomain(customDomainInput.trim());
      toast({ title: t.settings.settingsSaved, description: t.settings.profileUpdated });
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
    }).eq("id", photographerId ?? user!.id);

    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Business settings saved" });
    }
    setSavingBusiness(false);
  };

  const handleSaveGallerySettings = async () => {
    if (!photographerId) return;
    setSavingGallerySettings(true);
    const days = parseInt(galleryExpiryDays, 10);
    const valueToSave = (!galleryExpiryDays.trim() || isNaN(days) || days <= 0) ? null : String(days);
    const { error } = await (supabase as any)
      .from("gallery_settings")
      .upsert(
        { photographer_id: photographerId, key: "default_expiry_days", value: valueToSave },
        { onConflict: "photographer_id,key" }
      );
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Gallery settings saved" });
    }
    setSavingGallerySettings(false);
  };

  // ── Security: Change Password ──
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: t.settings.fillAllFields, variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: t.settings.passwordTooShort, description: t.settings.passwordTooShortDesc, variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t.settings.passwordsDontMatch, variant: "destructive" });
      return;
    }
    if (newPassword === currentPassword) {
      toast({ title: t.settings.samePassword, description: t.settings.samePasswordDesc, variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: currentPassword,
    });
    if (signInError) {
      toast({ title: t.settings.incorrectCurrentPassword, description: t.settings.incorrectCurrentPasswordDesc, variant: "destructive" });
      setSavingPassword(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: t.settings.failedToUpdatePassword, description: error.message, variant: "destructive" });
    } else {
      toast({ title: t.settings.passwordUpdated, description: t.settings.passwordUpdatedDesc });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSavingPassword(false);
  };

  // ── Security: Delete Account ──
  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeletingAccount(true);
    try {
      // Delete all user data first, then sign out (cascade handles DB rows)
      const { error } = await supabase.functions.invoke("create-studio-user", {
        method: "DELETE" as any,
      }).catch(() => ({ error: null }));

      // Sign the user out — account deletion requires service role key on backend
      // For now, we delete profile data and sign out
      await supabase.from("photographers").delete().eq("id", user.id).then(() => {});
      await supabase.auth.signOut();
      navigate("/login");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setDeletingAccount(false);
    }
  };

  // ── Stripe Connect Embedded Onboarding ──
  const handleActivatePayment = async () => {
    if (!user) return;
    setConnectingStripe(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = { Authorization: `Bearer ${session?.access_token}` };

      // Step 1: Create (or fetch existing) Connect account
      const { data: accountData, error: accountError } = await supabase.functions.invoke(
        "create-stripe-connect-account",
        { headers: authHeader }
      );
      if (accountError || !accountData?.stripe_account_id) {
        throw new Error(accountError?.message ?? "Failed to create payment account");
      }
      const accountId = accountData.stripe_account_id;

      // Step 2: Create an Account Session for the embedded component
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
        "create-stripe-account-session",
        {
          body: { stripe_account_id: accountId },
          headers: authHeader,
        }
      );
      if (sessionError || !sessionData?.client_secret) {
        throw new Error(sessionError?.message ?? "Failed to create account session");
      }

      // Step 3: Initialize Stripe Connect JS
      const publishableKey = sessionData.publishable_key;
      if (!publishableKey) throw new Error("Stripe publishable key not configured");

      const clientSecret = sessionData.client_secret;
      const instance = loadConnectAndInitialize({
        publishableKey,
        fetchClientSecret: async () => clientSecret,
        locale: "en-US",
        appearance: {
          overlays: "dialog",
          variables: {
            colorPrimary: "#000000",
            fontFamily: "inherit",
            borderRadius: "2px",
            colorBackground: "#ffffff",
            colorText: "#111111",
            colorSecondaryText: "#6b7280",
            colorBorder: "#e5e7eb",
            spacingUnit: "10px",
          },
        },
      });

      setStripeAccountId(accountId);
      setStripeInstance(instance);
      setShowOnboarding(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setConnectingStripe(false);
  };

  const handleOnboardingExit = async () => {
    // Refresh the account status from DB
    if (!photographerId) return;
    const { data } = await supabase
      .from("photographers")
      .select("stripe_account_id, stripe_connected_at")
      .eq("id", photographerId)
      .single();
    if (data) {
      setStripeAccountId((data as any).stripe_account_id ?? null);
      setStripeConnectedAt((data as any).stripe_connected_at ?? null);
    }
    setShowOnboarding(false);
    setStripeInstance(null);
    toast({ title: "Payment setup saved", description: "Your payment account has been updated." });
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
      setShowOnboarding(false);
      setStripeInstance(null);
      toast({ title: "Payments deactivated" });
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
            <div className={`flex flex-col gap-8 transition-all duration-300 ${showOnboarding ? "max-w-3xl" : "max-w-2xl"}`}>
              {/* Page title */}
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                  <span className="inline-block w-6 h-px bg-border" />
                  {t.settings.account}
                </p>
                <h1 className="text-2xl font-light tracking-wide">{t.settings.settingsTitle}</h1>
              </div>

              {loading ? (
                <p className="text-xs text-muted-foreground animate-pulse tracking-widest uppercase">{t.common.loading}</p>
              ) : (
                <Tabs defaultValue="profile" className="w-full">
                  {/* Tab triggers */}
                  <TabsList className="h-auto bg-transparent p-0 border-b border-border rounded-none w-full justify-start gap-0 mb-8">
                    {[
                      { value: "profile", label: t.settings.profile },
                      { value: "payments", label: t.settings.payments },
                      { value: "notifications", label: t.notif.title },
                      { value: "security", label: t.settings.security },
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
                      {/* Avatar */}
                      <div className="flex flex-col gap-2">
                        <Label className="text-[11px] tracking-wider uppercase font-light">Profile Photo</Label>
                        <div className="flex items-center gap-4">
                          <div className="relative group w-16 h-16 rounded-full overflow-hidden border border-border bg-muted shrink-0">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <UserCircle2 size={28} className="text-muted-foreground/40" />
                              </div>
                            )}
                            <button
                              onClick={() => avatarInputRef.current?.click()}
                              disabled={uploadingAvatar}
                              className="absolute inset-0 flex items-center justify-center bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                            >
                              {uploadingAvatar ? (
                                <Loader2 size={14} className="animate-spin text-foreground" />
                              ) : (
                                <Camera size={14} className="text-foreground" />
                              )}
                            </button>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => avatarInputRef.current?.click()}
                              disabled={uploadingAvatar}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
                            >
                              {uploadingAvatar ? "Uploading…" : "Change photo"}
                            </button>
                            <p className="text-[10px] text-muted-foreground/50">JPG, PNG or WEBP · used in the sidebar</p>
                          </div>
                          <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleAvatarChange}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[11px] tracking-wider uppercase font-light">{t.settings.fullName}</Label>
                        <Input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder={t.settings.yourName}
                          className="h-9 text-sm font-light"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[11px] tracking-wider uppercase font-light">{t.settings.email}</Label>
                        <Input
                          value={user?.email ?? ""}
                          disabled
                          className="h-9 text-sm font-light opacity-60"
                        />
                      </div>

                      {/* Language selector */}
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[11px] tracking-wider uppercase font-light">{t.settings.languageLabel}</Label>
                        <p className="text-[11px] text-muted-foreground">{t.settings.languageDesc}</p>
                        <div className="flex gap-2 mt-1">
                          {([
                            { value: "en", flag: "🇺🇸", label: "English" },
                            { value: "pt", flag: "🇧🇷", label: "Português" },
                            { value: "es", flag: "🇪🇸", label: "Español" },
                          ] as { value: Lang; flag: string; label: string }[]).map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setLang(opt.value)}
                              className={`flex items-center gap-2 px-3 py-2 text-[12px] border transition-colors rounded-none ${
                                lang === opt.value
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground"
                              }`}
                            >
                              <span>{opt.flag}</span>
                              <span className="font-light">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </section>

                    <div>
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        size="sm"
                        className="gap-2 text-xs tracking-wider uppercase font-light"
                      >
                        {saving ? t.settings.saving : t.settings.saveChanges}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* ── PAYMENTS TAB ── */}
                  <TabsContent value="payments" className="mt-0 flex flex-col gap-6">

                    {/* ── Onboarding pending banner ── */}
                    {stripeAccountId && !stripeConnectedAt && !showOnboarding && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 border border-border bg-muted/40 p-4">
                        <div className="flex items-start gap-3 flex-1">
                          <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="flex flex-col gap-0.5">
                            <p className="text-xs font-light tracking-wide text-foreground">{t.settings.paymentAccountPending}</p>
                            <p className="text-[11px] text-muted-foreground font-light leading-relaxed">
                              {t.settings.paymentPendingDesc}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleActivatePayment}
                          disabled={connectingStripe}
                          className="gap-2 text-xs tracking-wider uppercase font-light shrink-0"
                        >
                          {connectingStripe ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          {t.settings.completeSetup}
                        </Button>
                      </div>
                    )}

                    {stripeAccountId && !showOnboarding ? (
                      /* ── Connected state ── */
                      <div className="flex flex-col gap-5">
                        <div className="flex items-center gap-2 text-[11px] tracking-wider uppercase font-light px-3 py-1.5 border border-border w-fit text-foreground">
                          <Check className="h-3 w-3" />
                          {t.settings.activated}
                        </div>

                        <div className="border border-border p-5 flex flex-col gap-3">
                          <div className="flex flex-col gap-0.5">
                            <p className="text-[9px] tracking-widest uppercase text-muted-foreground">{t.settings.paymentAccount}</p>
                            <p className="text-sm font-mono font-light tracking-wide">{stripeAccountId}</p>
                          </div>
                          {stripeConnectedAt && (
                            <div className="flex flex-col gap-0.5">
                              <p className="text-[9px] tracking-widest uppercase text-muted-foreground">{t.settings.connectedOn}</p>
                              <p className="text-xs font-light text-muted-foreground">
                                {new Date(stripeConnectedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                              </p>
                            </div>
                          )}
                        </div>

                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          {t.settings.paymentsGoDirectly}
                        </p>

                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleActivatePayment}
                            disabled={connectingStripe}
                            className="gap-2 text-xs tracking-wider uppercase font-light"
                          >
                            {connectingStripe ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                            {t.settings.updateDetails}
                          </Button>
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
                            {t.settings.deactivate}
                          </Button>
                        </div>
                      </div>
                    ) : showOnboarding && stripeInstance ? (
                      /* ── Embedded onboarding ── */
                      <div className="flex flex-col gap-6">
                        {/* Header bar */}
                        <div className="flex items-center justify-between pb-4 border-b border-border">
                          <div className="flex flex-col gap-0.5">
                            <p className="text-xs font-light tracking-wide">{t.settings.paymentSetup}</p>
                            <p className="text-[10px] text-muted-foreground tracking-wider">
                              {t.settings.fillDetailsToReceive}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOnboardingExit}
                            className="text-[11px] tracking-widest uppercase font-light h-8 px-4"
                          >
                            {t.settings.close}
                          </Button>
                        </div>
                        {/* Stripe embedded component */}
                        <div className="rounded-none overflow-hidden">
                          <ConnectComponentsProvider connectInstance={stripeInstance}>
                            <ConnectAccountOnboarding onExit={handleOnboardingExit} />
                          </ConnectComponentsProvider>
                        </div>
                      </div>
                    ) : (
                      /* ── Not connected state ── */
                      <div className="flex flex-col gap-5">
                        <div className="flex items-center gap-2 text-[11px] tracking-wider uppercase font-light px-3 py-1.5 border border-border w-fit text-muted-foreground">
                          <CreditCard className="h-3 w-3" />
                          {t.settings.notActivated}
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {t.settings.connectYourAccount}
                        </p>

                        <div className="border border-border p-5 flex flex-col gap-3">
                          <p className="text-[9px] tracking-widest uppercase text-muted-foreground">{t.settings.howItWorks}</p>
                          {t.settings.paymentSteps.map((step, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <span className="text-[10px] text-muted-foreground shrink-0 w-4">{i + 1}.</span>
                              <p className="text-[11px] font-light leading-relaxed">{step}</p>
                            </div>
                          ))}
                        </div>

                        <div>
                          <Button
                            size="sm"
                            onClick={handleActivatePayment}
                            disabled={connectingStripe}
                            className="gap-2 text-xs tracking-wider uppercase font-light"
                          >
                            {connectingStripe
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <CreditCard className="h-3.5 w-3.5" />}
                            {connectingStripe ? t.settings.settingUp : t.settings.activatePayment}
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* ── SECURITY TAB ── */}
                  <TabsContent value="security" className="mt-0 flex flex-col gap-10">

                    {/* Change Password */}
                    <section className="flex flex-col gap-5">
                      <div className="flex flex-col gap-1">
                        <p className="text-xs tracking-widest uppercase font-light text-foreground flex items-center gap-2">
                          <KeyRound className="h-3.5 w-3.5" />
                          {t.settings.changePassword}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-light">
                          {t.settings.changePasswordDesc}
                        </p>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-[11px] tracking-wider uppercase font-light">{t.settings.currentPassword}</Label>
                          <div className="relative">
                            <Input
                              type={showCurrentPw ? "text" : "password"}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="••••••••"
                              className="h-9 text-sm font-light pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPw((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showCurrentPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <Label className="text-[11px] tracking-wider uppercase font-light">{t.settings.newPassword}</Label>
                          <div className="relative">
                            <Input
                              type={showNewPw ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="••••••••"
                              className="h-9 text-sm font-light pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPw((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <Label className="text-[11px] tracking-wider uppercase font-light">{t.settings.confirmNewPassword}</Label>
                          <div className="relative">
                            <Input
                              type={showConfirmPw ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="••••••••"
                              className="h-9 text-sm font-light pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPw((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showConfirmPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Button
                          size="sm"
                          onClick={handleChangePassword}
                          disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                          className="gap-2 text-xs tracking-wider uppercase font-light"
                        >
                          {savingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          {savingPassword ? t.settings.updating : t.settings.updatePassword}
                        </Button>
                      </div>
                    </section>

                    {/* Divider */}
                    <div className="border-t border-border" />

                    {/* Delete Account */}
                    <section className="flex flex-col gap-5">
                      <div className="flex flex-col gap-1">
                        <p className="text-xs tracking-widest uppercase font-light text-destructive flex items-center gap-2">
                          <Trash2 className="h-3.5 w-3.5" />
                          {t.settings.deleteAccount}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-light leading-relaxed">
                          {t.settings.deleteAccountDesc}
                        </p>
                      </div>

                      <div className="border border-destructive/30 bg-destructive/5 p-4 flex flex-col gap-3">
                        <p className="text-[11px] text-muted-foreground font-light leading-relaxed">
                          {t.settings.dataToDelete}
                        </p>
                        {t.settings.deleteDataItems.map((item) => (
                          <div key={item} className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-destructive/60 shrink-0" />
                            <p className="text-[11px] font-light text-foreground/80">{item}</p>
                          </div>
                        ))}
                      </div>

                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setDeleteDialogOpen(true); setDeleteConfirmInput(""); }}
                          className="gap-2 text-xs tracking-wider uppercase font-light border-destructive/40 text-destructive hover:bg-destructive/5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t.settings.deleteMyAccount}
                        </Button>
                      </div>
                    </section>

                  </TabsContent>

                </Tabs>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Delete Account Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-light tracking-wide">{t.settings.deleteAccountTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-[11px] leading-relaxed">
              {t.settings.deleteAccountConfirmDesc}
              <br /><br />
              Type <strong className="text-foreground">DELETE</strong> below to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder={t.settings.typeDeleteToConfirm}
              className="h-9 text-sm font-light"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs tracking-wider uppercase font-light h-9">
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmInput !== "DELETE" || deletingAccount}
              className="text-xs tracking-wider uppercase font-light h-9 bg-destructive text-destructive-foreground hover:bg-destructive/90 border-destructive disabled:opacity-40"
            >
              {deletingAccount ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
              {deletingAccount ? t.settings.deletingAccount : t.settings.deleteAccount}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              {editingWatermark ? t.settings.editWatermark : t.settings.newWatermark}
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
