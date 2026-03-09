import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Check, Copy, AlertCircle, Store } from "lucide-react";
import logoPrincipal from "@/assets/logo_principal_preto.png";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const Settings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("photographers")
        .select("full_name, store_slug")
        .eq("id", user!.id)
        .single();
      if (data) {
        setFullName(data.full_name ?? "");
        setStoreSlug(data.store_slug ?? "");
        setSlugInput(data.store_slug ?? "");
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

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/\s+/g, "-");
    setSlugInput(val);
    setSlugError(validateSlug(val));
  };

  const handleSave = async () => {
    const err = validateSlug(slugInput);
    if (err) {
      setSlugError(err);
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("photographers")
      .update({ full_name: fullName, store_slug: slugInput })
      .eq("id", user!.id);

    if (error) {
      // Unique constraint violation
      if (error.code === "23505") {
        setSlugError("This URL is already taken. Please choose another.");
      } else {
        toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      }
    } else {
      setStoreSlug(slugInput);
      toast({ title: "Settings saved", description: "Your profile has been updated." });
    }
    setSaving(false);
  };

  const storeUrl = slugInput
    ? `${window.location.origin}/store/${slugInput}`
    : null;

  const copyUrl = async () => {
    if (!storeUrl) return;
    await navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
                  {/* Profile section */}
                  <section className="flex flex-col gap-6">
                    <div>
                      <h2 className="text-xs tracking-[0.25em] uppercase font-light text-muted-foreground border-b border-border pb-2">
                        Profile
                      </h2>
                    </div>

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

                  {/* Store URL section */}
                  <section className="flex flex-col gap-6">
                    <div>
                      <h2 className="text-xs tracking-[0.25em] uppercase font-light text-muted-foreground border-b border-border pb-2">
                        Booking Store
                      </h2>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[11px] tracking-wider uppercase font-light">
                          Store URL
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          This is your unique public booking page. Share it with clients so they can browse and book your sessions.
                        </p>

                        {/* Input with prefix */}
                        <div className={`flex items-center border ${slugError ? "border-destructive" : "border-border"} bg-background overflow-hidden`}>
                          <span className="px-3 h-9 flex items-center text-xs text-muted-foreground bg-muted/40 border-r border-border shrink-0 select-none whitespace-nowrap">
                            {window.location.host}/store/
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

                      {/* URL preview + copy */}
                      {storeUrl && !slugError && (
                        <div className="flex items-center gap-2 p-3 bg-muted/30 border border-border">
                          <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-[11px] text-muted-foreground flex-1 truncate">
                            {storeUrl}
                          </span>
                          <button
                            onClick={copyUrl}
                            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            title="Copy store URL"
                          >
                            {copied ? (
                              <Check className="h-3.5 w-3.5 text-foreground" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
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

                  {/* Save */}
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={handleSave}
                      disabled={saving || !!slugError}
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
