import { useMemo, useState } from "react";
import { Loader2, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePagarmeI18n } from "./pagarme-i18n";

interface Props {
  checkoutInput: Record<string, unknown>;
  amount: number; // cents
  onPaid: (redirectUrl: string) => void;
}

const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const onlyDigits = (s: string) => s.replace(/\D/g, "");

const formatCardNumber = (s: string) =>
  onlyDigits(s).slice(0, 19).replace(/(.{4})/g, "$1 ").trim();

const formatExpiry = (s: string) => {
  const d = onlyDigits(s).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

export function PagarmeCardTab({ checkoutInput, amount, onPaid }: Props) {
  const t = usePagarmeI18n();
  const { toast } = useToast();
  const [number, setNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [doc, setDoc] = useState("");
  const [installments, setInstallments] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const installmentOptions = useMemo(() => {
    const max = Math.min(12, Math.max(1, Math.floor(amount / 1000))); // ≥ R$10/parcel
    return Array.from({ length: max }, (_, i) => {
      const n = i + 1;
      const each = Math.round(amount / n);
      return { value: String(n), label: `${n}x ${formatBRL(each)} ${t.interestFree}` };
    });
  }, [amount, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg(null);
    const cleanNum = onlyDigits(number);
    const [mm, yy] = expiry.split("/");
    if (cleanNum.length < 13 || !mm || !yy || cvv.length < 3 || !holder) {
      setErrMsg("Preencha os dados do cartão corretamente");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "pagarme-create-card-order",
        {
          body: {
            ...checkoutInput,
            installments: Number(installments),
            card: {
              number: cleanNum,
              holder_name: holder.toUpperCase(),
              exp_month: Number(mm),
              exp_year: Number(yy.length === 2 ? `20${yy}` : yy),
              cvv,
              holder_document: onlyDigits(doc) || undefined,
            },
          },
        }
      );
      if (error) throw error;
      const resp = data as any;
      if (resp?.error) throw new Error(resp.error);
      if (resp?.status === "paid" || resp?.free) {
        setSuccess(true);
        toast({ description: t.cardSuccess });
        setTimeout(() => onPaid(resp.redirect_url), 1000);
      } else if (resp?.status === "failed") {
        setErrMsg(resp.error ?? t.cardDeclined);
      } else {
        setErrMsg(`${resp?.status ?? "pending"}: ${t.cardProcessing}`);
      }
    } catch (e: any) {
      setErrMsg(e?.message ?? t.cardDeclined);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        <p className="font-medium">{t.cardSuccess}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="cc-number">{t.cardNumber}</Label>
        <Input
          id="cc-number"
          inputMode="numeric"
          autoComplete="cc-number"
          value={number}
          onChange={(e) => setNumber(formatCardNumber(e.target.value))}
          placeholder="0000 0000 0000 0000"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cc-holder">{t.cardHolder}</Label>
        <Input
          id="cc-holder"
          autoComplete="cc-name"
          value={holder}
          onChange={(e) => setHolder(e.target.value.toUpperCase())}
          placeholder="NOME COMPLETO"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cc-exp">{t.cardExpiry}</Label>
          <Input
            id="cc-exp"
            inputMode="numeric"
            autoComplete="cc-exp"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            placeholder="MM/AA"
            maxLength={5}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cc-cvv">{t.cardCvv}</Label>
          <Input
            id="cc-cvv"
            inputMode="numeric"
            autoComplete="cc-csc"
            value={cvv}
            onChange={(e) => setCvv(onlyDigits(e.target.value).slice(0, 4))}
            placeholder="123"
            maxLength={4}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cc-doc">{t.cardCpf}</Label>
        <Input
          id="cc-doc"
          inputMode="numeric"
          value={doc}
          onChange={(e) => setDoc(onlyDigits(e.target.value).slice(0, 14))}
          placeholder="000.000.000-00"
        />
      </div>

      <div className="space-y-2">
        <Label>{t.cardInstallments}</Label>
        <Select value={installments} onValueChange={setInstallments}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="z-[60]">
            {installmentOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {errMsg && <p className="text-sm text-destructive">{errMsg}</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t.cardProcessing}</>
        ) : (
          <><Lock className="mr-2 h-4 w-4" /> {t.cardPay} · {formatBRL(amount)}</>
        )}
      </Button>
    </form>
  );
}
