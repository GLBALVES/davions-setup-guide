import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Globe, Search, BookOpen, Share2, BarChart3, Settings2, Inbox, FileText, Trash2, Scale, Store, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import TrackingModal from "./TrackingModal";
import AdvancedModal from "./AdvancedModal";
import SeoSubPanel from "./SeoSubPanel";
import BlogSubPanel from "./BlogSubPanel";
import SocialSubPanel from "./SocialSubPanel";
import DraftsSubPanel from "./DraftsSubPanel";
import TrashSubPanel from "./TrashSubPanel";
import FormSubmissionsSubPanel from "./FormSubmissionsSubPanel";
import LegalModal from "./LegalModal";
import ShopSubPanel from "./ShopSubPanel";

type SubView = null | "seo" | "blog" | "social" | "drafts" | "trash" | "forms" | "legal" | "shop";

export default function SettingsPanel({
  photographerId,
  site,
  onSiteChange,
  openSubKey,
  onSubKeyHandled,
  resetNonce,
  storeSlug,
  onShowcasePreviewChange,
}: {
  photographerId: string | null;
  site: Record<string, any> | null;
  onSiteChange: (patch: Record<string, any>) => void;
  openSubKey?: SubView;
  onSubKeyHandled?: () => void;
  /** Bumped by the parent every time the user clicks a sidebar tab; resets nested sub-screens. */
  resetNonce?: number;
  storeSlug?: string | null;
  onShowcasePreviewChange?: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [view, setView] = useState<SubView>(null);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);

  useEffect(() => {
    if (resetNonce === undefined) return;
    setView(null);
    setTrackingOpen(false);
    setAdvancedOpen(false);
    setLegalOpen(false);
    onShowcasePreviewChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetNonce]);

  useEffect(() => {
    if (openSubKey) {
      if (openSubKey === "legal") {
        setLegalOpen(true);
      } else {
        setView(openSubKey);
      }
      onSubKeyHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSubKey]);

  if (view) {
    const titles: Record<Exclude<SubView, null>, string> = {
      seo: "SEO Manager",
      blog: "Blog",
      social: "Social",
      drafts: "Draft Sites",
      trash: "Trash",
      forms: "Form Submissions",
      legal: "Legal",
      shop: "Showcase",
    };
    return (
      <>
        <div className="flex flex-col h-full">
          <div className="h-10 border-b border-border flex items-center px-2 shrink-0">
            <button
              onClick={() => {
                if (view === "shop") onShowcasePreviewChange?.(false);
                setView(null);
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-muted/50"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="font-medium">{titles[view]}</span>
            </button>
          </div>
          <div className="flex-1 min-h-0">
            {view === "seo" && <SeoSubPanel photographerId={photographerId} site={site} onSiteChange={onSiteChange} />}
            {view === "blog" && <BlogSubPanel site={site} onSiteChange={onSiteChange} />}
            {view === "social" && <SocialSubPanel site={site} onSiteChange={onSiteChange} />}
            {view === "drafts" && <DraftsSubPanel photographerId={photographerId} />}
            {view === "trash" && <TrashSubPanel photographerId={photographerId} />}
            {view === "forms" && <FormSubmissionsSubPanel photographerId={photographerId} />}
            {view === "shop" && <ShopSubPanel site={site} onSiteChange={onSiteChange} storeSlug={storeSlug ?? (site as any)?.store_slug ?? null} photographerId={photographerId} />}
          </div>
        </div>
        <LegalModal open={legalOpen} onOpenChange={setLegalOpen} site={site} onSiteChange={onSiteChange} />
      </>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2 shrink-0">
        <h3 className="text-sm font-semibold text-foreground">Settings</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
        {/* SITE SETTINGS */}
        <Section title="Site Settings">
          <Item icon={Globe} label="Domain" onClick={() => navigate("/dashboard/website")} />
          <LanguageItem
            value={(site as any)?.site_language ?? null}
            onChange={(v) => onSiteChange({ site_language: v })}
          />
          <Item icon={Store} label="Showcase" onClick={() => { setView("shop"); onShowcasePreviewChange?.(true); }} />
          <Item icon={Search} label="SEO Manager" onClick={() => { setView("seo"); onShowcasePreviewChange?.(false); }} />
          <Item icon={BookOpen} label="Blog" onClick={() => { setView("blog"); onShowcasePreviewChange?.(false); }} />
          <Item icon={Share2} label="Social" onClick={() => { setView("social"); onShowcasePreviewChange?.(false); }} />
          <Item icon={Scale} label="Legal (Terms & Privacy)" onClick={() => setLegalOpen(true)} />
          <Item icon={BarChart3} label="Tracking & Analytics" onClick={() => setTrackingOpen(true)} />
          <Item icon={Settings2} label="Advanced" onClick={() => setAdvancedOpen(true)} />
        </Section>

        {/* TOOLS */}
        <Section title="Tools">
          <Item icon={Inbox} label="Form Submissions" onClick={() => { setView("forms"); onShowcasePreviewChange?.(false); }} />
          <Item icon={FileText} label="Draft Sites" onClick={() => { setView("drafts"); onShowcasePreviewChange?.(false); }} />
          <Item icon={Trash2} label="Trash" onClick={() => { setView("trash"); onShowcasePreviewChange?.(false); }} />
        </Section>
      </div>

      <TrackingModal
        open={trackingOpen}
        onOpenChange={setTrackingOpen}
        initial={{
          google_analytics_id: site?.google_analytics_id ?? null,
          facebook_pixel_id: site?.facebook_pixel_id ?? null,
          custom_head_html: site?.custom_head_html ?? null,
        }}
        onSave={async (patch) => onSiteChange(patch)}
      />
      <AdvancedModal
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        photographerId={photographerId}
        initial={{
          custom_css: site?.custom_css ?? null,
          custom_body_html: site?.custom_body_html ?? null,
          favicon_url: (site as any)?.faviconUrl ?? site?.favicon_url ?? null,
          redirects: site?.redirects ?? [],
        }}
        onSave={async (patch) => onSiteChange(patch)}
      />
      <LegalModal open={legalOpen} onOpenChange={setLegalOpen} site={site} onSiteChange={onSiteChange} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium px-2 mb-1">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Item({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-2 py-2 rounded text-xs transition-colors",
        "text-foreground hover:bg-muted/50"
      )}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
    </button>
  );
}

function LanguageItem({ value, onChange }: { value: "en" | "pt" | "es" | null; onChange: (v: "en" | "pt" | "es") => void }) {
  const options: Array<{ v: "en" | "pt" | "es"; label: string }> = [
    { v: "en", label: "English" },
    { v: "pt", label: "Português" },
    { v: "es", label: "Español" },
  ];
  const current = value ?? "en";
  return (
    <div className="px-2 py-2 rounded">
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-2 text-xs text-foreground">
          <Languages className="h-3.5 w-3.5 text-muted-foreground" />
          Site Language
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={cn(
              "px-2 py-1.5 text-[10px] tracking-wide uppercase border rounded transition-colors",
              current === o.v
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5">
        Public site is always shown in this language.
      </p>
    </div>
  );
}
