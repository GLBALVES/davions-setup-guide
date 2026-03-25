import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimePickerInputProps {
  value: string; // HH:mm (24h) — this is what we store in DB
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  minuteStep?: number; // defaults to 15
  selectZIndex?: number; // z-index for SelectContent portals (useful when inside high-z portals)
}

function to24h(hour12: number, minute: number, period: "AM" | "PM"): string {
  let h = hour12 % 12; // 12 → 0
  if (period === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parse24h(value: string): { hour12: number; minute: number; period: "AM" | "PM" } {
  const [hRaw, mRaw] = value.split(":").map(Number);
  const h = isNaN(hRaw) ? 9 : hRaw;
  const m = isNaN(mRaw) ? 0 : mRaw;
  const period: "AM" | "PM" = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour12, minute: m, period };
}

export function TimePickerInput({
  value,
  onChange,
  className,
  disabled = false,
  minuteStep = 15,
  selectZIndex,
}: TimePickerInputProps) {
  const { hour12, minute, period } = parse24h(value || "09:00");

  const hours = Array.from({ length: 12 }, (_, i) => i + 1); // 1–12
  const minutes = Array.from(
    { length: Math.ceil(60 / minuteStep) },
    (_, i) => i * minuteStep
  );

  const handleHour = (v: string) => {
    onChange(to24h(Number(v), minute, period));
  };

  const handleMinute = (v: string) => {
    onChange(to24h(hour12, Number(v), period));
  };

  const handlePeriod = (p: "AM" | "PM") => {
    onChange(to24h(hour12, minute, p));
  };

  const contentStyle = selectZIndex ? { zIndex: selectZIndex } : undefined;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Hour */}
      <Select value={String(hour12)} onValueChange={handleHour} disabled={disabled}>
        <SelectTrigger className="w-14 h-8 text-xs px-2 rounded-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent style={contentStyle}>
          {hours.map((h) => (
            <SelectItem key={h} value={String(h)} className="text-xs">
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-muted-foreground text-xs font-light">:</span>

      {/* Minute */}
      <Select value={String(minute)} onValueChange={handleMinute} disabled={disabled}>
        <SelectTrigger className="w-14 h-8 text-xs px-2 rounded-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent style={contentStyle}>
          {minutes.map((m) => (
            <SelectItem key={m} value={String(m)} className="text-xs">
              {String(m).padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* AM / PM toggle */}
      <div className={cn("flex border border-border rounded-none h-8", disabled && "opacity-50 pointer-events-none")}>
        {(["AM", "PM"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => handlePeriod(p)}
            disabled={disabled}
            className={cn(
              "px-2 text-[11px] tracking-wide transition-colors h-full",
              period === p
                ? "bg-foreground text-background"
                : "bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
