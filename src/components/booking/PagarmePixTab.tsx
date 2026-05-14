import { useEffect, useRef, useState } from "react";
import { Loader2, Copy, CheckCircle2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePagarmeI18n } from "./pagarme-i18n";

interface Props {
  checkoutInput: Record<string, unknown>;
  onPaid: (redirectUrl: string) => void;
}

export function PagarmePixTab({ checkoutInput, onPaid }: Props) {
  const t = usePagarmeI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    qr_code_text: string | null;
    qr_code_url: string | null;
    expires_at: string | null;
    order_id: string;
    booking_id: string;
    redirect_url: string;
    amount: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);
  const [remaining, setRemaining] = useState<number>(3600);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: resp, error } = await supabase.functions.invoke(
          "pagarme-create-pix-order",
          { body: checkoutInput }
        );
        if (cancelled) return;
        if (error) throw error;
        if ((resp as any)?.error) throw new Error((resp as any).error);
        if ((resp as any)?.free) {
          onPaid((resp as any).redirect_url);
          return;
        }
        setData(resp as any);
      } catch (e: any) {
        setError(e?.message ?? "Failed to create Pix order");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  // Poll status
  useEffect(() => {
    if (!data?.order_id || paid) return;
    pollRef.current = window.setInterval(async () => {
      try {
        const { data: status } = await supabase.functions.invoke(
          "pagarme-check-order-status",
          { body: { orderId: data.order_id, bookingId: data.booking_id } }
        );
        if ((status as any)?.status === "paid") {
          setPaid(true);
          if (pollRef.current) window.clearInterval(pollRef.current);
          setTimeout(() => onPaid(data.redirect_url), 1200);
        }
      } catch { /* ignore */ }
    }, 4000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [data?.order_id, paid]);

  // Countdown
  useEffect(() => {
    if (!data?.expires_at) return;
    const expires = new Date(data.expires_at).getTime();
    const tick = () => setRemaining(Math.max(0, Math.round((expires - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [data?.expires_at]);

  const copy = () => {
    if (!data?.qr_code_text) return;
    navigator.clipboard.writeText(data.qr_code_text);
    setCopied(true);
    toast({ description: t.pixCopied });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return <p className="py-8 text-center text-sm text-destructive">{error}</p>;
  }
  if (!data) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <p className="text-center text-sm text-muted-foreground">{t.pixInstructions}</p>

      {data.qr_code_url ? (
        <img
          src={data.qr_code_url}
          alt="Pix QR Code"
          className="h-56 w-56 rounded-lg border bg-white p-2"
        />
      ) : (
        <div className="flex h-56 w-56 items-center justify-center rounded-lg border bg-muted">
          <QrCode className="h-16 w-16 text-muted-foreground" />
        </div>
      )}

      {data.qr_code_text && (
        <div className="w-full">
          <div className="rounded-md border bg-muted/40 p-3 text-xs break-all font-mono text-muted-foreground max-h-24 overflow-auto">
            {data.qr_code_text}
          </div>
          <Button onClick={copy} variant="outline" size="sm" className="mt-2 w-full">
            {copied ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? t.pixCopied : t.pixCopy}
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        {paid ? (
          <span className="flex items-center gap-2 font-medium text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> {t.pixPaid}
          </span>
        ) : (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">{t.pixWaiting}</span>
            {data.expires_at && (
              <span className="text-muted-foreground">
                · {t.pixExpiresIn} {mins}:{String(secs).padStart(2, "0")}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
