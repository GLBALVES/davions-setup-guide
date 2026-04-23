import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { getShopDefaults } from "@/lib/shop-defaults";

const LAYOUT_OPTIONS: { value: "grid-3" | "grid-4" | "grid-2-feature"; label: string }[] = [
  { value: "grid-3", label: "3 cols" },
  { value: "grid-4", label: "4 cols" },
  { value: "grid-2-feature", label: "Featured" },
];

export default function ShopSubPanel({
  site,
  onSiteChange,
  storeSlug,
}: {
  site: Record<string, any> | null;
  onSiteChange: (patch: Record<string, any>) => void;
  storeSlug?: string | null;
}) {
  const { lang } = useLanguage();
  const d = getShopDefaults(lang);

  const enabled = site?.show_store === true;
  const showSessions = site?.shop_show_sessions !== false;
  const showGalleries = site?.shop_show_galleries !== false;
  const layout = (site?.shop_layout as string) || "grid-3";

  const publicUrl = storeSlug ? `/store/${storeSlug}/shop` : "/shop";

  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full">
      <p className="text-[11px] text-muted-foreground">
        Showcase your sessions and published galleries on a dedicated Shop page that visitors can
        access from the site menu.
      </p>

      {/* Master toggle */}
      <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2.5">
        <div className="min-w-0">
          <Label className="text-xs font-medium block">Enable Shop</Label>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Adds a "{d.navLabel}" link to your menu and footer.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => onSiteChange({ show_store: v })}
        />
      </div>

      {enabled && (
        <>
          {/* Page title + description */}
          <div className="space-y-1">
            <Label className="text-xs">Page title</Label>
            <Input
              value={site?.shop_title ?? ""}
              onChange={(e) => onSiteChange({ shop_title: e.target.value || null })}
              placeholder={d.pageTitle}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Subtitle / description</Label>
            <Textarea
              value={site?.shop_description ?? ""}
              onChange={(e) => onSiteChange({ shop_description: e.target.value || null })}
              placeholder={d.pageDescription}
              className="text-xs min-h-[60px]"
              rows={3}
            />
          </div>

          {/* Content toggles */}
          <div className="space-y-2 pt-1">
            <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">
              Content
            </p>
            <div className="flex items-center justify-between px-2 py-1.5">
              <Label className="text-xs">Show sessions</Label>
              <Switch
                checked={showSessions}
                onCheckedChange={(v) => onSiteChange({ shop_show_sessions: v })}
              />
            </div>
            <div className="flex items-center justify-between px-2 py-1.5">
              <Label className="text-xs">Show published galleries</Label>
              <Switch
                checked={showGalleries}
                onCheckedChange={(v) => onSiteChange({ shop_show_galleries: v })}
              />
            </div>
          </div>

          {/* Layout */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs">Default layout</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {LAYOUT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onSiteChange({ shop_layout: opt.value })}
                  className={`px-2 py-2 text-[10px] tracking-wide uppercase border rounded transition-colors ${
                    layout === opt.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Open public Shop */}
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 mt-2 text-[11px] font-medium border border-border rounded hover:bg-muted/50 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            View public Shop
          </a>
        </>
      )}
    </div>
  );
}
