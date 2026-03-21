import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Monitor, Tablet, Smartphone, Loader2,
  ChevronDown, Globe, Check, ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditorSidebar, DEFAULT_SECTIONS, type SectionDef } from "@/components/website-editor/EditorSidebar";
import { BlockPanel, type BlockKey } from "@/components/website-editor/BlockPanel";
import { LivePreview } from "@/components/website-editor/LivePreview";
import type { SiteConfig, Session, Gallery, Photographer } from "@/components/store/PublicSiteRenderer";

type Viewport = "desktop" | "tablet" | "mobile";

const TEMPLATES = [
  { value: "editorial", label: "Editorial" },
  { value: "grid",      label: "Grid" },
  { value: "magazine",  label: "Magazine" },
  { value: "clean",     label: "Clean" },
];

export default function WebsiteEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "pending" | "saved">("idle");

  const [siteData, setSiteData] = useState<Partial<SiteConfig> & { bio?: string }>({});
  const [photographer, setPhotographer] = useState<Photographer>({ id: "", full_name: null, email: "", store_slug: null, bio: null, business_name: null });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);

  const [sections, setSections] = useState<SectionDef[]>(DEFAULT_SECTIONS);
  const [activeBlock, setActiveBlock] = useState<BlockKey | null>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [siteRes, pgRes, sessRes, galRes] = await Promise.all([
        supabase.from("photographer_site").select("*").eq("photographer_id", user.id).maybeSingle(),
        supabase.from("photographers").select("id, full_name, email, store_slug, bio, business_name").eq("id", user.id).maybeSingle(),
        supabase.from("sessions").select("id, slug, title, description, tagline, price, duration_minutes, num_photos, location, cover_image_url").eq("photographer_id", user.id).eq("status", "active"),
        supabase.from("galleries").select("id, slug, title, category, cover_image_url").eq("photographer_id", user.id).eq("status", "published"),
      ]);

      if (siteRes.data) {
        const { site_sections_order, ...rest } = siteRes.data as any;
        setSiteData({ ...rest, bio: pgRes.data?.bio ?? "" });
        if (site_sections_order && Array.isArray(site_sections_order)) {
          setSections(site_sections_order as SectionDef[]);
        }
      } else if (pgRes.data) {
        setSiteData({ bio: pgRes.data.bio ?? "" });
      }

      if (pgRes.data) {
        setPhotographer(pgRes.data as Photographer);
        setStoreSlug(pgRes.data.store_slug ?? null);
      }
      if (sessRes.data) setSessions(sessRes.data as Session[]);
      if (galRes.data) setGalleries(galRes.data as Gallery[]);
      setLoading(false);
    };
    load();
  }, [user]);

  // ── Auto-save with debounce ────────────────────────────────────────────────
  const save = useCallback(
    async (data: typeof siteData, secs: SectionDef[], immediate = false) => {
      if (!user) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const doSave = async () => {
        setSaving(true);
        setSaveStatus("pending");
        try {
          const { bio, ...siteFields } = data;
          const { error: siteErr } = await supabase.from("photographer_site").upsert(
            { ...siteFields, photographer_id: user.id, site_sections_order: secs as any } as any,
            { onConflict: "photographer_id" }
          );
          if (bio !== undefined) {
            await supabase.from("photographers").update({ bio } as any).eq("id", user.id);
          }
          if (siteErr) throw siteErr;
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2500);
        } catch (e: any) {
          toast({ title: "Save failed", description: e.message, variant: "destructive" });
          setSaveStatus("idle");
        } finally {
          setSaving(false);
        }
      };

      if (immediate) {
        await doSave();
      } else {
        debounceRef.current = setTimeout(doSave, 1200);
        setSaveStatus("pending");
      }
    },
    [user, toast]
  );

  const handleDataChange = (patch: Partial<typeof siteData>) => {
    setSiteData((prev) => {
      const next = { ...prev, ...patch };
      save(next, sections);
      return next;
    });
  };

  const handleReorder = (newSections: SectionDef[]) => {
    setSections(newSections);
    save(siteData, newSections);
  };

  const handleToggleVisibility = (key: BlockKey) => {
    const newSections = sections.map((s) => s.key === key ? { ...s, visible: !s.visible } : s);
    setSections(newSections);
    save(siteData, newSections);
  };

  const handlePublish = async () => {
    await save(siteData, sections, true);
    toast({ title: "Published!", description: "Your site is live." });
    if (storeSlug) {
      window.open(`/store/${storeSlug}`, "_blank");
    }
  };

  const handleTemplateChange = (template: string) => {
    handleDataChange({ site_template: template });
  };

  const photographerWithBio: Photographer = {
    ...photographer,
    bio: siteData.bio ?? photographer.bio,
  };

  const studioName =
    siteData.tagline ||
    photographer.business_name ||
    photographer.full_name ||
    "My Site";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ── Topbar ── */}
      <header className="flex items-center justify-between h-12 px-4 border-b border-border shrink-0 gap-3">
        {/* Left: back + studio name + template */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate("/dashboard/website")}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Exit</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-light tracking-wide truncate max-w-[140px] text-foreground">{studioName}</span>
            {storeSlug && (
              <a
                href={`/store/${storeSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="View live site"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <div className="w-px h-4 bg-border hidden sm:block shrink-0" />

          {/* Template selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-[11px] font-light tracking-wider uppercase px-2 shrink-0">
                {TEMPLATES.find((t) => t.value === (siteData.site_template ?? "editorial"))?.label ?? "Template"}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {TEMPLATES.map((t) => (
                <DropdownMenuItem key={t.value} onClick={() => handleTemplateChange(t.value)} className="text-xs gap-2">
                  {siteData.site_template === t.value && <Check className="h-3 w-3" />}
                  {t.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center — viewport switcher */}
        <div className="flex items-center border border-border rounded-sm overflow-hidden shrink-0">
          {([
            { key: "desktop" as Viewport, Icon: Monitor },
            { key: "tablet"  as Viewport, Icon: Tablet },
            { key: "mobile"  as Viewport, Icon: Smartphone },
          ] as const).map(({ key, Icon }) => (
            <button
              key={key}
              onClick={() => setViewport(key)}
              className={`px-2.5 py-1.5 transition-colors ${viewport === key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        {/* Right: save status + view site + publish */}
        <div className="flex items-center gap-2">
          {saveStatus === "pending" && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}

          {storeSlug && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-[10px] tracking-wider uppercase font-light px-3 hidden sm:flex"
              asChild
            >
              <a href={`/store/${storeSlug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
                View Site
              </a>
            </Button>
          )}

          <Button onClick={handlePublish} disabled={saving} size="sm" className="h-7 gap-1.5 text-[10px] tracking-wider uppercase font-light px-3">
            <Globe className="h-3.5 w-3.5" />
            Publish
          </Button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel (260px) */}
        <aside className="w-[260px] border-r border-border flex flex-col shrink-0 overflow-hidden">
          {activeBlock ? (
            <BlockPanel
              blockKey={activeBlock}
              data={siteData}
              onChange={handleDataChange}
              onBack={() => setActiveBlock(null)}
            />
          ) : (
            <EditorSidebar
              data={siteData}
              sections={sections}
              activeBlock={activeBlock}
              onSelectBlock={setActiveBlock}
              onReorder={handleReorder}
              onToggleVisibility={handleToggleVisibility}
              onStyleChange={handleDataChange}
            />
          )}
        </aside>

        {/* Canvas */}
        <main className="flex-1 overflow-auto bg-muted/20 flex items-start justify-center">
          {viewport === "desktop" ? (
            <div className="w-full h-full overflow-auto relative">
              <LivePreview
                data={siteData}
                photographer={photographerWithBio}
                sessions={sessions}
                galleries={galleries}
                viewport={viewport}
                onSelectBlock={setActiveBlock}
                activeBlock={activeBlock}
              />
            </div>
          ) : (
            <div className="p-6 w-full flex justify-center">
              <div
                className="bg-background shadow-2xl overflow-auto relative"
                style={{ width: viewport === "tablet" ? 768 : 375, minHeight: "calc(100vh - 12rem)" }}
              >
                <LivePreview
                  data={siteData}
                  photographer={photographerWithBio}
                  sessions={sessions}
                  galleries={galleries}
                  viewport={viewport}
                  onSelectBlock={setActiveBlock}
                  activeBlock={activeBlock}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
