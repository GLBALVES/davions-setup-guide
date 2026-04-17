import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type Page = { id: string; title: string; slug: string; deleted_at: string };

export default function TrashSubPanel({
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
      .select("id, title, slug, deleted_at")
      .eq("photographer_id", photographerId)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    setPages((data || []) as Page[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [photographerId]);

  const restore = async (id: string) => {
    const { error } = await supabase
      .from("site_pages")
      .update({ deleted_at: null })
      .eq("id", id);
    if (error) {
      toast.error("Failed to restore");
      return;
    }
    toast.success("Page restored");
    load();
  };

  const purge = async (id: string) => {
    const { error } = await supabase.from("site_pages").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Page permanently deleted");
    load();
  };

  const emptyTrash = async () => {
    if (!photographerId) return;
    const { error } = await supabase
      .from("site_pages")
      .delete()
      .eq("photographer_id", photographerId)
      .not("deleted_at", "is", null);
    if (error) {
      toast.error("Failed to empty trash");
      return;
    }
    toast.success("Trash emptied");
    load();
  };

  return (
    <div className="p-4 space-y-3 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          Deleted pages. Restore or remove permanently.
        </p>
        {pages.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-[11px] text-destructive hover:underline">
                Empty
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Empty trash?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {pages.length} pages in trash. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={emptyTrash}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Empty trash
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-8 text-[11px] text-muted-foreground/70">
          Trash is empty.
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
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-[11px]"
                  onClick={() => restore(p.id)}
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Restore
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => purge(p.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
