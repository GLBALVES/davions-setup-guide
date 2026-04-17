import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Page = { id: string; title: string; slug: string; updated_at: string };

export default function DraftsSubPanel({
  photographerId,
}: {
  photographerId: string | null;
}) {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!photographerId) return;
    setLoading(true);
    const { data } = await supabase
      .from("site_pages")
      .select("id, title, slug, updated_at")
      .eq("photographer_id", photographerId)
      .eq("is_visible", false)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    setPages((data || []) as Page[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [photographerId]);

  const publish = async (id: string) => {
    const { error } = await supabase
      .from("site_pages")
      .update({ is_visible: true })
      .eq("id", id);
    if (error) {
      toast.error("Failed to publish");
      return;
    }
    toast.success("Page published");
    load();
  };

  return (
    <div className="p-4 space-y-3 overflow-y-auto h-full">
      <p className="text-[11px] text-muted-foreground">
        Pages hidden from your public site. Publish to make them visible.
      </p>
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-8 text-[11px] text-muted-foreground/70">
          No draft pages.
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map((p) => (
            <div key={p.id} className="border border-border rounded-md p-2.5 space-y-2">
              <div className="flex items-start gap-2 min-w-0">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{p.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">/{p.slug}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-[11px]"
                onClick={() => publish(p.id)}
              >
                Publish
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
