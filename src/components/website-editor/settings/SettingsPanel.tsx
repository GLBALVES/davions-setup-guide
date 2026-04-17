import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Globe, Search, BookOpen, Share2, BarChart3, Settings2, Inbox, FileText, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import TrackingModal from "./TrackingModal";
import AdvancedModal from "./AdvancedModal";
import SeoSubPanel from "./SeoSubPanel";
import BlogSubPanel from "./BlogSubPanel";
import SocialSubPanel from "./SocialSubPanel";
import DraftsSubPanel from "./DraftsSubPanel";
import TrashSubPanel from "./TrashSubPanel";
import FormSubmissionsSubPanel from "./FormSubmissionsSubPanel";

type SubView = null | "seo" | "blog" | "social" | "drafts" | "trash" | "forms";

export default function SettingsPanel({
  photographerId,
  site,
  onSiteChange,
}: {
  photographerId: string | null;
  site: Record<string, any> | null;
  onSiteChange: (patch: Record<string, any>) => void;
}) {
  const navigate = useNavigate();
  const [view, setView] = useState<SubView>(null);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  if (view) {
    const titles: Record<Exclude<SubView, null>, string> = {
      seo: "SEO Manager",
      blog: "Blog",
      social: "Social",
      drafts: "Draft Sites",
      trash: "Trash",
      forms: "Form Submissions",
    };
    return (
      <div className="flex flex-col h-full">
        <div className="h-10 border-b border-border flex items-center px-2 shrink-0">
          <button
            onClick={() => setView(null)}
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
        </div>
      </div>
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
          <Item icon={Search} label="SEO Manager" onClick={() => setView("seo")} />
          <Item icon={BookOpen} label="Blog" onClick={() => setView("blog")} />
          <Item icon={Share2} label="Social" onClick={() => setView("social")} />
          <Item icon={BarChart3} label="Tracking & Analytics" onClick={() => setTrackingOpen(true)} />
          <Item icon={Settings2} label="Advanced" onClick={() => setAdvancedOpen(true)} />
        </Section>

        {/* TOOLS */}
        <Section title="Tools">
          <Item icon={Inbox} label="Form Submissions" onClick={() => setView("forms")} />
          <Item icon={FileText} label="Draft Sites" onClick={() => setView("drafts")} />
          <Item icon={Trash2} label="Trash" onClick={() => setView("trash")} />
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
          favicon_url: site?.favicon_url ?? null,
          redirects: site?.redirects ?? [],
        }}
        onSave={async (patch) => onSiteChange(patch)}
      />
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
