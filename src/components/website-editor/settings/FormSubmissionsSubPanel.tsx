import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Inbox, Trash2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type Submission = {
  id: string;
  form_label: string;
  page_title: string;
  data: Record<string, any>;
  created_at: string;
  read_at: string | null;
};

export default function FormSubmissionsSubPanel({
  photographerId,
}: {
  photographerId: string | null;
}) {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    if (!photographerId) return;
    setLoading(true);
    const { data } = await supabase
      .from("form_submissions")
      .select("id, form_label, page_title, data, created_at, read_at")
      .eq("photographer_id", photographerId)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data || []) as Submission[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [photographerId]);

  const markRead = async (id: string) => {
    await supabase.from("form_submissions").update({ read_at: new Date().toISOString() }).eq("id", id);
    setItems(items.map((s) => (s.id === id ? { ...s, read_at: new Date().toISOString() } : s)));
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("form_submissions").update({ archived: true }).eq("id", id);
    if (error) {
      toast.error("Failed");
      return;
    }
    setItems(items.filter((s) => s.id !== id));
  };

  return (
    <div className="p-4 space-y-3 overflow-y-auto h-full">
      <p className="text-[11px] text-muted-foreground">
        Messages sent through forms on your public site.
      </p>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <Inbox className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="text-[11px] text-muted-foreground/70">No submissions yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((s) => (
            <div key={s.id} className="border border-border rounded-md overflow-hidden">
              <button
                onClick={() => {
                  setOpenId(openId === s.id ? null : s.id);
                  if (!s.read_at) markRead(s.id);
                }}
                className="w-full p-2.5 hover:bg-muted/40 transition-colors text-left"
              >
                <div className="flex items-start gap-2">
                  <Mail
                    className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${s.read_at ? "text-muted-foreground/40" : "text-primary"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs truncate ${s.read_at ? "" : "font-semibold"}`}>
                      {s.form_label}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {s.page_title || "—"} · {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
              {openId === s.id && (
                <div className="p-3 border-t border-border bg-muted/20 space-y-2">
                  {Object.entries(s.data || {}).map(([k, v]) => (
                    <div key={k} className="text-[11px]">
                      <span className="text-muted-foreground">{k}:</span>{" "}
                      <span className="break-words">{String(v)}</span>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10 w-full mt-1"
                    onClick={() => remove(s.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Archive
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
