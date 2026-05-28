import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

interface InvoiceInfo {
  id: string;
  description: string;
  amount: number;
  paid_amount: number;
  status: string;
  studio_name: string | null;
}

export default function InvoicePay() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [search] = useSearchParams();
  const status = search.get("status"); // "paid" | "cancelled" | null
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<InvoiceInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!invoiceId) return;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-invoice-public", {
          body: { invoice_id: invoiceId },
        });
        if (error) throw error;
        if (!data || (data as any).error) throw new Error((data as any)?.error || "Cobrança não encontrada");
        setInfo(data as InvoiceInfo);
      } catch (e: any) {
        setError(e?.message || "Erro ao carregar cobrança");
      } finally {
        setLoading(false);
      }
    })();
  }, [invoiceId]);

  const pay = async () => {
    if (!invoiceId) return;
    setRedirecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-invoice-payment-link", {
        body: { invoice_id: invoiceId, origin: window.location.origin },
      });
      if (error) throw error;
      if ((data as any)?.url) {
        window.location.href = (data as any).url;
      } else {
        throw new Error((data as any)?.error || "Erro ao criar link de pagamento");
      }
    } catch (e: any) {
      setError(e?.message || "Erro ao iniciar pagamento");
      setRedirecting(false);
    }
  };

  const due = info ? info.amount - info.paid_amount : 0;
  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md border border-border/60 rounded-md bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border/60 px-6 py-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {info?.studio_name ?? "Cobrança"}
          </p>
          <h1 className="text-lg font-light tracking-wide mt-1">Pagamento</h1>
        </div>

        <div className="px-6 py-6 flex flex-col gap-5">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <p className="text-sm text-foreground">{error}</p>
            </div>
          )}

          {!loading && info && status === "paid" && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              <p className="text-sm font-medium">Pagamento recebido</p>
              <p className="text-xs text-muted-foreground">
                Obrigado! Você pode fechar esta página.
              </p>
            </div>
          )}

          {!loading && info && info.status === "paid" && status !== "paid" && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              <p className="text-sm font-medium">Esta cobrança já foi paga</p>
            </div>
          )}

          {!loading && info && info.status !== "paid" && status !== "paid" && (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Descrição
                </span>
                <span className="text-sm">{info.description}</span>
              </div>

              <div className="flex items-baseline justify-between border-t border-border/60 pt-4">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Valor
                </span>
                <span className="text-2xl font-light">{fmt(due)}</span>
              </div>

              {status === "cancelled" && (
                <p className="text-xs text-amber-600 text-center">
                  Pagamento cancelado. Tente novamente quando quiser.
                </p>
              )}

              <Button onClick={pay} disabled={redirecting} className="h-11 text-xs tracking-widest uppercase">
                {redirecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Pagar agora"
                )}
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 border-t border-border/60 bg-muted/30 px-6 py-2.5 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3" /> Pagamento processado por Stripe
        </div>
      </div>
    </div>
  );
}
