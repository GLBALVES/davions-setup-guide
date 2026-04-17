import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Page = {
  id: string;
  title: string;
  slug: string;
  page_content: any;
};

export default function SeoSubPanel({
  photographerId,
  site,
  onSiteChange,
}: {
  photographerId: string | null;
  site: Record<string, any> | null;
  onSiteChange: (patch: Record<string, any>) => void;
}) {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>("__site__");

  useEffect(() => {
    if (!photographerId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("site_pages")
        .select("id, title, slug, page_content")
        .eq("photographer_id", photographerId)
        .is("deleted_at", null)
        .order("sort_order");
      setPages((data || []) as Page[]);
      setLoading(false);
    })();
  }, [photographerId]);

  const updatePageSeo = async (pageId: string, patch: Record<string, string>) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    const newContent = {
      ...(page.page_content || {}),
      seo: { ...((page.page_content?.seo) || {}), ...patch },
    };
    const { error } = await supabase
      .from("site_pages")
      .update({ page_content: newContent })
      .eq("id", pageId);
    if (error) {
      toast.error("Failed to save");
      return;
    }
    setPages(pages.map((p) => (p.id === pageId ? { ...p, page_content: newContent } : p)));
  };

  return (
    <div className="p-4 space-y-2 overflow-y-auto h-full">
      <p className="text-[11px] text-muted-foreground mb-2">
        Search engine optimization for your site and individual pages.
      </p>

      {/* Site-wide SEO */}
      <SeoCard
        title="Site Defaults"
        open={openId === "__site__"}
        onToggle={() => setOpenId(openId === "__site__" ? null : "__site__")}
        title_value={site?.seo_title || ""}
        desc_value={site?.seo_description || ""}
        onTitleChange={(v) => onSiteChange({ seo_title: v || null })}
        onDescChange={(v) => onSiteChange({ seo_description: v || null })}
      />

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        pages.map((p) => {
          const seo = (p.page_content?.seo) || {};
          return (
            <SeoCard
              key={p.id}
              title={p.title}
              subtitle={`/${p.slug}`}
              open={openId === p.id}
              onToggle={() => setOpenId(openId === p.id ? null : p.id)}
              title_value={seo.title || ""}
              desc_value={seo.description || ""}
              onTitleChange={(v) => updatePageSeo(p.id, { title: v })}
              onDescChange={(v) => updatePageSeo(p.id, { description: v })}
            />
          );
        })
      )}
    </div>
  );
}

function SeoCard({
  title,
  subtitle,
  open,
  onToggle,
  title_value,
  desc_value,
  onTitleChange,
  onDescChange,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  title_value: string;
  desc_value: string;
  onTitleChange: (v: string) => void;
  onDescChange: (v: string) => void;
}) {
  const [t, setT] = useState(title_value);
  const [d, setD] = useState(desc_value);

  useEffect(() => {
    setT(title_value);
    setD(desc_value);
  }, [title_value, desc_value]);

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2.5 hover:bg-muted/40 transition-colors text-left"
      >
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{title}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>}
        </div>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="p-3 space-y-2 border-t border-border bg-muted/20">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Meta Title</Label>
            <Input
              value={t}
              onChange={(e) => setT(e.target.value)}
              onBlur={() => t !== title_value && onTitleChange(t)}
              placeholder="Page title for search engines"
              className="h-8 text-xs"
              maxLength={60}
            />
            <p className="text-[10px] text-muted-foreground">{t.length}/60</p>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Meta Description</Label>
            <Textarea
              value={d}
              onChange={(e) => setD(e.target.value)}
              onBlur={() => d !== desc_value && onDescChange(d)}
              placeholder="Brief summary for search results"
              className="text-xs min-h-[60px]"
              maxLength={160}
            />
            <p className="text-[10px] text-muted-foreground">{d.length}/160</p>
          </div>
        </div>
      )}
    </div>
  );
}
