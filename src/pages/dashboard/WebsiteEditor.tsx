import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  FileText, Link2, Paintbrush, Settings, ChevronLeft, Eye, MoreHorizontal,
  Plus, FolderOpen, Home, Globe, EyeOff, Copy, Trash2, Type, QrCode,
  ChevronDown, ChevronRight, ArrowLeft, Search, ImagePlus, Shuffle,
  Image, Play, X, ArrowUp, ArrowDown, Settings2, GripVertical, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import PageTemplatePickerModal from "@/components/website-editor/PageTemplatePickerModal";
import { getTemplateSections, createSection, type PageSection, type SectionType } from "@/components/website-editor/page-templates";
import { AddBlockDivider } from "@/components/website-editor/BlockToolbar";
import { AddBlockPicker } from "@/components/website-editor/AddBlockPicker";
import { BlockSettingsPanel, type BlockSettings } from "@/components/website-editor/BlockSettingsPanel";
import PreviewRenderer, { type PreviewSiteConfig, type PreviewNavLink } from "@/components/website-editor/PreviewRenderer";
import { ImageUploadField } from "@/components/website-editor/ImageUploadField";
import { FONT_PRESETS, buildGoogleFontsHref, getFontStack } from "@/components/website-editor/site-fonts";

// ── Types ─────────────────────────────────────────────────────────────────────
type EditorTab = "pages" | "blog" | "style" | "settings";
type PageType = "page" | "folder" | "link";

interface SitePage {
  id: string;
  label: string;
  type: PageType;
  isHome?: boolean;
  icon?: string;
  inMenu: boolean;
  children?: SitePage[];
  slug?: string;
  status?: "online" | "offline";
  showHeaderFooter?: boolean;
  templateId?: string;
  sections?: PageSection[];
  pageTitle?: string;
  pageDescription?: string;
  hideFromSearch?: boolean;
  socialImage?: string;
}

// ── Default seed (only Home + Contact + Blog link) ───────────────────────────
const INITIAL_PAGES: SitePage[] = [
  { id: "home", label: "Home", type: "page", icon: "🏠", isHome: true, inMenu: true, status: "online", showHeaderFooter: true },
  { id: "contact", label: "Contact", type: "page", inMenu: true, status: "online", showHeaderFooter: true },
  { id: "blog", label: "Blog", type: "link", inMenu: true, status: "online", showHeaderFooter: false },
];

// Map the visual site template (chosen in Website Settings) to a homepage page-template
// so the Home page is born with content matching the chosen design.
const SITE_TEMPLATE_TO_HOME_TEMPLATE: Record<string, string> = {
  editorial: "homepage-1",
  sierra: "homepage-1",
  canvas: "homepage-1",
  seville: "homepage-1",
  clean: "homepage-1",
  grid: "homepage-2",
  magazine: "homepage-2",
  avery: "homepage-2",
  milo: "homepage-2",
};

const getHomeTemplateForSite = (siteTemplate?: string | null) =>
  SITE_TEMPLATE_TO_HOME_TEMPLATE[siteTemplate ?? ""] ?? "homepage-1";

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS: { id: EditorTab; icon: React.ElementType; label: string }[] = [
  { id: "pages", icon: FileText, label: "Pages" },
  { id: "blog", icon: Link2, label: "Blog" },
  { id: "style", icon: Paintbrush, label: "Style" },
  { id: "settings", icon: Settings, label: "Settings" },
];

const ADD_PAGE_OPTIONS = [
  { key: "page" as const, icon: FileText },
  { key: "folder" as const, icon: FolderOpen },
  { key: "link" as const, icon: Link2 },
];

// ── Page context menu ─────────────────────────────────────────────────────────
const PageContextMenu = ({
  page,
  onSettings,
  onToggleMenu,
  onDelete,
  onDuplicate,
}: {
  page: SitePage;
  onSettings: () => void;
  onToggleMenu: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) => {
  const { t } = useLanguage();
  const we = t.websiteEditor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-0.5 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem className="gap-2 text-xs">
          <Link2 className="h-3.5 w-3.5" /> {we.getDirectLink}
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-xs" onClick={onSettings}>
          <Settings className="h-3.5 w-3.5" /> {we.settings}
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-xs">
          <Type className="h-3.5 w-3.5" /> {we.rename}
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-xs">
          <Paintbrush className="h-3.5 w-3.5" /> {we.switchTemplate}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 text-xs" onClick={onToggleMenu}>
          {page.inMenu ? (
            <><EyeOff className="h-3.5 w-3.5" /> {we.hideFromMenu}</>
          ) : (
            <><Globe className="h-3.5 w-3.5" /> {we.showOnMenu}</>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-xs">
          <QrCode className="h-3.5 w-3.5" /> {we.getQrCode}
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-xs" onClick={onDuplicate}>
          <Copy className="h-3.5 w-3.5" /> {we.duplicate}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 text-xs text-destructive" onClick={onDelete} disabled={page.isHome}>
          <Trash2 className="h-3.5 w-3.5" /> {we.delete}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ── Page item ─────────────────────────────────────────────────────────────────
const PageItem = ({
  page,
  active,
  onSelect,
  onSettings,
  onToggleMenu,
  onDelete,
  onDuplicate,
  indent = false,
}: {
  page: SitePage;
  active?: boolean;
  onSelect: () => void;
  onSettings: () => void;
  onToggleMenu: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  indent?: boolean;
}) => {
  const IconEl = page.icon
    ? null
    : page.type === "link"
    ? Link2
    : page.type === "folder"
    ? FolderOpen
    : FileText;

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors",
        indent && "pl-8",
        active
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      {page.icon ? (
        <span className="text-xs shrink-0">{page.icon}</span>
      ) : IconEl ? (
        <IconEl className="h-3.5 w-3.5 shrink-0" />
      ) : null}
      <span className="truncate flex-1">{page.label}</span>
      <PageContextMenu page={page} onSettings={onSettings} onToggleMenu={onToggleMenu} onDelete={onDelete} onDuplicate={onDuplicate} />
    </div>
  );
};

// ── Folder group ──────────────────────────────────────────────────────────────
const PageFolder = ({
  page,
  activePage,
  onSelect,
  onSettings,
  onToggleMenu,
  onDelete,
  onDuplicate,
}: {
  page: SitePage;
  activePage: string;
  onSelect: (id: string) => void;
  onSettings: (p: SitePage) => void;
  onToggleMenu: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}) => {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <div
        onClick={() => setOpen(!open)}
        className="group flex items-center gap-2.5 px-3 py-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-md hover:bg-muted/50"
      >
        <FolderOpen className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate flex-1 text-left">{page.label}</span>
        {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
        <PageContextMenu page={page} onSettings={() => onSettings(page)} onToggleMenu={() => onToggleMenu(page.id)} onDelete={() => onDelete(page.id)} onDuplicate={() => onDuplicate(page.id)} />
      </div>
      {open && page.children?.map((child) => (
        <PageItem
          key={child.id}
          page={child}
          active={activePage === child.id}
          onSelect={() => onSelect(child.id)}
          onSettings={() => onSettings(child)}
          onToggleMenu={() => onToggleMenu(child.id)}
          onDelete={() => onDelete(child.id)}
          onDuplicate={() => onDuplicate(child.id)}
          indent
        />
      ))}
    </div>
  );
};

// ── Page Settings view ────────────────────────────────────────────────────────
const PageSettingsView = ({
  page,
  onBack,
  onUpdate,
  onDelete,
  onDuplicate,
}: {
  page: SitePage;
  onBack: () => void;
  onUpdate: (updated: Partial<SitePage>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) => {
  const { t } = useLanguage();
  const we = t.websiteEditor;
  const isHome = page.id === "home";
  const displaySlug = page.slug || page.label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const displayTitle = page.pageTitle || page.label;
  const displayDesc = page.pageDescription || "";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <button onClick={onBack} className="p-1 rounded hover:bg-muted/50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <h3 className="text-sm font-medium text-foreground">{we.pageSettings}</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── BASICS ── */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">{we.basics}</p>
        </div>
        <div className="px-4 space-y-4 pb-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{we.pageName}</label>
            <Input value={page.label} onChange={(e) => onUpdate({ label: e.target.value })} className="h-9 text-sm" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{we.pageStatus}</label>
            <Select value={page.status || "online"} onValueChange={(v) => onUpdate({ status: v as "online" | "offline" })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="online">{we.online}</SelectItem>
                <SelectItem value="offline">{we.offline}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground pr-2">{we.showHeaderFooter}</label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">{page.showHeaderFooter !== false ? we.on : we.off}</span>
              <Switch checked={page.showHeaderFooter ?? true} onCheckedChange={(v) => onUpdate({ showHeaderFooter: v })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{we.menuVisibility}</label>
            <Select value={page.inMenu ? "visible" : "hidden"} onValueChange={(v) => onUpdate({ inMenu: v === "visible" })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="visible">{we.visible}</SelectItem>
                <SelectItem value="hidden">{we.hidden}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* ── SEO ── */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">{we.seo}</p>
        </div>
        <div className="px-4 space-y-4 pb-5">
          {/* Search Preview (Google SERP card) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{we.searchPreview}</label>
            <div className="border border-border rounded-lg p-3 bg-muted/20 space-y-1">
              <p className="text-sm text-[hsl(var(--primary))] truncate leading-tight">{displayTitle}</p>
              <p className="text-[11px] text-green-700 dark:text-green-400 truncate">yoursite.com/{displaySlug}</p>
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">{displayDesc || "—"}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{we.urlSlug}</label>
            <Input
              value={page.slug ?? displaySlug}
              onChange={(e) => onUpdate({ slug: e.target.value })}
              className="h-9 text-sm"
            />
            <p className="text-[10px] text-muted-foreground/70">{we.urlSlugHelper}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{we.pageTitleSeo}</label>
            <Input
              value={page.pageTitle ?? ""}
              onChange={(e) => onUpdate({ pageTitle: e.target.value })}
              className="h-9 text-sm"
              placeholder={page.label}
            />
            <p className="text-[10px] text-muted-foreground/70">{we.pageTitleSeoHelper}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{we.pageDescriptionSeo}</label>
            <Textarea
              value={page.pageDescription ?? ""}
              onChange={(e) => onUpdate({ pageDescription: e.target.value })}
              className="text-sm min-h-[60px] resize-none"
              rows={3}
            />
            <p className="text-[10px] text-muted-foreground/70">{we.pageDescriptionSeoHelper}</p>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground pr-2">{we.hideFromSearchEngines}</label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">{page.hideFromSearch ? we.on : we.off}</span>
              <Switch checked={page.hideFromSearch ?? false} onCheckedChange={(v) => onUpdate({ hideFromSearch: v })} />
            </div>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* ── SOCIAL ── */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">{we.social}</p>
        </div>
        <div className="px-4 space-y-2 pb-5">
          <label className="text-xs font-medium text-muted-foreground">{we.socialImage}</label>
          <div className="border border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer">
            {page.socialImage ? (
              <img src={page.socialImage} alt="Social" className="w-full h-24 object-cover rounded" />
            ) : (
              <>
                <ImagePlus className="h-6 w-6 text-muted-foreground/50" />
                <span className="text-[11px] text-muted-foreground">{we.uploadImage}</span>
              </>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/70">{we.socialImageHelper}</p>
        </div>

        <div className="border-t border-border" />

        {/* ── Bottom Actions ── */}
        <div className="px-4 py-3 space-y-1">
          <button className="flex items-center gap-2.5 w-full px-2 py-2 rounded-md text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
            <Shuffle className="h-3.5 w-3.5" />
            {we.switchPageTemplate}
          </button>
          <button
            disabled={isHome}
            className={cn(
              "flex items-center gap-2.5 w-full px-2 py-2 rounded-md text-xs transition-colors",
              isHome
                ? "text-muted-foreground/40 cursor-not-allowed"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <Home className="h-3.5 w-3.5" />
            {we.setAsHomepage}
          </button>
          <button onClick={onDuplicate} className="flex items-center gap-2.5 w-full px-2 py-2 rounded-md text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
            <Copy className="h-3.5 w-3.5" />
            {we.duplicatePage}
          </button>
          <button
            onClick={onDelete}
            disabled={isHome}
            className={cn(
              "flex items-center gap-2.5 w-full px-2 py-2 rounded-md text-xs transition-colors",
              isHome ? "text-muted-foreground/40 cursor-not-allowed" : "text-destructive hover:bg-destructive/10"
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {we.deletePage}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Header Slider types ───────────────────────────────────────────────────────
interface HeaderSlide {
  id: string;
  title: string;
  imageUrl: string | null;
}

// ── Header Slider Panel ──────────────────────────────────────────────────────
const HeaderSliderPanel = ({
  onBack,
}: {
  onBack: () => void;
}) => {
  const { t } = useLanguage();
  const we = t.websiteEditor;
  const [slides, setSlides] = useState<HeaderSlide[]>([
    { id: "1", title: "", imageUrl: null },
    { id: "2", title: "", imageUrl: null },
    { id: "3", title: "", imageUrl: null },
    { id: "4", title: "", imageUrl: null },
    { id: "5", title: "", imageUrl: null },
    { id: "6", title: "", imageUrl: null },
  ]);
  const [activeSlide, setActiveSlide] = useState<string>("1");
  const [autoPlay, setAutoPlay] = useState(true);

  const addSlide = () => {
    const newId = String(Date.now());
    setSlides((prev) => [...prev, { id: newId, title: "", imageUrl: null }]);
  };

  const removeSlide = (id: string) => {
    setSlides((prev) => prev.filter((s) => s.id !== id));
    if (activeSlide === id) setActiveSlide(slides[0]?.id || "");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <button onClick={onBack} className="p-1 rounded hover:bg-muted/50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <h3 className="text-sm font-medium text-foreground">{we.headerSlider}</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* SLIDES section */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">{we.slides}</p>
        </div>

        <div className="px-4 pb-2">
          <p className="text-xs font-medium text-foreground mb-3">{we.slides}</p>
          <div className="space-y-1">
            {slides.map((slide, i) => (
              <div
                key={slide.id}
                onClick={() => setActiveSlide(slide.id)}
                className={cn(
                  "flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer transition-colors group",
                  activeSlide === slide.id
                    ? "bg-accent"
                    : "hover:bg-muted/50"
                )}
              >
                {/* Thumbnail */}
                <div className="w-10 h-10 rounded bg-muted/60 shrink-0 overflow-hidden flex items-center justify-center">
                  {slide.imageUrl ? (
                    <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="h-4 w-4 text-muted-foreground/40" />
                  )}
                </div>
                <span className="text-sm text-foreground/80 flex-1 truncate">
                  {slide.title || we.untitled}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}
                  className="p-0.5 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addSlide}
            className="flex items-center gap-2 mt-3 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            {we.addNew}
          </button>
        </div>

        <div className="border-t border-border" />

        {/* OPTIONS section */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">{we.options}</p>
        </div>
        <div className="px-4 pb-4 space-y-3">
          <div>
            <p className="text-sm text-foreground mb-2">{we.autoPlaySlides}</p>
            <div className="flex items-center gap-2">
              <Switch checked={autoPlay} onCheckedChange={setAutoPlay} />
              <span className="text-xs text-muted-foreground">{autoPlay ? we.on : we.off}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Page Sections Panel (when clicking a page — shows blocks with toolbar) ───
const PageSectionsPanel = ({
  pageLabel,
  sections,
  onBack,
  onEditSection,
  onSectionsChange,
  selectedBlockIndex,
  onSelectBlock,
}: {
  pageLabel: string;
  sections: PageSection[];
  onBack: () => void;
  onEditSection: (section: string) => void;
  onSectionsChange: (sections: PageSection[]) => void;
  selectedBlockIndex: number | null;
  onSelectBlock: (idx: number | null) => void;
}) => {
  const { t } = useLanguage();
  const we = t.websiteEditor;
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [insertIndex, setInsertIndex] = useState<number>(0);

  const moveSection = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= sections.length) return;
    const next = [...sections];
    [next[from], next[to]] = [next[to], next[from]];
    onSectionsChange(next);
  };

  const duplicateSection = (idx: number) => {
    const dup = { ...sections[idx], id: `sec-${Date.now()}-dup` };
    const next = [...sections];
    next.splice(idx + 1, 0, dup);
    onSectionsChange(next);
  };

  const deleteSection = (idx: number) => {
    onSectionsChange(sections.filter((_, i) => i !== idx));
    if (selectedBlockIndex === idx) onSelectBlock(null);
  };

  const updateVariant = (idx: number, variant: string) => {
    const next = [...sections];
    next[idx] = { ...next[idx], props: { ...next[idx].props, variant } };
    onSectionsChange(next);
  };

  const handleAddBlock = (type: SectionType) => {
    const newSection = createSection(type);
    const next = [...sections];
    next.splice(insertIndex, 0, newSection);
    onSectionsChange(next);
  };

  const openAddBlock = (atIndex: number) => {
    setInsertIndex(atIndex);
    setAddBlockOpen(true);
  };

  // If block settings panel is open, show it
  if (selectedBlockIndex !== null && sections[selectedBlockIndex]) {
    const section = sections[selectedBlockIndex];
    const blockSettings: BlockSettings = (section.props?.blockSettings as BlockSettings) || {};
    return (
      <BlockSettingsPanel
        section={section}
        settings={blockSettings}
        onUpdate={(s) => {
          const next = [...sections];
          next[selectedBlockIndex] = { ...section, props: { ...section.props, blockSettings: s } };
          onSectionsChange(next);
        }}
        onUpdateProps={(newProps) => {
          const next = [...sections];
          next[selectedBlockIndex] = { ...section, props: newProps };
          onSectionsChange(next);
        }}
        onBack={() => onSelectBlock(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <button onClick={onBack} className="p-1 rounded hover:bg-muted/50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <h3 className="text-sm font-medium text-foreground">{pageLabel}</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {sections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-xs text-muted-foreground mb-3">No blocks yet</p>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => openAddBlock(0)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Block
            </Button>
          </div>
        )}

        {sections.map((section, idx) => (
          <div key={section.id}>
            {/* Add block divider before first */}
            {idx === 0 && (
              <AddBlockDivider onClick={() => openAddBlock(0)} />
            )}

            {/* Section item */}
            <div
              onClick={() => onSelectBlock(idx)}
              className={cn(
                "group relative flex items-center gap-2 px-2 py-2 rounded-md transition-colors cursor-pointer",
                selectedBlockIndex === idx ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/40"
              )}
            >
              {/* Drag handle placeholder */}
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />

              {/* Section type icon */}
              <div className="w-7 h-7 rounded bg-muted/60 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-medium text-muted-foreground uppercase">
                  {section.type.slice(0, 3)}
                </span>
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{section.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{section.type}</p>
              </div>

              {/* Inline actions (visible on hover) */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => moveSection(idx, -1)}
                  disabled={idx === 0}
                  className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30"
                  title="Move up"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  onClick={() => moveSection(idx, 1)}
                  disabled={idx === sections.length - 1}
                  className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30"
                  title="Move down"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
                <button
                  onClick={() => duplicateSection(idx)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground"
                  title="Duplicate"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <button
                  onClick={() => onSelectBlock(idx)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground"
                  title="Block settings"
                >
                  <Settings2 className="h-3 w-3" />
                </button>
                <button
                  onClick={() => deleteSection(idx)}
                  className="p-1 rounded hover:bg-muted text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Add block divider after each */}
            <AddBlockDivider onClick={() => openAddBlock(idx + 1)} />
          </div>
        ))}
      </div>

      <AddBlockPicker
        open={addBlockOpen}
        onOpenChange={setAddBlockOpen}
        onSelect={handleAddBlock}
      />
    </div>
  );
};

// ── DB helpers ────────────────────────────────────────────────────────────────
function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

interface DbSitePage {
  id: string;
  photographer_id: string;
  title: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  is_home: boolean;
  is_visible: boolean;
  sections_order: any;
  page_content: any;
}

function dbRowToSitePage(row: DbSitePage, children?: SitePage[]): SitePage {
  const content = (row.page_content || {}) as Record<string, any>;
  return {
    id: row.id,
    label: row.title,
    type: content.type || "page",
    isHome: row.is_home,
    icon: content.icon,
    inMenu: row.is_visible,
    status: content.status || "online",
    showHeaderFooter: content.showHeaderFooter ?? true,
    slug: row.slug,
    templateId: content.templateId,
    sections: content.sections,
    pageTitle: content.pageTitle,
    pageDescription: content.pageDescription,
    hideFromSearch: content.hideFromSearch,
    socialImage: content.socialImage,
    ...(children && children.length > 0 ? { children } : {}),
  };
}

function sitePageToDbFields(page: SitePage, photographerId: string, sortOrder: number, parentId: string | null = null) {
  return {
    id: page.id,
    photographer_id: photographerId,
    title: page.label,
    slug: page.slug || slugify(page.label),
    parent_id: parentId,
    sort_order: sortOrder,
    is_home: page.isHome === true,
    is_visible: page.inMenu,
    sections_order: JSON.parse(JSON.stringify(page.sections ? page.sections.map((s) => s.type) : [])),
    page_content: JSON.parse(JSON.stringify({
      type: page.type,
      icon: page.icon,
      status: page.status,
      showHeaderFooter: page.showHeaderFooter,
      templateId: page.templateId,
      sections: page.sections,
      pageTitle: page.pageTitle,
      pageDescription: page.pageDescription,
      hideFromSearch: page.hideFromSearch,
      socialImage: page.socialImage,
    })),
  };
}

// ── Pages Panel ───────────────────────────────────────────────────────────────
const PagesPanel = ({
  editingSection,
  setEditingSection,
  photographerId,
  selectedBlockIndex,
  onSelectBlock,
  onActiveSectionsChange,
  onNavLinksChange,
  onActivePageChange,
  onUpdateActiveSections,
  registerActivePageActions,
}: {
  editingSection: string | null;
  setEditingSection: (s: string | null) => void;
  photographerId: string | null;
  selectedBlockIndex: number | null;
  onSelectBlock: (idx: number | null) => void;
  onActiveSectionsChange: (sections: PageSection[]) => void;
  onNavLinksChange: (links: PreviewNavLink[]) => void;
  onActivePageChange: (info: { id: string | null; showHeaderFooter: boolean }) => void;
  onUpdateActiveSections: (sections: PageSection[]) => void;
  registerActivePageActions: (api: { setSections: (s: PageSection[]) => void } | null) => void;
}) => {
  const [addOpen, setAddOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [pages, setPages] = useState<SitePage[]>([]);
  const [activePage, setActivePage] = useState("home");
  const [settingsPage, setSettingsPage] = useState<SitePage | null>(null);
  const [editingSectionsPageId, setEditingSectionsPageId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { t } = useLanguage();
  const we = t.websiteEditor;

  const flattenPages = (list: SitePage[]) => list.flatMap((p) => (p.children ? [p, ...p.children] : [p]));

  const getHomePageId = (list: SitePage[]) => flattenPages(list).find((p) => p.isHome)?.id ?? null;

  const selectPage = (id: string, pagesList?: SitePage[]) => {
    setActivePage(id);
    const allP = flattenPages(pagesList || pages);
    const page = allP.find((p) => p.id === id);
    if (page?.type === "page") {
      setEditingSectionsPageId(id);
      onActiveSectionsChange(page.sections || []);
      onSelectBlock(null);
      onActivePageChange({ id: page.id, showHeaderFooter: page.showHeaderFooter ?? true });
    }
  };

  const buildTree = (rows: any[]) => {
    const topLevel = rows.filter((r: any) => !r.parent_id);
    const result: SitePage[] = topLevel.map((row: any) => {
      const children = rows.filter((r: any) => r.parent_id === row.id);
      return dbRowToSitePage(row, children.map((c: any) => dbRowToSitePage(c)));
    });
    setPages(result);
    const homeId = getHomePageId(result);
    const firstId = homeId ?? result[0]?.id ?? "";
    selectPage(firstId, result);
  };

  // ── Load from DB ──
  useEffect(() => {
    if (!photographerId) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("site_pages")
        .select("*")
        .eq("photographer_id", photographerId)
        .order("sort_order", { ascending: true });

      if (error) { console.error("Failed to load site_pages", error); setLoaded(true); return; }

      if (!data || data.length === 0) {
        // Check if site was already initialized (user intentionally deleted all pages)
        const { data: siteRow } = await supabase
          .from("photographer_site")
          .select("site_pages_initialized, site_template")
          .eq("photographer_id", photographerId)
          .maybeSingle();

        if (siteRow?.site_pages_initialized) {
          // User intentionally has no pages — don't re-seed
          setPages([]);
        } else {
          // First time — seed defaults, with Home built from the chosen site template
          const homeTemplateId = getHomeTemplateForSite((siteRow as any)?.site_template);
          const homeSections = getTemplateSections(homeTemplateId);
          const rows: any[] = [];
          let order = 0;
          for (const page of INITIAL_PAGES) {
            const id = crypto.randomUUID();
            const seeded: SitePage = page.isHome
              ? { ...page, id, templateId: homeTemplateId, sections: homeSections }
              : { ...page, id };
            rows.push(sitePageToDbFields(seeded, photographerId, order++));
            if (page.children) {
              for (const child of page.children) {
                const childId = crypto.randomUUID();
                rows.push(sitePageToDbFields({ ...child, id: childId }, photographerId, order++, id));
              }
            }
          }
          const { error: insertErr } = await supabase.from("site_pages").insert(rows);
          if (insertErr) { console.error("Failed to seed site_pages", insertErr); }
          // Mark as initialized
          await supabase.from("photographer_site").update({ site_pages_initialized: true } as any).eq("photographer_id", photographerId);
          // Re-fetch after seed
          const { data: seededRows } = await supabase
            .from("site_pages")
            .select("*")
            .eq("photographer_id", photographerId)
            .order("sort_order", { ascending: true });
          buildTree(seededRows || []);
        }
      } else {
        // Has pages — ensure flag is set
        if (loaded === false) {
          await supabase.from("photographer_site").update({ site_pages_initialized: true } as any).eq("photographer_id", photographerId);
        }
        buildTree(data);
      }
      setLoaded(true);
    };

    load();
  }, [photographerId]);

  // Emit nav links whenever pages change — every item with inMenu becomes a menu entry
  useEffect(() => {
    const toNavLink = (p: SitePage): PreviewNavLink => ({
      id: p.id,
      label: p.label,
      isHome: p.isHome,
      type: p.type,
      url: p.type === "link" ? p.slug : undefined,
      children:
        p.type === "folder" && p.children
          ? p.children.filter((c) => c.inMenu).map(toNavLink)
          : undefined,
    });
    const links: PreviewNavLink[] = pages.filter((p) => p.inMenu).map(toNavLink);
    onNavLinksChange(links);
  }, [pages, onNavLinksChange]);

  // Register API for parent to update active sections (for preview toolbar actions)
  useEffect(() => {
    if (!editingSectionsPageId) { registerActivePageActions(null); return; }
    registerActivePageActions({
      setSections: (newSections: PageSection[]) => {
        findAndUpdate(editingSectionsPageId, { sections: newSections });
        onActiveSectionsChange(newSections);
      },
    });
    return () => registerActivePageActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingSectionsPageId, pages]);

  // ── Persist helpers ──
  const persistUpdate = async (id: string, patch: Record<string, any>) => {
    await supabase.from("site_pages").update(patch).eq("id", id);
  };

  const findAndUpdate = (id: string, patch: Partial<SitePage>) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id === id) return { ...p, ...patch };
        if (p.children) {
          return { ...p, children: p.children.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
        }
        return p;
      })
    );
    if (settingsPage?.id === id) setSettingsPage((prev) => (prev ? { ...prev, ...patch } : null));

    // Build DB patch
    const dbPatch: Record<string, any> = {};
    if (patch.label !== undefined) { dbPatch.title = patch.label; dbPatch.slug = slugify(patch.label); }
    if (patch.inMenu !== undefined) dbPatch.is_visible = patch.inMenu;
    if (patch.slug !== undefined) dbPatch.slug = patch.slug;

    // Always update page_content with the full merged content
    const allP = flattenPages(pages);
    const current = allP.find((p) => p.id === id);
    if (current) {
      const merged = { ...current, ...patch };
      dbPatch.page_content = JSON.parse(JSON.stringify({
        type: merged.type,
        icon: merged.icon,
        status: merged.status,
        showHeaderFooter: merged.showHeaderFooter,
        templateId: merged.templateId,
        sections: merged.sections,
        pageTitle: merged.pageTitle,
        pageDescription: merged.pageDescription,
        hideFromSearch: merged.hideFromSearch,
        socialImage: merged.socialImage,
      }));
    }

    persistUpdate(id, dbPatch);
  };

  const toggleMenu = (id: string) => {
    const page = pages.find((p) => p.id === id) || pages.flatMap((p) => p.children || []).find((c) => c.id === id);
    if (page) findAndUpdate(id, { inMenu: !page.inMenu });
  };

  const deletePage = async (id: string) => {
    const allP = flattenPages(pages);
    const page = allP.find((p) => p.id === id);
    if (!page || page.isHome) return;

    // Collect ids to delete: the page itself + its children (if it's a folder)
    const idsToDelete = [id, ...((page.children ?? []).map((c) => c.id))];

    const nextPages = pages
      .filter((p) => p.id !== id)
      .map((p) => p.children ? { ...p, children: p.children.filter((c) => c.id !== id) } : p);

    setPages(nextPages);

    if (idsToDelete.includes(activePage)) {
      const nextHomeId = getHomePageId(nextPages);
      const nextId = nextHomeId ?? nextPages[0]?.id ?? "";
      selectPage(nextId, nextPages);
    }

    if (settingsPage && idsToDelete.includes(settingsPage.id)) setSettingsPage(null);
    if (editingSectionsPageId && idsToDelete.includes(editingSectionsPageId)) {
      setEditingSectionsPageId(null);
      onActiveSectionsChange([]);
      onSelectBlock(null);
    }

    // Cascade delete: removes the page row + any child pages.
    // page_content (which holds the section/block configs) is stored in the row itself,
    // so deleting the row also cleans up all blocks linked to that page.
    const { error } = await supabase.from("site_pages").delete().in("id", idsToDelete);
    if (error) {
      console.error("Failed to delete page(s)", error);
      toast.error("Failed to delete page");
    }
  };

  const duplicatePage = async (id: string) => {
    if (!photographerId) return;
    const allP = flattenPages(pages);
    const source = allP.find((p) => p.id === id);
    if (!source) return;
    const newId = crypto.randomUUID();
    const newPage: SitePage = { ...source, id: newId, label: `${source.label} (copy)`, inMenu: false, children: undefined, isHome: false };
    setPages((prev) => [...prev, newPage]);

    const row = sitePageToDbFields(newPage, photographerId, pages.length);
    await supabase.from("site_pages").insert([row]);
  };

  const addPage = async (type: "page" | "folder" | "link") => {
    if (type === "page") {
      setAddOpen(false);
      setTemplatePickerOpen(true);
      return;
    }
    if (!photographerId) return;
    const newId = crypto.randomUUID();
    const newPage: SitePage = {
      id: newId,
      label: type === "folder" ? "New Folder" : "New Link",
      type,
      isHome: false,
      inMenu: false,
      status: "online",
      showHeaderFooter: type !== "link",
      ...(type === "folder" ? { children: [] } : {}),
    };
    setPages((prev) => [...prev, newPage]);
    setSettingsPage(newPage);
    setAddOpen(false);

    const row = sitePageToDbFields(newPage, photographerId, pages.length);
    await supabase.from("site_pages").insert([row]);
  };

  const handleTemplateSelect = async (templateId: string, title: string) => {
    if (!photographerId) return;
    const newId = crypto.randomUUID();
    const sections = getTemplateSections(templateId);
    const newPage: SitePage = {
      id: newId,
      label: title,
      type: "page",
      isHome: false,
      inMenu: false,
      status: "online",
      showHeaderFooter: true,
      templateId,
      sections,
    };
    setPages((prev) => [...prev, newPage]);
    setSettingsPage(newPage);

    const row = sitePageToDbFields(newPage, photographerId, pages.length);
    await supabase.from("site_pages").insert([row]);
  };

  const allPages = flattenPages(pages);

  // If editing a section (e.g. header slider)
  if (editingSection === "header-slider") {
    return <HeaderSliderPanel onBack={() => setEditingSection(null)} />;
  }

  // If editing page sections (blocks)
  if (editingSectionsPageId) {
    const targetPage = allPages.find((p) => p.id === editingSectionsPageId);
    if (targetPage && targetPage.type === "page") {
      return (
        <PageSectionsPanel
          pageLabel={targetPage.label}
          sections={targetPage.sections || []}
          onBack={() => { setEditingSectionsPageId(null); onSelectBlock(null); }}
          onEditSection={setEditingSection}
          selectedBlockIndex={selectedBlockIndex}
          onSelectBlock={onSelectBlock}
          onSectionsChange={(newSections) => {
            findAndUpdate(editingSectionsPageId, { sections: newSections });
            onActiveSectionsChange(newSections);
          }}
        />
      );
    }
  }

  // If settings is open, show that view
  if (settingsPage) {
    const livePage = allPages.find((p) => p.id === settingsPage.id) || settingsPage;
    return (
      <PageSettingsView
        page={livePage}
        onBack={() => setSettingsPage(null)}
        onUpdate={(patch) => findAndUpdate(settingsPage.id, patch)}
        onDelete={() => { deletePage(settingsPage.id); setSettingsPage(null); }}
        onDuplicate={() => { duplicatePage(settingsPage.id); setSettingsPage(null); }}
      />
    );
  }

  const menuPages = pages.filter((p) => p.inMenu);
  const nonMenuPages = pages.filter((p) => !p.inMenu);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Add Page */}
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-medium text-foreground">Pages</h3>
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary hover:text-primary-foreground">
              <Plus className="h-3.5 w-3.5" />
              {we.addPage}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-1.5 shadow-lg" sideOffset={6}>
            {ADD_PAGE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const label = we[opt.key];
              const desc = we[`${opt.key}Desc` as keyof typeof we];
              return (
                <button
                  key={opt.key}
                  onClick={() => addPage(opt.key)}
                  className="flex items-start gap-3 w-full rounded-md px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                >
                  <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{String(desc ?? "")}</p>
                  </div>
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>

      {/* SITE MENU section */}
      <div className="px-4 pb-2">
        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">{we.siteMenu}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        {menuPages.map((page) =>
          page.type === "folder" ? (
            <PageFolder
              key={page.id}
              page={page}
              activePage={activePage}
              onSelect={(id) => selectPage(id)}
              onSettings={setSettingsPage}
              onToggleMenu={toggleMenu}
              onDelete={deletePage}
              onDuplicate={duplicatePage}
            />
          ) : (
            <PageItem
              key={page.id}
              page={page}
              active={activePage === page.id}
              onSelect={() => selectPage(page.id)}
              onSettings={() => setSettingsPage(page)}
              onToggleMenu={() => toggleMenu(page.id)}
              onDelete={() => deletePage(page.id)}
              onDuplicate={() => duplicatePage(page.id)}
            />
          )
        )}

        {/* NOT IN MENU section */}
        {nonMenuPages.length > 0 && (
          <>
            <div className="px-2 pt-4 pb-2">
              <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">{we.notInMenu}</p>
            </div>
            {nonMenuPages.map((page) => (
              <PageItem
                key={page.id}
                page={page}
                active={activePage === page.id}
                onSelect={() => selectPage(page.id)}
                onSettings={() => setSettingsPage(page)}
                onToggleMenu={() => toggleMenu(page.id)}
                onDelete={() => deletePage(page.id)}
                onDuplicate={() => duplicatePage(page.id)}
              />
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-border p-3 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs">Preview</Button>
        <Button size="sm" className="flex-1 text-xs bg-primary text-primary-foreground">Publish</Button>
      </div>

      <PageTemplatePickerModal
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        onSelect={handleTemplateSelect}
      />
    </div>
  );
};

// ── Placeholder panels ───────────────────────────────────────────────────────
const BlogPanel = () => (
  <div className="p-4 space-y-4">
    <h3 className="text-sm font-medium text-foreground">Blog</h3>
    <p className="text-xs text-muted-foreground">Manage your blog posts and settings.</p>
    <div className="space-y-2">
      {["Posts", "Categories", "Settings"].map((item) => (
        <div key={item} className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors">
          <p className="text-xs font-medium">{item}</p>
        </div>
      ))}
    </div>
  </div>
);

// ── Style Panel (functional) ─────────────────────────────────────────────────
const StylePanel = ({ photographerId, site, onSiteChange }: {
  photographerId: string | null;
  site: PreviewSiteConfig | null;
  onSiteChange: (patch: Partial<Record<string, any>>) => void;
}) => {
  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full">
      <h3 className="text-sm font-medium text-foreground">Style</h3>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Logo</label>
        <ImageUploadField
          value={site?.logoUrl ?? ""}
          onChange={(url) => onSiteChange({ logo_url: url || null })}
          photographerId={photographerId}
          folder="logo"
          aspectClass="aspect-[3/1]"
        />
      </div>

      {/* ── Typography ── */}
      <div className="border-t border-border -mx-4 px-4 pt-4">
        <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium mb-3">
          Typography
        </p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Heading font</label>
            <Select
              value={site?.headingFont || "inter"}
              onValueChange={(v) => onSiteChange({ heading_font: v })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_PRESETS.map((f) => (
                  <SelectItem key={f.id} value={f.id} style={{ fontFamily: f.stack }}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Body font</label>
            <Select
              value={site?.bodyFont || "inter"}
              onValueChange={(v) => onSiteChange({ body_font: v })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_PRESETS.map((f) => (
                  <SelectItem key={f.id} value={f.id} style={{ fontFamily: f.stack }}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Colors ── */}
      <div className="border-t border-border -mx-4 px-4 pt-4">
        <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium mb-3">
          Colors
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Accent</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={site?.accentColor || "#000000"}
                onChange={(e) => onSiteChange({ accent_color: e.target.value })}
                className="h-9 w-12 rounded border border-border cursor-pointer bg-transparent"
              />
              <Input
                value={site?.accentColor || "#000000"}
                onChange={(e) => onSiteChange({ accent_color: e.target.value })}
                className="h-9 text-sm flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Header background</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={site?.headerBg || "#ffffff"}
                onChange={(e) => onSiteChange({ header_bg_color: e.target.value })}
                className="h-9 w-12 rounded border border-border cursor-pointer bg-transparent"
              />
              <Input
                value={site?.headerBg || ""}
                onChange={(e) => onSiteChange({ header_bg_color: e.target.value || null })}
                className="h-9 text-sm flex-1"
                placeholder="#ffffff"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Footer background</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={site?.footerBg || "#000000"}
                onChange={(e) => onSiteChange({ footer_bg_color: e.target.value })}
                className="h-9 w-12 rounded border border-border cursor-pointer bg-transparent"
              />
              <Input
                value={site?.footerBg || ""}
                onChange={(e) => onSiteChange({ footer_bg_color: e.target.value || null })}
                className="h-9 text-sm flex-1"
                placeholder="#000000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Footer text</label>
            <Input
              value={site?.footerText || ""}
              onChange={(e) => onSiteChange({ footer_text: e.target.value })}
              className="h-9 text-sm"
              placeholder="© 2026 Studio Name"
            />
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground/70 pt-2">
        Changes save automatically and reflect in the preview.
      </p>
    </div>
  );
};

const SettingsPanel = () => (
  <div className="p-4 space-y-4">
    <h3 className="text-sm font-medium text-foreground">Settings</h3>
    <p className="text-xs text-muted-foreground">General website configuration.</p>
    <div className="space-y-2">
      {["Domain", "SEO", "Analytics", "Social Media"].map((item) => (
        <div key={item} className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors">
          <p className="text-xs font-medium">{item}</p>
        </div>
      ))}
    </div>
  </div>
);

// ── Main Editor ──────────────────────────────────────────────────────────────
const WebsiteEditor = () => {
  const [activeTab, setActiveTab] = useState<EditorTab>("pages");
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [activePageSections, setActivePageSections] = useState<PageSection[]>([]);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [navLinks, setNavLinks] = useState<PreviewNavLink[]>([]);
  const [activePageInfo, setActivePageInfo] = useState<{ id: string | null; showHeaderFooter: boolean }>({ id: null, showHeaderFooter: true });
  const [site, setSite] = useState<PreviewSiteConfig | null>(null);
  const [displayName, setDisplayName] = useState<string>("Studio");
  const [publishing, setPublishing] = useState(false);
  const [pageActions, setPageActions] = useState<{ setSections: (s: PageSection[]) => void } | null>(null);
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [insertIndex, setInsertIndex] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Load photographer + site config
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: ph } = await supabase
        .from("photographers")
        .select("store_slug, full_name, business_name")
        .eq("id", user.id)
        .maybeSingle();
      if (ph) {
        setStoreSlug((ph as any).store_slug ?? null);
        setDisplayName((ph as any).business_name || (ph as any).full_name || "Studio");
      }
      const { data: s } = await supabase
        .from("photographer_site")
        .select("logo_url, accent_color, header_bg_color, header_text_color, footer_bg_color, footer_text_color, footer_text")
        .eq("photographer_id", user.id)
        .maybeSingle();
      if (s) {
        setSite({
          logoUrl: (s as any).logo_url,
          accentColor: (s as any).accent_color || "#000000",
          headerBg: (s as any).header_bg_color,
          headerTextColor: (s as any).header_text_color,
          footerBg: (s as any).footer_bg_color,
          footerTextColor: (s as any).footer_text_color,
          footerText: (s as any).footer_text,
          displayName: (ph as any)?.business_name || (ph as any)?.full_name || "Studio",
        });
      } else {
        setSite({ displayName: "Studio", accentColor: "#000000" });
      }
    })();
  }, [user]);

  const updateSite = useCallback(async (patch: Record<string, any>) => {
    if (!user) return;
    // Optimistic local update
    setSite((prev) => ({
      ...(prev || {}),
      logoUrl: patch.logo_url !== undefined ? patch.logo_url : prev?.logoUrl,
      accentColor: patch.accent_color !== undefined ? patch.accent_color : prev?.accentColor,
      headerBg: patch.header_bg_color !== undefined ? patch.header_bg_color : prev?.headerBg,
      footerBg: patch.footer_bg_color !== undefined ? patch.footer_bg_color : prev?.footerBg,
      footerText: patch.footer_text !== undefined ? patch.footer_text : prev?.footerText,
      displayName: prev?.displayName ?? displayName,
    }));
    await supabase
      .from("photographer_site")
      .upsert({ photographer_id: user.id, ...patch } as any, { onConflict: "photographer_id" });
  }, [user, displayName]);

  const handleNavLinksChange = useCallback((links: PreviewNavLink[]) => {
    setNavLinks(links);
  }, []);

  const handleActivePageChange = useCallback((info: { id: string | null; showHeaderFooter: boolean }) => {
    setActivePageInfo(info);
  }, []);

  const handleRegisterActions = useCallback((api: { setSections: (s: PageSection[]) => void } | null) => {
    setPageActions(() => api);
  }, []);

  // Toolbar actions on the preview blocks
  const moveBlock = (from: number, to: number) => {
    if (!pageActions) return;
    if (to < 0 || to >= activePageSections.length) return;
    const next = [...activePageSections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    pageActions.setSections(next);
    if (selectedBlockIndex === from) setSelectedBlockIndex(to);
  };
  const duplicateBlock = (idx: number) => {
    if (!pageActions) return;
    const src = activePageSections[idx];
    if (!src) return;
    const dup: PageSection = JSON.parse(JSON.stringify(src));
    dup.id = crypto.randomUUID();
    const next = [...activePageSections];
    next.splice(idx + 1, 0, dup);
    pageActions.setSections(next);
  };
  const deleteBlock = (idx: number) => {
    if (!pageActions) return;
    const next = activePageSections.filter((_, i) => i !== idx);
    pageActions.setSections(next);
    if (selectedBlockIndex === idx) setSelectedBlockIndex(null);
  };

  // Inline edit: update a single prop path on a section, persist via pageActions
  const handleBlockPropChange = useCallback((sectionId: string, path: string, value: any) => {
    if (!pageActions) return;
    const idx = activePageSections.findIndex((s) => s.id === sectionId);
    if (idx === -1) return;
    const next = activePageSections.map((s, i) => {
      if (i !== idx) return s;
      // deep-clone props and apply path
      const newProps = JSON.parse(JSON.stringify(s.props || {}));
      const parts = path.split(".");
      let cursor: any = newProps;
      for (let p = 0; p < parts.length - 1; p++) {
        const key = parts[p];
        const nextKey = parts[p + 1];
        const nextIsIndex = /^\d+$/.test(nextKey);
        if (cursor[key] === undefined || cursor[key] === null) {
          cursor[key] = nextIsIndex ? [] : {};
        }
        cursor = cursor[key];
      }
      cursor[parts[parts.length - 1]] = value;
      return { ...s, props: newProps };
    });
    pageActions.setSections(next);
  }, [pageActions, activePageSections]);

  const handlePublish = async () => {
    if (!storeSlug) {
      toast.error("Set up your store URL first in Personalize.");
      return;
    }
    setPublishing(true);
    try {
      // All page edits already persist via PagesPanel.findAndUpdate.
      toast.success("Site published");
      window.open(`/store/${storeSlug}`, "_blank");
    } finally {
      setPublishing(false);
    }
  };

  const panelMap: Record<EditorTab, React.ReactNode> = {
    pages: <PagesPanel
      editingSection={editingSection}
      setEditingSection={setEditingSection}
      photographerId={user?.id ?? null}
      selectedBlockIndex={selectedBlockIndex}
      onSelectBlock={setSelectedBlockIndex}
      onActiveSectionsChange={setActivePageSections}
      onNavLinksChange={handleNavLinksChange}
      onActivePageChange={handleActivePageChange}
      onUpdateActiveSections={setActivePageSections}
      registerActivePageActions={handleRegisterActions}
    />,
    blog: <BlogPanel />,
    style: <StylePanel photographerId={user?.id ?? null} site={site} onSiteChange={updateSite} />,
    settings: <SettingsPanel />,
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Icon tab strip */}
      <div className="w-12 border-r border-border bg-card flex flex-col items-center shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full h-12 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-b border-border"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">Dashboard</TooltipContent>
        </Tooltip>

        <div className="flex flex-col w-full mt-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full h-11 flex items-center justify-center transition-colors relative",
                      isActive ? "text-foreground bg-muted/60" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                  >
                    {isActive && <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-foreground rounded-r" />}
                    <Icon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">{tab.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Sidebar panel */}
      <div className="w-[260px] border-r border-border bg-card flex flex-col shrink-0 overflow-hidden">
        {panelMap[activeTab]}
      </div>

      {/* Preview area */}
      <div className="flex-1 flex flex-col min-w-0 bg-muted/20">
        <div className="h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
          <span className="text-xs text-muted-foreground">{TABS.find((t) => t.id === activeTab)?.label}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1.5"
              onClick={() => {
                if (storeSlug) window.open(`/store/${storeSlug}`, "_blank");
              }}
            >
              <Eye className="h-3 w-3" />
              Preview
            </Button>
            <Button
              size="sm"
              className="h-7 text-[11px] gap-1.5"
              onClick={handlePublish}
              disabled={publishing}
            >
              {publishing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Publish
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <PreviewRenderer
            sections={activePageSections}
            selectedBlockIndex={selectedBlockIndex}
            onSelectBlock={(idx) => {
              setSelectedBlockIndex(idx);
              setActiveTab("pages");
            }}
            onMoveBlock={moveBlock}
            onDuplicateBlock={duplicateBlock}
            onDeleteBlock={deleteBlock}
            accentColor={site?.accentColor || "#000000"}
            site={site}
            navLinks={navLinks}
            activePageId={activePageInfo.id}
            showHeaderFooter={activePageInfo.showHeaderFooter}
            editMode={true}
            onPropChange={handleBlockPropChange}
            photographerId={user?.id ?? null}
          />
        </div>
      </div>
    </div>
  );
};

export default WebsiteEditor;
