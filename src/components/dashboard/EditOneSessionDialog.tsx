import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Plus, X, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sessionId: string | null;
  onSaved?: () => void;
  onConverted?: (id: string) => void;
}

interface Briefing { id: string; name: string }
interface Contract { id: string; name: string; body: string }

export function EditOneSessionDialog({ open, onOpenChange, sessionId, onSaved, onConverted }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const cb = t.createBooking;
  const sLabels = t.sessions;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [converting, setConverting] = useState(false);

  // Core fields
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(60);
  const [numPhotos, setNumPhotos] = useState(0);
  const [price, setPrice] = useState<number | "">("");
  const [location, setLocation] = useState("");
  const [briefingId, setBriefingId] = useState("");
  const [contractId, setContractId] = useState("");
  const [includes, setIncludes] = useState<string[]>([]);
  const [includeInput, setIncludeInput] = useState("");

  // Optional details
  const [moreOpen, setMoreOpen] = useState(false);
  const [depositValue, setDepositValue] = useState<number | "">("");
  const [depositType, setDepositType] = useState<"fixed" | "percentage">("fixed");
  const [discountValue, setDiscountValue] = useState<number | "">("");
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed");
  const [deliveryDays, setDeliveryDays] = useState<number | "">("");
  const [extraPhotoPrice, setExtraPhotoPrice] = useState<number | "">("");
  const [fullAddress, setFullAddress] = useState("");
  const [headcount, setHeadcount] = useState<number | "">("");
  const [internalNotes, setInternalNotes] = useState("");
  const [clientNotes, setClientNotes] = useState("");

  // Lookups
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [originalContractText, setOriginalContractText] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !sessionId || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [{ data: session }, { data: bonuses }, { data: bs }, { data: cs }] = await Promise.all([
          (supabase as any).from("sessions").select("*").eq("id", sessionId).single(),
          (supabase as any).from("session_bonuses").select("text, position").eq("session_id", sessionId).order("position", { ascending: true }),
          (supabase as any).from("briefings").select("id, name").eq("photographer_id", user.id).order("created_at", { ascending: false }),
          (supabase as any).from("contracts").select("id, name, body").eq("photographer_id", user.id).order("created_at", { ascending: false }),
        ]);
        if (cancelled || !session) return;

        setTitle(session.title ?? "");
        setDuration(session.duration_minutes ?? 60);
        setNumPhotos(session.num_photos ?? 0);
        setPrice(session.price != null ? Number(session.price) / 100 : "");
        setLocation(session.location ?? "");
        setBriefingId(session.briefing_id ?? "");
        setOriginalContractText(session.contract_text ?? null);
        setBriefings(bs ?? []);
        setContracts(cs ?? []);

        // Match contract by body content if existing
        const matchedContract = (cs ?? []).find((c: Contract) => c.body && c.body === session.contract_text);
        setContractId(matchedContract?.id ?? "");

        setIncludes((bonuses ?? []).map((b: any) => b.text));

        const d = session.one_session_details ?? {};
        const hasAny =
          d.deposit || d.discount || d.delivery_days || d.extra_photo_price ||
          d.full_address || d.headcount || d.internal_notes || d.client_notes;
        setMoreOpen(!!hasAny);

        if (d.deposit) {
          setDepositType(d.deposit.type ?? "fixed");
          setDepositValue(d.deposit.type === "fixed" ? Number(d.deposit.value) / 100 : Number(d.deposit.value));
        } else { setDepositValue(""); setDepositType("fixed"); }

        if (d.discount) {
          setDiscountType(d.discount.type ?? "fixed");
          setDiscountValue(d.discount.type === "fixed" ? Number(d.discount.value) / 100 : Number(d.discount.value));
        } else { setDiscountValue(""); setDiscountType("fixed"); }

        setDeliveryDays(d.delivery_days ?? "");
        setExtraPhotoPrice(d.extra_photo_price != null ? Number(d.extra_photo_price) / 100 : "");
        setFullAddress(d.full_address ?? "");
        setHeadcount(d.headcount ?? "");
        setInternalNotes(d.internal_notes ?? "");
        setClientNotes(d.client_notes ?? "");
      } catch (err: any) {
        toast({ title: err?.message ?? "Failed to load", variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, sessionId, user, toast]);

  const handleAddInclude = () => {
    const v = includeInput.trim();
    if (!v) return;
    setIncludes((p) => [...p, v]);
    setIncludeInput("");
  };

  const handleSave = async () => {
    if (!sessionId || !user || !title.trim()) return;
    setSaving(true);
    try {
      let contractText = originalContractText;
      if (contractId && contractId !== "none") {
        contractText = contracts.find((c) => c.id === contractId)?.body ?? null;
      } else if (contractId === "none") {
        contractText = null;
      }

      const { error } = await (supabase as any)
        .from("sessions")
        .update({
          title: title.trim(),
          duration_minutes: duration || 60,
          num_photos: numPhotos || 0,
          price: price === "" ? 0 : Math.round(Number(price) * 100),
          location: location.trim() || null,
          briefing_id: briefingId && briefingId !== "none" ? briefingId : null,
          contract_text: contractText,
          one_session_details: {
            deposit: depositValue === "" ? null : {
              type: depositType,
              value: depositType === "fixed" ? Math.round(Number(depositValue) * 100) : Number(depositValue),
            },
            discount: discountValue === "" ? null : {
              type: discountType,
              value: discountType === "fixed" ? Math.round(Number(discountValue) * 100) : Number(discountValue),
            },
            delivery_days: deliveryDays === "" ? null : Number(deliveryDays),
            extra_photo_price: extraPhotoPrice === "" ? null : Math.round(Number(extraPhotoPrice) * 100),
            full_address: fullAddress.trim() || null,
            headcount: headcount === "" ? null : Number(headcount),
            internal_notes: internalNotes.trim() || null,
            client_notes: clientNotes.trim() || null,
          },
        })
        .eq("id", sessionId)
        .eq("photographer_id", user.id);

      if (error) throw error;

      // Replace bonuses
      await (supabase as any).from("session_bonuses").delete().eq("session_id", sessionId);
      if (includes.length > 0) {
        await (supabase as any).from("session_bonuses").insert(
          includes.map((text, i) => ({
            session_id: sessionId,
            photographer_id: user.id,
            text,
            position: i,
          }))
        );
      }

      toast({ title: sLabels.saved });
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: err?.message ?? "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base font-light tracking-wide">
            {sLabels.editOneSession}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <div className="flex flex-col gap-4 px-5 pb-5">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{cb.sessionName} *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-xs h-8" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{cb.duration} *</Label>
                  <div className="relative">
                    <Input type="number" min={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="text-xs h-8 pr-10" />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">min</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{cb.numPhotos}</Label>
                  <Input type="number" min={0} value={numPhotos} onChange={(e) => setNumPhotos(Number(e.target.value))} className="text-xs h-8" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{cb.price}</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                    <Input type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} className="text-xs h-8 pl-8" placeholder="0" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{cb.location}</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} className="text-xs h-8" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{cb.contract}</Label>
                <Select value={contractId || "none"} onValueChange={setContractId}>
                  <SelectTrigger className="text-xs h-8"><SelectValue placeholder={cb.noContract} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{cb.noContract}</SelectItem>
                    {contracts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{cb.briefing}</Label>
                <Select value={briefingId || "none"} onValueChange={setBriefingId}>
                  <SelectTrigger className="text-xs h-8"><SelectValue placeholder={cb.noBriefing} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{cb.noBriefing}</SelectItem>
                    {briefings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{cb.itemsIncluded}</Label>
                <div className="flex gap-2">
                  <Input
                    value={includeInput}
                    onChange={(e) => setIncludeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddInclude(); } }}
                    className="text-xs h-8 flex-1"
                    placeholder={cb.addItem}
                  />
                  <Button type="button" variant="outline" size="sm" className="h-8 px-2" onClick={handleAddInclude}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {includes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {includes.map((item, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] gap-1 pr-1">
                        {item}
                        <button type="button" onClick={() => setIncludes((p) => p.filter((_, j) => j !== i))}>
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional details */}
              <div className="flex flex-col gap-2 border-t border-border/50 pt-3">
                <button
                  type="button"
                  onClick={() => setMoreOpen((o) => !o)}
                  className="flex items-center justify-between text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>{cb.moreDetails}</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", moreOpen && "rotate-180")} />
                </button>

                {moreOpen && (
                  <div className="flex flex-col gap-3 pt-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{cb.depositLabel}</Label>
                        <div className="flex gap-1">
                          <Input type="number" min={0} step={0.01} value={depositValue}
                            onChange={(e) => setDepositValue(e.target.value === "" ? "" : Number(e.target.value))}
                            className="text-xs h-8 flex-1" placeholder="0" />
                          <Select value={depositType} onValueChange={(v) => setDepositType(v as any)}>
                            <SelectTrigger className="text-xs h-8 w-16"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">R$</SelectItem>
                              <SelectItem value="percentage">%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{cb.discountLabel}</Label>
                        <div className="flex gap-1">
                          <Input type="number" min={0} step={0.01} value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value === "" ? "" : Number(e.target.value))}
                            className="text-xs h-8 flex-1" placeholder="0" />
                          <Select value={discountType} onValueChange={(v) => setDiscountType(v as any)}>
                            <SelectTrigger className="text-xs h-8 w-16"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">R$</SelectItem>
                              <SelectItem value="percentage">%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{cb.deliveryDays}</Label>
                        <Input type="number" min={0} value={deliveryDays}
                          onChange={(e) => setDeliveryDays(e.target.value === "" ? "" : Number(e.target.value))}
                          className="text-xs h-8" placeholder="15" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{cb.extraPhotoPrice}</Label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                          <Input type="number" min={0} step={0.01} value={extraPhotoPrice}
                            onChange={(e) => setExtraPhotoPrice(e.target.value === "" ? "" : Number(e.target.value))}
                            className="text-xs h-8 pl-8" placeholder="0" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{cb.headcount}</Label>
                        <Input type="number" min={0} value={headcount}
                          onChange={(e) => setHeadcount(e.target.value === "" ? "" : Number(e.target.value))}
                          className="text-xs h-8" placeholder="1" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{cb.fullAddress}</Label>
                      <Input value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} className="text-xs h-8" />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{cb.internalNotes}</Label>
                      <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} className="text-xs resize-none" />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{cb.clientNotes}</Label>
                      <Textarea value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} rows={2} className="text-xs resize-none" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="px-5 py-3 border-t border-border/50 flex-row sm:justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConvertOpen(true)}
            disabled={loading || !sessionId}
            className="text-[10px] tracking-wider uppercase font-light gap-1.5"
          >
            <ArrowRight className="h-3 w-3" />
            {sLabels.convertToSession}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
              {cb.back}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || loading || !title.trim()} className="text-xs gap-1.5">
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              {sLabels.saveChanges}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={convertOpen} onOpenChange={setConvertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{sLabels.convertToSession}</AlertDialogTitle>
            <AlertDialogDescription>{sLabels.convertConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={converting}>{cb.back}</AlertDialogCancel>
            <AlertDialogAction
              disabled={converting}
              onClick={async (e) => {
                e.preventDefault();
                if (!sessionId || !user) return;
                setConverting(true);
                try {
                  const { error } = await (supabase as any)
                    .from("sessions")
                    .update({ session_model: "standard", hide_from_store: false })
                    .eq("id", sessionId)
                    .eq("photographer_id", user.id);
                  if (error) throw error;
                  setConvertOpen(false);
                  onOpenChange(false);
                  onConverted?.(sessionId);
                  navigate(`/dashboard/sessions/${sessionId}`);
                } catch (err: any) {
                  toast({ title: err?.message ?? "Failed", variant: "destructive" });
                } finally {
                  setConverting(false);
                }
              }}
            >
              {converting ? "…" : sLabels.convertToSession}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
