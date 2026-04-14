import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

export interface AddonItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number; // cents
}

export interface SessionInfo {
  id: string;
  title: string;
  price: number; // cents
  tax_rate: number;
  deposit_enabled: boolean;
  deposit_amount: number;
  deposit_type: string; // "fixed" | "percentage"
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: AddonItem[];
  newSession: SessionInfo;
  depositAlreadyPaid: boolean;
  onConfirm: (keptItems: AddonItem[]) => void;
  confirming?: boolean;
}

export function AddonReviewModal({
  open, onOpenChange, items: initialItems, newSession, depositAlreadyPaid, onConfirm, confirming,
}: Props) {
  const { t } = useLanguage();
  const tp = t.projects;

  const [items, setItems] = useState<AddonItem[]>(() => initialItems.map((i) => ({ ...i })));

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const updateItem = (id: string, field: "quantity" | "unit_price", value: number) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i));
  };

  const extrasTotal = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unit_price, 0), [items]);
  const sessionPrice = newSession.price;
  const subtotal = sessionPrice + extrasTotal;
  const taxAmount = Math.round(subtotal * newSession.tax_rate / 100);
  const total = subtotal + taxAmount;

  const depositValue = useMemo(() => {
    if (!newSession.deposit_enabled) return 0;
    if (newSession.deposit_type === "percentage") return Math.round(total * newSession.deposit_amount / 100);
    return newSession.deposit_amount; // fixed, in cents
  }, [newSession, total]);

  const balance = depositAlreadyPaid ? total - depositValue : total;

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-light tracking-wide text-base">
            {tp.addonReviewTitle || "Review Add-ons"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {tp.addonReviewDesc || "Review existing add-ons before changing session. You can keep, edit or remove each item."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground italic text-center py-4">
              {tp.noAddonsToReview || "No add-ons to review"}
            </p>
          )}
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 p-2 border border-border/50 rounded-md bg-muted/20">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">Qty:</span>
                    <Input
                      type="number" min={1} value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-6 w-14 text-xs px-1.5"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">$</span>
                    <Input
                      type="number" min={0} step={0.01}
                      value={(item.unit_price / 100).toFixed(2)}
                      onChange={(e) => updateItem(item.id, "unit_price", Math.round((parseFloat(e.target.value) || 0) * 100))}
                      className="h-6 w-20 text-xs px-1.5"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-xs font-medium tabular-nums">{fmt(item.quantity * item.unit_price)}</span>
                <button
                  type="button" onClick={() => removeItem(item.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Financial summary */}
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tp.newSessionPrice || "Session price"}</span>
            <span className="font-medium tabular-nums">{fmt(sessionPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tp.extrasTotal || "Extras"}</span>
            <span className="font-medium tabular-nums">{fmt(extrasTotal)}</span>
          </div>
          {newSession.tax_rate > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tp.taxAmount || "Tax"} ({newSession.tax_rate}%)</span>
              <span className="font-medium tabular-nums">{fmt(taxAmount)}</span>
            </div>
          )}
          {depositAlreadyPaid && depositValue > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>{tp.depositAmount || "Deposit paid"}</span>
              <span className="font-medium tabular-nums">-{fmt(depositValue)}</span>
            </div>
          )}
          <Separator className="my-1" />
          <div className="flex justify-between font-medium">
            <span>{tp.balanceDue || "Balance due"}</span>
            <span className="tabular-nums">{fmt(balance)}</span>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={confirming}>
            {t.common?.cancel || "Cancel"}
          </Button>
          <Button size="sm" onClick={() => onConfirm(items)} disabled={confirming}>
            {confirming ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            {tp.confirmSessionChange || "Confirm change"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
