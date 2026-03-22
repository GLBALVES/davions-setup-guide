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
import { type BlockKey } from "@/components/website-editor/BlockPanel";
import { LivePreview } from "@/components/website-editor/LivePreview";
import { AddBlockModal } from "@/components/website-editor/AddBlockModal";
import { type SitePage } from "@/components/website-editor/PagesTab";
import { PageContentPanel, type PageContent } from "@/components/website-editor/PageContentPanel";
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

  // Pages
  const [pages, setPages] = useState<SitePage[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null); // null = home

  const [addBlockState, setAddBlockState] = useState<{ open: boolean; insertAfter: number; targetPageId: string | null }>({
    open: false,
    insertAfter: 0,
    targetPageId: null,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [siteRes, pgRes, sessRes, galRes, pagesRes] = await Promise.all([
        supabase.from("photographer_site").select("*").eq("photographer_id", user.id).maybeSingle(),
        supabase.from("photographers").select("id, full_name, email, store_slug, bio, business_name").eq("id", user.id).maybeSingle(),
        supabase.from("sessions").select("id, slug, title, description, tagline, price, duration_minutes, num_photos, location, cover_image_url").eq("photographer_id", user.id).eq("status", "active"),
        supabase.from("galleries").select("id, slug, title, category, cover_image_url").eq("photographer_id", user.id).eq("status", "published"),
        supabase.from("site_pages").select("*").eq("photographer_id", user.id).order("sort_order"),
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

      // Load pages — ensure there's always a home page
      const rawPages = (pagesRes.data ?? []) as SitePage[];
      if (rawPages.length === 0) {
        // Create home page automatically
        const { data: newHome } = await supabase
          .from("site_pages")
          .insert({ photographer_id: user.id, title: "Home", slug: "home", is_home: true, sort_order: 0, is_visible: true })
          .select()
          .single();
        if (newHome) setPages([newHome as SitePage]);
      } else {
        setPages(rawPages);
      }

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

  const handleRemoveSection = async (pageId: string | null, sectionKey: BlockKey) => {
    if (pageId === null) {
      // Home page — remove from global sections array
      const newSections = sections.filter((s) => s.key !== sectionKey);
      setSections(newSections);
      save(siteData, newSections);
    } else {
      // Custom page — remove from site_pages.sections_order
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;
      const currentOrder: SectionDef[] = (page.sections_order as SectionDef[]) ?? [];
      const newOrder = currentOrder.filter((s) => s.key !== sectionKey);
      setPages((prev) => prev.map((p) => p.id === pageId ? { ...p, sections_order: newOrder as any } : p));
      await supabase.from("site_pages").update({ sections_order: newOrder as any } as any).eq("id", pageId);
    }
    if (activeBlock === sectionKey) setActiveBlock(null);
  };

  const handleOpenAddBlock = (insertAfterIndex: number, targetPageId?: string | null) => {
    setAddBlockState({ open: true, insertAfter: insertAfterIndex, targetPageId: targetPageId ?? activePageId });
  };

  const handleAddBlock = async (blockKey: BlockKey, insertAfterIndex: number, variantId?: string) => {
    const targetPageId = addBlockState.targetPageId;
    const targetPage = targetPageId ? pages.find((p) => p.id === targetPageId) : null;
    const isCustomPage = targetPage && !targetPage.is_home;

    // Apply variant-specific layout changes
    const variantPatch: Partial<typeof siteData> = {};
    if (variantId === "hero-split") variantPatch.hero_layout = "split" as any;
    else if (variantId === "hero-full") variantPatch.hero_layout = "full" as any;
    else if (variantId === "about-left") variantPatch.about_layout = "image-left" as any;
    else if (variantId === "about-right") variantPatch.about_layout = "image-right" as any;
    else if (variantId === "testimonials-quotes") variantPatch.testimonials_layout = "quotes" as any;
    else if (variantId === "testimonials-cards") variantPatch.testimonials_layout = "cards" as any;

    if (isCustomPage && targetPageId) {
      // Adding to a custom page — persist to site_pages.sections_order
      const currentOrder: SectionDef[] = (targetPage.sections_order as SectionDef[]) ?? [];
      const exists = currentOrder.find((s) => s.key === blockKey);
      let newOrder: SectionDef[];
      const META: Record<string, { label: string; icon: string }> = {
        hero: { label: "Hero", icon: "🖼️" }, sessions: { label: "Sessions", icon: "📅" },
        portfolio: { label: "Portfolio", icon: "🖼️" }, about: { label: "About", icon: "👤" },
        testimonials: { label: "Testimonials", icon: "⭐" }, quote: { label: "Quote", icon: "💬" },
        experience: { label: "Experience", icon: "✨" }, contact: { label: "Contact", icon: "📱" },
      };
      if (exists) {
        const without = currentOrder.filter((s) => s.key !== blockKey);
        const clamped = Math.min(insertAfterIndex, without.length);
        without.splice(clamped, 0, { ...exists, visible: true });
        newOrder = without;
      } else {
        const meta = META[blockKey] ?? { label: blockKey, icon: "📄" };
        const newSection: SectionDef = { key: blockKey, visible: true, label: meta.label, icon: meta.icon };
        const clamped = Math.min(insertAfterIndex, currentOrder.length);
        newOrder = [...currentOrder];
        newOrder.splice(clamped, 0, newSection);
      }
      setPages((prev) =>
        prev.map((p) => p.id === targetPageId ? { ...p, sections_order: newOrder as any } : p)
      );
      await supabase
        .from("site_pages")
        .update({ sections_order: newOrder as any } as any)
        .eq("id", targetPageId);
      // Apply variant layout patch to siteData if any
      if (Object.keys(variantPatch).length > 0) handleDataChange(variantPatch);
      setAddBlockState({ open: false, insertAfter: 0, targetPageId: null });
      setActivePageId(targetPageId);
      setActiveBlock(blockKey);
      return;
    }

    // Home page — modifies the global sections array
    const META: Record<string, { label: string; icon: string }> = {
      hero: { label: "Hero", icon: "🖼️" }, sessions: { label: "Sessions", icon: "📅" },
      portfolio: { label: "Portfolio", icon: "🖼️" }, about: { label: "About", icon: "👤" },
      testimonials: { label: "Testimonials", icon: "⭐" }, quote: { label: "Quote", icon: "💬" },
      experience: { label: "Experience", icon: "✨" }, contact: { label: "Contact", icon: "📱" },
    };
    const idx = sections.findIndex((s) => s.key === blockKey);
    let newSections: SectionDef[];
    if (idx === -1) {
      const meta = META[blockKey] ?? { label: blockKey, icon: "📄" };
      const newSection: SectionDef = { key: blockKey, visible: true, label: meta.label, icon: meta.icon };
      newSections = [...sections];
      const clamped = Math.min(insertAfterIndex, newSections.length);
      newSections.splice(clamped, 0, newSection);
    } else {
      newSections = sections.map((s) => s.key === blockKey ? { ...s, visible: true } : s);
      const [removed] = newSections.splice(idx, 1);
      const clamped = Math.min(insertAfterIndex, newSections.length);
      newSections.splice(clamped, 0, removed);
    }
    setSections(newSections);
    // Apply variant layout patch and save together
    if (Object.keys(variantPatch).length > 0) {
      const nextData = { ...siteData, ...variantPatch };
      setSiteData(nextData);
      save(nextData, newSections);
    } else {
      save(siteData, newSections);
    }
    setAddBlockState({ open: false, insertAfter: 0, targetPageId: null });
    setActiveBlock(blockKey);
  };

  // ── Page handlers ──────────────────────────────────────────────────────────
  const handleAddPage = async (parentId?: string | null) => {
    if (!user) return;
    const title = "New Page";
    const slug = `page-${Date.now()}`;
    const sortOrder = pages.filter((p) => !p.is_home).length;
    const { data, error } = await supabase
      .from("site_pages")
      .insert({
        photographer_id: user.id,
        title,
        slug,
        parent_id: parentId ?? null,
        sort_order: sortOrder,
        is_home: false,
        is_visible: true,
      })
      .select()
      .single();
    if (error) { toast({ title: "Failed to create page", variant: "destructive" }); return; }
    if (data) {
      setPages((prev) => [...prev, data as SitePage]);
      setActivePageId(data.id);
    }
  };

  const handleDeletePage = async (id: string) => {
    await supabase.from("site_pages").delete().eq("id", id);
    setPages((prev) => prev.filter((p) => p.id !== id));
    if (activePageId === id) setActivePageId(null);
  };

  const handleRenamePage = async (id: string, title: string) => {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `page-${id.slice(0, 8)}`;
    await supabase.from("site_pages").update({ title, slug } as any).eq("id", id);
    setPages((prev) => prev.map((p) => p.id === id ? { ...p, title, slug } : p));
  };

  const handleTogglePageVisibility = async (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    const newVal = !page.is_visible;
    await supabase.from("site_pages").update({ is_visible: newVal } as any).eq("id", id);
    setPages((prev) => prev.map((p) => p.id === id ? { ...p, is_visible: newVal } : p));
  };

  const handleReorderPages = async (reordered: SitePage[]) => {
    setPages(reordered);
    for (const p of reordered) {
      await supabase.from("site_pages").update({ sort_order: p.sort_order } as any).eq("id", p.id);
    }
  };

  const handleReorderPageSections = async (pageId: string, newSections: SectionDef[]) => {
    setPages((prev) =>
      prev.map((p) => p.id === pageId ? { ...p, sections_order: newSections as any } : p)
    );
    await supabase
      .from("site_pages")
      .update({ sections_order: newSections as any } as any)
      .eq("id", pageId);
  };

  const handleSelectPage = (id: string | null) => {
    setActivePageId(id);
    setActiveBlock(null); // Clear active block when switching pages
  };

  const handlePageContentChange = async (pageId: string, content: PageContent) => {
    if (!user) return;
    // Update local state immediately
    setPages((prev) =>
      prev.map((p) => p.id === pageId ? { ...p, page_content: content as any } : p)
    );
    // Debounced save to site_pages
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaveStatus("pending");
      const { error } = await supabase
        .from("site_pages")
        .update({ page_content: content as any, title: content.page_title ?? "" } as any)
        .eq("id", pageId);
      if (!error) {
        // Also update local title in pages
        if (content.page_title) {
          setPages((prev) =>
            prev.map((p) => p.id === pageId ? { ...p, title: content.page_title! } : p)
          );
        }
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setSaveStatus("idle");
      }
    }, 1200);
    setSaveStatus("pending");
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

  const activePage = activePageId ? pages.find((p) => p.id === activePageId) : null;

  // For custom pages, merge page_content fields into siteData so the preview shows
  // the page's own headline/cover/cta instead of the Home content.
  const effectiveSiteData = activePage && !activePage.is_home && activePage.page_content
    ? {
        ...siteData,
        site_headline: (activePage.page_content as any).page_headline ?? siteData.site_headline,
        site_subheadline: (activePage.page_content as any).page_subheadline ?? siteData.site_subheadline,
        site_hero_image_url: (activePage.page_content as any).page_cover_url ?? siteData.site_hero_image_url,
        cta_text: (activePage.page_content as any).page_cta_text ?? siteData.cta_text,
        cta_link: (activePage.page_content as any).page_cta_link ?? siteData.cta_link,
      }
    : siteData;

  const activePageSections: SectionDef[] =
    activePage && !activePage.is_home
      ? (() => {
          const order = (activePage.sections_order as SectionDef[]) ?? [];
          // If the custom page has no sections yet, show a default hero so preview isn't blank
          if (order.length === 0) return [{ key: "hero", label: "Hero", icon: "🖼️", visible: true }];
          return order;
        })()
      : sections;

  // hiddenSections for the modal uses the TARGET page (may differ from active page)
  const targetPageForModal = addBlockState.targetPageId
    ? pages.find((p) => p.id === addBlockState.targetPageId)
    : null;
  const modalSections: SectionDef[] = targetPageForModal && !targetPageForModal.is_home
    ? ((targetPageForModal.sections_order as SectionDef[]) ?? [])
    : sections;
  const hiddenSections = modalSections.filter((s) => s.visible === false).map((s) => s.key);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const livePreviewProps = {
    data: effectiveSiteData,
    photographer: photographerWithBio,
    sessions,
    galleries,
    viewport,
    onSelectBlock: setActiveBlock,
    activeBlock,
    onToggleVisibility: handleToggleVisibility,
    onAddBlock: handleOpenAddBlock,
    sections: activePageSections,
    onDataChange: handleDataChange,
    storeSlug,
  };

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
              onClick={() => window.open(`/store/${storeSlug}`, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="h-3 w-3" />
              View Site
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
        {/* Left panel (260px) — always shows pages/sections tree or page content editor */}
        <aside className="w-[260px] border-r border-border flex flex-col shrink-0 overflow-hidden">
          {/* Non-home page selected → show page content editor */}
          {activePageId !== null && (() => {
            const activePage = pages.find((p) => p.id === activePageId);
            return activePage && !activePage.is_home ? (
              <PageContentPanel
                page={activePage}
                onBack={() => setActivePageId(null)}
                onChange={handlePageContentChange}
              />
            ) : null;
          })()}

          {/* Default: EditorSidebar (home page or no custom page content) */}
          {(activePageId === null || pages.find((p) => p.id === activePageId)?.is_home) && (
            <EditorSidebar
              data={siteData}
              sections={sections}
              activeBlock={activeBlock}
              onSelectBlock={setActiveBlock}
              onReorder={handleReorder}
              onToggleVisibility={handleToggleVisibility}
              onStyleChange={handleDataChange}
              pages={pages}
              activePageId={activePageId}
              onSelectPage={handleSelectPage}
              onAddPage={handleAddPage}
              onAddSection={(pageId) => {
                const pg = pages.find((p) => p.id === pageId);
                const count = pg?.is_home
                  ? sections.length
                  : ((pg?.sections_order as SectionDef[]) ?? []).length;
                setAddBlockState({ open: true, insertAfter: count, targetPageId: pageId });
              }}
              onDeletePage={handleDeletePage}
              onRenamePage={handleRenamePage}
              onTogglePageVisibility={handleTogglePageVisibility}
              onReorderPages={handleReorderPages}
              onRemoveSection={handleRemoveSection}
            />
          )}
        </aside>

        {/* Canvas */}
        <main className="flex-1 overflow-auto bg-muted/20 flex items-start justify-center">
          {viewport === "desktop" ? (
            <div className="w-full h-full overflow-auto relative">
              <LivePreview {...livePreviewProps} viewport="desktop" />
            </div>
          ) : (
            <div className="p-6 w-full flex justify-center">
              <div
                className="bg-background shadow-2xl overflow-auto relative"
                style={{ width: viewport === "tablet" ? 768 : 375, minHeight: "calc(100vh - 12rem)" }}
              >
                <LivePreview {...livePreviewProps} viewport={viewport} />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Block Modal */}
      <AddBlockModal
        open={addBlockState.open}
        insertAfterIndex={addBlockState.insertAfter}
        hiddenSections={hiddenSections}
        onAdd={handleAddBlock}
        onClose={() => setAddBlockState((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}
