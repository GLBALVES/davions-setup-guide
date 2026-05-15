import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, QrCode, CreditCard, FileText, ArrowLeft, ChevronRight } from "lucide-react";
import { PagarmePixTab } from "./PagarmePixTab";
import { PagarmeCardTab } from "./PagarmeCardTab";
import { PagarmeBoletoTab } from "./PagarmeBoletoTab";
import { usePagarmeI18n } from "./pagarme-i18n";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  checkoutInput: Record<string, unknown>;
  amount: number; // cents (deposit or full)
  isDeposit?: boolean;
  onPaid: (redirectUrl: string) => void;
}

type Method = "pix" | "card" | "boleto" | null;

const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PagarmeCheckoutModal({
  open,
  onOpenChange,
  checkoutInput,
  amount,
  isDeposit,
  onPaid,
}: Props) {
  const t = usePagarmeI18n();
  const [method, setMethod] = useState<Method>(null);

  // Reset selection whenever the modal closes so reopening starts fresh.
  useEffect(() => {
    if (!open) setMethod(null);
  }, [open]);

  const options: Array<{ id: Exclude<Method, null>; icon: typeof QrCode; label: string }> = [
    { id: "pix", icon: QrCode, label: t.pix },
    { id: "card", icon: CreditCard, label: t.creditCard },
    { id: "boleto", icon: FileText, label: t.boleto },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="border-b px-5 py-4">
          <div className="flex items-center gap-2">
            {method && (
              <button
                type="button"
                onClick={() => setMethod(null)}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <DialogTitle className="text-base font-medium">{t.title}</DialogTitle>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {isDeposit ? t.deposit : t.total}
            </span>
            <span className="text-xl font-semibold">{formatBRL(amount)}</span>
          </div>
        </DialogHeader>

        <div className="px-5 py-4">
          {method === null && (
            <div className="flex flex-col gap-2">
              {options.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMethod(opt.id)}
                    className="flex items-center justify-between rounded-md border bg-background px-4 py-3 text-left transition hover:border-foreground/30 hover:bg-muted/40"
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}

          {method === "pix" && (
            <PagarmePixTab checkoutInput={checkoutInput} onPaid={onPaid} />
          )}
          {method === "card" && (
            <PagarmeCardTab checkoutInput={checkoutInput} amount={amount} onPaid={onPaid} />
          )}
          {method === "boleto" && (
            <PagarmeBoletoTab checkoutInput={checkoutInput} amount={amount} onPaid={onPaid} />
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 border-t bg-muted/30 px-5 py-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> {t.secure}
        </div>
      </DialogContent>
    </Dialog>
  );
}
