import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type SessionOption, type BookingAddon, fmtCurrency } from "@/lib/session-change";

interface AddonReviewModalProps {
  open: boolean;
  onClose: () => void;
  addons: BookingAddon[];
  oldSessionTitle: string;
  newSession: SessionOption;
  onConfirm: (kept: BookingAddon[]) => void;
  saving: boolean;
}

export function AddonReviewModal({
  open, onClose, addons, oldSessionTitle, newSession, onConfirm, saving,
}: AddonReviewModalProps) {
  const [items, setItems] = useState<BookingAddon[]>([]);

  useEffect(() => {
    if (open) setItems(addons.map((a) => ({ ...a, keep: true })));
  }, [open, addons]);

  const toggleKeep = (id: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, keep: !i.keep } : i)));

  const updateField = (id: string, field: "unit_price" | "quantity", value: number) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  const keptItems = items.filter((i) => i.keep);
  const keptExtrasTotal = keptItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const subtotal = newSession.price + keptExtrasTotal;
  const taxAmount = Math.round(subtotal * (newSession.tax_rate / 100));
  const total = subtotal + taxAmount;

  const depositBase = newSession.deposit_enabled
    ? newSession.deposit_type === "percent" || newSession.deposit_type === "percentage"
      ? Math.round(total * (newSession.deposit_amount / 100))
      : newSession.deposit_amount
    : 0;
  const balance = newSession.deposit_enabled ? total - depositBase : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-light tracking-wide text-base">Review Add-ons</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Changing from <span className="font-medium text-foreground">{oldSessionTitle}</span> to{" "}
            <span className="font-medium text-foreground">{newSession.title}</span>
          </p>
        </DialogHeader>

        <div className="space-y-3 max-h-[40vh] overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No add-ons to review.</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-md border transition-opacity",
                  !item.keep && "opacity-40 bg-muted/30"
                )}
              >
                <Checkbox
                  checked={item.keep}
                  onCheckedChange={() => toggleKeep(item.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className={cn("text-sm font-light", !item.keep && "line-through")}>{item.description}</p>
                  {item.keep && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">Qty:</span>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateField(item.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                          className="h-6 w-14 text-xs px-1.5"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">Price:</span>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={(item.unit_price / 100).toFixed(2)}
                          onChange={(e) => updateField(item.id, "unit_price", Math.round(parseFloat(e.target.value || "0") * 100))}
                          className="h-6 w-20 text-xs px-1.5"
                        />
                      </div>
                    </div>
                  )}
                </div>
                {!item.keep && (
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Financial summary */}
        <div className="border-t pt-3 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Session ({newSession.title})</span>
            <span>{fmtCurrency(newSession.price)}</span>
          </div>
          {keptExtrasTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Add-ons ({keptItems.length})</span>
              <span>{fmtCurrency(keptExtrasTotal)}</span>
            </div>
          )}
          {taxAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({newSession.tax_rate}%)</span>
              <span>{fmtCurrency(taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-medium pt-1 border-t">
            <span>Total</span>
            <span>{fmtCurrency(total)}</span>
          </div>
          {newSession.deposit_enabled && (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span>Deposit</span>
                <span>{fmtCurrency(depositBase)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Balance due</span>
                <span>{fmtCurrency(balance)}</span>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving} className="text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onConfirm(keptItems)}
            disabled={saving}
            className="text-xs gap-1.5"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Confirm Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
