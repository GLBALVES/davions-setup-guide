import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, QrCode, CreditCard, FileText } from "lucide-react";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="text-base font-medium">{t.title}</DialogTitle>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {isDeposit ? t.deposit : t.total}
            </span>
            <span className="text-xl font-semibold">{formatBRL(amount)}</span>
          </div>
        </DialogHeader>

        <div className="px-5 py-4">
          <Tabs defaultValue="pix">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pix" className="gap-1.5">
                <QrCode className="h-3.5 w-3.5" /> {t.pix}
              </TabsTrigger>
              <TabsTrigger value="card" className="gap-1.5">
                <CreditCard className="h-3.5 w-3.5" /> {t.creditCard}
              </TabsTrigger>
              <TabsTrigger value="boleto" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" /> {t.boleto}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pix" className="mt-4">
              {open && <PagarmePixTab checkoutInput={checkoutInput} onPaid={onPaid} />}
            </TabsContent>
            <TabsContent value="card" className="mt-4">
              <PagarmeCardTab checkoutInput={checkoutInput} amount={amount} onPaid={onPaid} />
            </TabsContent>
            <TabsContent value="boleto" className="mt-4">
              <PagarmeBoletoTab checkoutInput={checkoutInput} amount={amount} onPaid={onPaid} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex items-center justify-center gap-1.5 border-t bg-muted/30 px-5 py-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> {t.secure}
        </div>
      </DialogContent>
    </Dialog>
  );
}
