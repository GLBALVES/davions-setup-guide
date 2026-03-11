import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Check, Copy, AlertCircle, Store, Globe, ExternalLink,
  Loader2, X, Plus, Pencil, Trash2, Type, Image,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WatermarkEditor, WatermarkData } from "@/components/dashboard/WatermarkEditor";
import SessionTypeManager, { SessionType } from "@/components/dashboard/SessionTypeManager";
import { Switch } from "@/components/ui/switch";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

const Settings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

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

  // Social Media API connections
  interface SocialConnection {
    id?: string;
    platform: string;
    credentials: {
      app_id?: string;
      app_secret?: string;
      page_access_token?: string;
      page_id?: string;
      instagram_account_id?: string;
    };
    is_active: boolean;
  }
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([
    { platform: "facebook", credentials: {}, is_active: false },
    { platform: "instagram", credentials: {}, is_active: false },
  ]);
  const [savingSocial, setSavingSocial] = useState<string | null>(null);
  const [testingSocial, setTestingSocial] = useState<string | null>(null);

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
      const [profileRes, watermarksRes, gallerySettingsRes, , socialRes] = await Promise.all([
        supabase
          .from("photographers")
          .select("full_name, store_slug, custom_domain, hero_image_url")
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
        supabase
          .from("social_api_connections")
          .select("*")
          .eq("photographer_id", user.id),
      ]);

      if (profileRes.data) {
        const d = profileRes.data;
        setFullName(d.full_name ?? "");
        setStoreSlug(d.store_slug ?? "");
        setSlugInput(d.store_slug ?? "");
        setCustomDomain((d as any).custom_domain ?? "");
        setCustomDomainInput((d as any).custom_domain ?? "");
        
      }

      if (watermarksRes.data) {
        setWatermarks(watermarksRes.data as WatermarkData[]);
      }

      if (gallerySettingsRes?.data) {
        const expiryRow = gallerySettingsRes.data.find((r: any) => r.key === "default_expiry_days");
        if (expiryRow) setGalleryExpiryDays(expiryRow.value ?? "");
      }

      if (socialRes?.data) {
        setSocialConnections((prev) => {
          return prev.map((conn) => {
            const existing = (socialRes.data as any[]).find((r: any) => r.platform === conn.platform);
            if (existing) return { ...existing, credentials: existing.credentials || {} };
            return conn;
          });
        });
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

  const updateSocialField = (platform: string, field: string, value: string) => {
    setSocialConnections((prev) =>
      prev.map((c) =>
        c.platform === platform
          ? { ...c, credentials: { ...c.credentials, [field]: value } }
          : c
      )
    );
  };

  const toggleSocialActive = (platform: string) => {
    setSocialConnections((prev) =>
      prev.map((c) =>
        c.platform === platform ? { ...c, is_active: !c.is_active } : c
      )
    );
  };

  const handleSaveSocial = async (platform: string) => {
    if (!user) return;
    setSavingSocial(platform);
    const conn = socialConnections.find((c) => c.platform === platform);
    if (!conn) return;

    const payload = {
      photographer_id: user.id,
      platform,
      credentials: conn.credentials,
      is_active: conn.is_active,
    };

    let error: any;
    if (conn.id) {
      const res = await supabase
        .from("social_api_connections")
        .update(payload)
        .eq("id", conn.id);
      error = res.error;
    } else {
      const res = await supabase
        .from("social_api_connections")
        .insert(payload)
        .select()
        .single();
      error = res.error;
      if (res.data) {
        setSocialConnections((prev) =>
          prev.map((c) => (c.platform === platform ? { ...c, id: (res.data as any).id } : c))
        );
      }
    }

    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} settings saved` });
    }
    setSavingSocial(null);
  };

  const handleTestSocial = async (platform: string) => {
    if (!user) return;
    setTestingSocial(platform);
    try {
      const { data, error } = await supabase.functions.invoke("publish-social", {
        body: { action: "test", platform, photographer_id: user.id },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "Connection successful", description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} API is working.` });
      } else {
        toast({ title: "Connection failed", description: data?.error || "Could not connect.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Test failed", description: err.message, variant: "destructive" });
    }
    setTestingSocial(null);
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
                      { value: "social", label: "Social Media" },
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

                  {/* ── SOCIAL MEDIA TAB ── */}
                  <TabsContent value="social" className="mt-0 flex flex-col gap-8">
                    <p className="text-xs text-muted-foreground">
                      Configure your social media API credentials to enable direct publishing from Creative Studio.
                    </p>

                    {socialConnections.map((conn) => {
                      const pLabel = conn.platform.charAt(0).toUpperCase() + conn.platform.slice(1);
                      const isFb = conn.platform === "facebook";
                      return (
                        <section key={conn.platform} className="border border-border p-5 flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium tracking-wide">{pLabel}</h3>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                {conn.is_active ? "Active" : "Inactive"}
                              </span>
                              <Switch checked={conn.is_active} onCheckedChange={() => toggleSocialActive(conn.platform)} />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[11px] tracking-wider uppercase font-light">App ID</Label>
                              <Input
                                value={conn.credentials.app_id ?? ""}
                                onChange={(e) => updateSocialField(conn.platform, "app_id", e.target.value)}
                                placeholder="Meta App ID"
                                className="h-9 text-sm font-light"
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[11px] tracking-wider uppercase font-light">App Secret</Label>
                              <Input
                                type="password"
                                value={conn.credentials.app_secret ?? ""}
                                onChange={(e) => updateSocialField(conn.platform, "app_secret", e.target.value)}
                                placeholder="••••••••"
                                className="h-9 text-sm font-light"
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[11px] tracking-wider uppercase font-light">Page Access Token</Label>
                              <Input
                                type="password"
                                value={conn.credentials.page_access_token ?? ""}
                                onChange={(e) => updateSocialField(conn.platform, "page_access_token", e.target.value)}
                                placeholder="••••••••"
                                className="h-9 text-sm font-light"
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[11px] tracking-wider uppercase font-light">
                                {isFb ? "Page ID" : "Instagram Account ID"}
                              </Label>
                              <Input
                                value={(isFb ? conn.credentials.page_id : conn.credentials.instagram_account_id) ?? ""}
                                onChange={(e) =>
                                  updateSocialField(conn.platform, isFb ? "page_id" : "instagram_account_id", e.target.value)
                                }
                                placeholder={isFb ? "Facebook Page ID" : "Instagram Business Account ID"}
                                className="h-9 text-sm font-light"
                              />
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <Button
                              size="sm"
                              onClick={() => handleSaveSocial(conn.platform)}
                              disabled={savingSocial === conn.platform}
                              className="gap-2 text-xs tracking-wider uppercase font-light"
                            >
                              {savingSocial === conn.platform ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTestSocial(conn.platform)}
                              disabled={testingSocial === conn.platform || !conn.id}
                              className="gap-2 text-xs tracking-wider uppercase font-light"
                            >
                              {testingSocial === conn.platform ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                              Test Connection
                            </Button>
                          </div>
                        </section>
                      );
                    })}

                    <div className="border border-dashed border-border p-4 text-xs text-muted-foreground flex flex-col gap-2">
                      <p className="font-medium text-foreground text-[11px] tracking-wider uppercase">Prerequisites</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Create an app at <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Meta for Developers</a></li>
                        <li>Add <strong>Facebook Login</strong> and <strong>Instagram Graph API</strong> products</li>
                        <li>Generate a Page Access Token with <code className="text-[10px] bg-muted px-1 py-0.5">pages_manage_posts</code> and <code className="text-[10px] bg-muted px-1 py-0.5">instagram_basic, instagram_content_publish</code> permissions</li>
                        <li>Use a long-lived token for uninterrupted publishing</li>
                      </ul>
                    </div>
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
