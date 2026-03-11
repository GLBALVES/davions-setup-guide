import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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

const SocialMedia = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([
    { platform: "facebook", credentials: {}, is_active: false },
    { platform: "instagram", credentials: {}, is_active: false },
  ]);
  const [savingSocial, setSavingSocial] = useState<string | null>(null);
  const [testingSocial, setTestingSocial] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("social_api_connections")
      .select("*")
      .eq("photographer_id", user.id)
      .then(({ data }) => {
        if (data) {
          setSocialConnections((prev) =>
            prev.map((conn) => {
              const existing = data.find((r: any) => r.platform === conn.platform);
              if (existing) return { ...existing, credentials: existing.credentials || {} };
              return conn;
            })
          );
        }
        setLoading(false);
      });
  }, [user]);

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
      prev.map((c) => (c.platform === platform ? { ...c, is_active: !c.is_active } : c))
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
                <h1 className="text-2xl font-light tracking-wide">Social Media</h1>
              </div>

              {loading ? (
                <p className="text-xs text-muted-foreground animate-pulse tracking-widest uppercase">Loading…</p>
              ) : (
                <div className="flex flex-col gap-8">
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
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default SocialMedia;
