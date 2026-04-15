import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Link2, Paintbrush, Settings, ChevronLeft, Eye, MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ── Tab definitions ───────────────────────────────────────────────────────────
type EditorTab = "pages" | "blog" | "style" | "settings";

const TABS: { id: EditorTab; icon: React.ElementType; label: string }[] = [
  { id: "pages", icon: FileText, label: "Pages" },
  { id: "blog", icon: Link2, label: "Blog" },
  { id: "style", icon: Paintbrush, label: "Style" },
  { id: "settings", icon: Settings, label: "Settings" },
];

// ── Placeholder panels ───────────────────────────────────────────────────────
const PagesPanel = () => (
  <div className="flex flex-col h-full">
    <div className="flex items-center justify-between px-4 py-3">
      <h3 className="text-sm font-medium text-foreground">Pages</h3>
      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary hover:text-primary">
        <Plus className="h-3.5 w-3.5" />
        Add Page
      </Button>
    </div>

    <div className="px-4 pb-2">
      <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Site Menu</p>
    </div>

    <nav className="flex-1 overflow-y-auto px-2">
      {/* Placeholder pages */}
      <PageItem label="Home" icon="🏠" active />
      <PageGroup label="The Experience">
        <PageItem label="About" />
        <PageItem label="The Studio" />
      </PageGroup>
      <PageGroup label="Investment">
        <PageItem label="Sessions" />
        <PageItem label="Online Booking" />
      </PageGroup>
      <PageItem label="Blog" icon="🔗" />
      <PageItem label="Contact" />
    </nav>

    {/* Bottom actions */}
    <div className="border-t border-border p-3 flex gap-2">
      <Button variant="outline" size="sm" className="flex-1 text-xs">
        Preview
      </Button>
      <Button size="sm" className="flex-1 text-xs bg-primary text-primary-foreground">
        Publish
      </Button>
    </div>
  </div>
);

const PageItem = ({ label, icon, active }: { label: string; icon?: string; active?: boolean }) => (
  <div
    className={cn(
      "flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors",
      active ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
    )}
  >
    {icon ? (
      <span className="text-xs">{icon}</span>
    ) : (
      <FileText className="h-3.5 w-3.5 shrink-0" />
    )}
    <span className="truncate flex-1">{label}</span>
    {active && (
      <button className="p-0.5 hover:bg-muted rounded">
        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    )}
  </div>
);

const PageGroup = ({ label, children }: { label: string; children: React.ReactNode }) => {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 px-3 py-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <FileText className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate flex-1 text-left">{label}</span>
        <span className="text-[10px]">{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="pl-4">{children}</div>}
    </div>
  );
};

const BlogPanel = () => (
  <div className="p-4 space-y-4">
    <h3 className="text-sm font-medium text-foreground">Blog</h3>
    <p className="text-xs text-muted-foreground">Manage your blog posts and settings.</p>
    <div className="space-y-2">
      <div className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors">
        <p className="text-xs font-medium">Posts</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Create and manage blog posts</p>
      </div>
      <div className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors">
        <p className="text-xs font-medium">Categories</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Organize posts by category</p>
      </div>
      <div className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors">
        <p className="text-xs font-medium">Settings</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Blog layout and display options</p>
      </div>
    </div>
  </div>
);

const StylePanel = () => (
  <div className="p-4 space-y-4">
    <h3 className="text-sm font-medium text-foreground">Style</h3>
    <p className="text-xs text-muted-foreground">Customize your site's appearance.</p>
    <div className="space-y-2">
      <div className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors">
        <p className="text-xs font-medium">Template</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Change your site layout</p>
      </div>
      <div className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors">
        <p className="text-xs font-medium">Colors</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Accent color and palette</p>
      </div>
      <div className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors">
        <p className="text-xs font-medium">Typography</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Font choices and sizing</p>
      </div>
    </div>
  </div>
);

const SettingsPanel = () => (
  <div className="p-4 space-y-4">
    <h3 className="text-sm font-medium text-foreground">Settings</h3>
    <p className="text-xs text-muted-foreground">General website configuration.</p>
    <div className="space-y-2">
      <div className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors">
        <p className="text-xs font-medium">Domain</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Custom domain and store URL</p>
      </div>
      <div className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors">
        <p className="text-xs font-medium">SEO</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Search engine optimization</p>
      </div>
      <div className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors">
        <p className="text-xs font-medium">Analytics</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Google Analytics & Facebook Pixel</p>
      </div>
      <div className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors">
        <p className="text-xs font-medium">Social Media</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Connected social profiles</p>
      </div>
    </div>
  </div>
);

// ── Main Editor ──────────────────────────────────────────────────────────────
const WebsiteEditor = () => {
  const [activeTab, setActiveTab] = useState<EditorTab>("pages");
  const navigate = useNavigate();
  const { user } = useAuth();

  const panelMap: Record<EditorTab, React.ReactNode> = {
    pages: <PagesPanel />,
    blog: <BlogPanel />,
    style: <StylePanel />,
    settings: <SettingsPanel />,
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* ── Icon tab strip ── */}
      <div className="w-12 border-r border-border bg-card flex flex-col items-center shrink-0">
        {/* Back button */}
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

        {/* Tab icons */}
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
                      isActive
                        ? "text-foreground bg-muted/60"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-foreground rounded-r" />
                    )}
                    <Icon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">{tab.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* ── Sidebar panel ── */}
      <div className="w-[260px] border-r border-border bg-card flex flex-col shrink-0 overflow-hidden">
        {panelMap[activeTab]}
      </div>

      {/* ── Preview area ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-muted/20">
        {/* Preview toolbar */}
        <div className="h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {TABS.find(t => t.id === activeTab)?.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1.5"
              onClick={() => {
                const slug = (user as any)?.user_metadata?.store_slug;
                if (slug) window.open(`/store/${slug}`, "_blank");
              }}
            >
              <Eye className="h-3 w-3" />
              Preview
            </Button>
          </div>
        </div>

        {/* Preview placeholder */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted/60 flex items-center justify-center">
              <Eye className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm text-muted-foreground">Live preview will appear here</p>
            <p className="text-xs text-muted-foreground/60">Select a page from the sidebar to start editing</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebsiteEditor;
