import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, RefreshCw, Webhook, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Event = {
  id: string;
  provider: string;
  event_type: string | null;
  external_id: string | null;
  status: string;
  error_message: string | null;
  payload: any;
  duration_ms: number | null;
  created_at: string;
};

type Filter = "all" | "stripe" | "pagarme" | "errors";

export default function AdminWebhookEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let q = (supabase as any)
      .from("webhook_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (filter === "stripe") q = q.eq("provider", "stripe");
    else if (filter === "pagarme") q = q.eq("provider", "pagarme");
    else if (filter === "errors") q = q.eq("status", "error");

    const { data, error } = await q;
    if (!error && data) setEvents(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const counts = {
    success: events.filter((e) => e.status === "success").length,
    error: events.filter((e) => e.status === "error").length,
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Webhook className="text-muted-foreground" size={18} />
            <div>
              <h1 className="text-xl font-light tracking-wide">Webhook Events</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Últimos 200 eventos · {counts.success} sucesso · {counts.error} erros
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw size={12} className={cn("mr-2", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        <div className="flex gap-2 mb-4">
          {(["all", "stripe", "pagarme", "errors"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-md border transition-colors",
                filter === f
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "all" ? "Todos" : f === "errors" ? "Apenas erros" : f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={18} />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
            Nenhum evento registrado ainda.
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            {events.map((evt) => {
              const isOpen = expanded === evt.id;
              return (
                <div key={evt.id} className="border-b border-border last:border-0">
                  <button
                    onClick={() => setExpanded(isOpen ? null : evt.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                  >
                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    {evt.status === "success" ? (
                      <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-destructive shrink-0" />
                    )}
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-medium shrink-0",
                        evt.provider === "stripe"
                          ? "bg-violet-100 text-violet-800"
                          : evt.provider === "pagarme"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {evt.provider}
                    </span>
                    <span className="font-mono text-xs flex-1 truncate">
                      {evt.event_type || "—"}
                    </span>
                    {evt.duration_ms != null && (
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                        {evt.duration_ms}ms
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                      {new Date(evt.created_at).toLocaleString()}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 bg-muted/20 space-y-2">
                      {evt.external_id && (
                        <div className="text-[11px]">
                          <span className="text-muted-foreground">ID externo: </span>
                          <code className="font-mono">{evt.external_id}</code>
                        </div>
                      )}
                      {evt.error_message && (
                        <div className="text-[11px] p-2 rounded bg-destructive/10 text-destructive font-mono">
                          {evt.error_message}
                        </div>
                      )}
                      {evt.payload && (
                        <pre className="text-[10px] font-mono bg-background border border-border rounded p-3 overflow-x-auto max-h-80">
                          {JSON.stringify(evt.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
