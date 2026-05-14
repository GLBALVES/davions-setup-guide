import { useState } from "react";
import { Loader2, Copy, ExternalLink, CheckCircle2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePagarmeI18n } from "./pagarme-i18n";

interface Props {
  checkoutInput: Record<string, unknown>;
  amount: number;
  onPaid: (redirectUrl: string) => void;
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");

export function PagarmeBoletoTab({ checkoutInput, amount, onPaid }: Props) {
  const t = usePagarmeI18n();
  const { toast } = useToast();
  const [doc, setDoc] = useState((checkoutInput as any)?.clientTaxId ?? "");
  const [street, setStreet] = useState("");
  const [num, setNum] = useState("");
  const [hood, setHood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    line: string | null;
    pdf_url: string | null;
    redirect_url: string;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!onlyDigits(doc) || !street || !num || !zip || !city || !state) {
      setErr("Preencha todos os campos");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        ...checkoutInput,
        clientTaxId: doc,
        billing_address: {
          line_1: `${num}, ${street}, ${hood}`,
          zip_code: onlyDigits(zip),
          city,
          state,
          country: "BR",
        },
      };
      const { data, error } = await supabase.functions.invoke(
        "pagarme-create-boleto-order",
        { body }
      );
      if (error) throw error;
      const r = data as any;
      if (r?.error) throw new Error(r.error);
      if (r?.free) { onPaid(r.redirect_url); return; }
      setResult(r);
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao gerar boleto");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-4 py-2">
        <div className="flex items-center gap-2 rounded-md border bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" /> {t.boletoNote}
        </div>

        {result.line && (
          <div className="space-y-2">
            <Label>{t.boletoLine}</Label>
            <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs break-all">
              {result.line}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(result.line!);
                toast({ description: t.pixCopied });
              }}
              className="w-full"
            >
              <Copy className="mr-2 h-4 w-4" /> {t.boletoCopy}
            </Button>
          </div>
        )}

        {result.pdf_url && (
          <Button asChild variant="default" className="w-full">
            <a href={result.pdf_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> {t.boletoOpenPdf}
            </a>
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 py-2">
      <div className="space-y-2">
        <Label>{t.boletoCpf}</Label>
        <Input value={doc} onChange={(e) => setDoc(onlyDigits(e.target.value).slice(0, 14))} />
      </div>
      <div className="grid grid-cols-[1fr_100px] gap-2">
        <div className="space-y-2">
          <Label>{t.boletoStreet}</Label>
          <Input value={street} onChange={(e) => setStreet(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t.boletoNumber}</Label>
          <Input value={num} onChange={(e) => setNum(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t.boletoNeighborhood}</Label>
        <Input value={hood} onChange={(e) => setHood(e.target.value)} />
      </div>
      <div className="grid grid-cols-[1fr_80px_120px] gap-2">
        <div className="space-y-2">
          <Label>{t.boletoCity}</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t.boletoState}</Label>
          <Input value={state} maxLength={2} onChange={(e) => setState(e.target.value.toUpperCase())} />
        </div>
        <div className="space-y-2">
          <Label>{t.boletoZip}</Label>
          <Input value={zip} onChange={(e) => setZip(onlyDigits(e.target.value).slice(0, 8))} />
        </div>
      </div>

      {err && <p className="text-sm text-destructive">{err}</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t.generating}</>
        ) : (
          <><FileText className="mr-2 h-4 w-4" /> {t.boletoGenerate}</>
        )}
      </Button>
    </form>
  );
}
