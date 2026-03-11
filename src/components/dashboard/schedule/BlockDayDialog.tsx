import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, CalendarOff } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatTime12 } from "@/lib/utils";
import { TimePickerInput } from "@/components/ui/time-picker-input";

interface TimeRange {
  id: string;
  start: string;
  end: string;
}

interface BlockDayDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate?: Date | null;
  onBlocked: () => void;
}

export function BlockDayDialog({ open, onOpenChange, defaultDate, onBlocked }: BlockDayDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [date, setDate] = useState<Date | undefined>(defaultDate ?? undefined);
  const [allDay, setAllDay] = useState(true);
  const [reason, setReason] = useState("");
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([
    { id: crypto.randomUUID(), start: "09:00", end: "17:00" },
  ]);
  const [saving, setSaving] = useState(false);
  const [calOpen, setCalOpen] = useState(false);

  // Reset when dialog opens with a new default date
  useEffect(() => {
    if (open) {
      setDate(defaultDate ?? undefined);
      setAllDay(true);
      setReason("");
      setTimeRanges([{ id: crypto.randomUUID(), start: "09:00", end: "17:00" }]);
    }
  }, [open, defaultDate]);

  const addRange = () =>
    setTimeRanges((prev) => [
      ...prev,
      { id: crypto.randomUUID(), start: "09:00", end: "17:00" },
    ]);

  const removeRange = (id: string) =>
    setTimeRanges((prev) => prev.filter((r) => r.id !== id));

  const updateRange = (id: string, field: "start" | "end", value: string) =>
    setTimeRanges((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );

  const handleSave = async () => {
    if (!user || !date) return;
    setSaving(true);

    const dateStr = format(date, "yyyy-MM-dd");

    const rows = allDay
      ? [
          {
            photographer_id: user.id,
            date: dateStr,
            start_time: "00:00",
            end_time: "23:59",
            all_day: true,
            reason: reason.trim() || null,
          },
        ]
      : timeRanges
          .filter((r) => r.start && r.end && r.start < r.end)
          .map((r) => ({
            photographer_id: user.id,
            date: dateStr,
            start_time: r.start,
            end_time: r.end,
            all_day: false,
            reason: reason.trim() || null,
          }));

    if (rows.length === 0) {
      toast({ title: "Add at least one valid time range", variant: "destructive" });
      setSaving(false);
      return;
    }

    const { error } = await (supabase as any).from("blocked_times").insert(rows);

    if (error) {
      toast({ title: "Failed to block time", description: error.message, variant: "destructive" });
    } else {
      toast({ title: allDay ? "Day blocked" : "Time slots blocked" });
      onBlocked();
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-none border-border">
        <DialogHeader>
          <DialogTitle className="text-sm font-light tracking-wide flex items-center gap-2">
            <CalendarOff className="h-4 w-4 text-muted-foreground" />
            Block Time
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* Date picker */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Date
            </Label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left text-sm font-light rounded-none",
                    !date && "text-muted-foreground"
                  )}
                >
                  {date ? format(date, "EEEE, MMMM d, yyyy") : "Select a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => { setDate(d); setCalOpen(false); }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* All day toggle */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-light">Block entire day</span>
              <span className="text-[10px] text-muted-foreground">
                No clients can book any slot on this date
              </span>
            </div>
            <Switch checked={allDay} onCheckedChange={setAllDay} />
          </div>

          {/* Time ranges */}
          {!allDay && (
            <div className="flex flex-col gap-3">
              <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                Time Ranges to Block
              </Label>
              {timeRanges.map((r) => (
                <div key={r.id} className="flex items-center gap-2 flex-wrap">
                  <TimePickerInput
                    value={r.start}
                    onChange={(v) => updateRange(r.id, "start", v)}
                  />
                  <span className="text-muted-foreground text-xs shrink-0">to</span>
                  <TimePickerInput
                    value={r.end}
                    onChange={(v) => updateRange(r.id, "end", v)}
                  />
                  {timeRanges.length > 1 && (
                    <button
                      onClick={() => removeRange(r.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addRange}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-fit"
              >
                <Plus className="h-3 w-3" />
                Add time range
              </button>
            </div>
          )}

          {/* Reason */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Reason <span className="normal-case">(optional)</span>
            </Label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Personal appointment, vacation…"
              className="flex h-10 w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-none font-light"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="rounded-none text-xs"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-none text-xs"
              onClick={handleSave}
              disabled={saving || !date}
            >
              {saving ? "Saving…" : "Block"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
