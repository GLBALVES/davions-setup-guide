import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
} from "date-fns";
import { Plus, Ban } from "lucide-react";
import type { ScheduleBooking } from "./BookingDetailSheet";
import type { BlockedSlot, ManualBlock } from "@/pages/dashboard/Schedule";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-foreground text-background",
  pending: "bg-muted text-muted-foreground border border-border",
  cancelled: "bg-muted/40 text-muted-foreground/50 line-through",
};

interface MonthViewProps {
  currentDate: Date;
  bookings: ScheduleBooking[];
  blockedSlots: BlockedSlot[];
  manualBlocks: ManualBlock[];
  onBookingClick: (booking: ScheduleBooking) => void;
  onCreateBooking: (date: Date) => void;
  onBlockDay: (date: Date) => void;
}

export function MonthView({
  currentDate,
  bookings,
  blockedSlots,
  manualBlocks,
  onBookingClick,
  onCreateBooking,
  onBlockDay,
}: MonthViewProps) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, ScheduleBooking[]>();
    bookings.forEach((b) => {
      const dateStr = b.session_availability?.date ?? b.booked_date;
      if (!dateStr) return;
      const key = dateStr.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    return map;
  }, [bookings]);

  const blockedCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    blockedSlots.forEach((s) => {
      if (!s.date) return;
      const key = s.date.slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [blockedSlots]);

  // Manual blocks grouped by date
  const manualBlocksByDate = useMemo(() => {
    const map = new Map<string, ManualBlock[]>();
    manualBlocks.forEach((mb) => {
      const key = mb.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(mb);
    });
    return map;
  }, [manualBlocks]);

  const bookedAvailIds = useMemo(() => {
    const ids = new Set<string>();
    bookings.forEach((b) => { if (b.availability_id) ids.add(b.availability_id); });
    return ids;
  }, [bookings]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Week header */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7" style={{ gridAutoRows: "minmax(90px, auto)" }}>
        {days.map((day, idx) => {
          const key = format(day, "yyyy-MM-dd");
          const dayBookings = bookingsByDate.get(key) ?? [];
          const blockedCount = blockedCountByDate.get(key) ?? 0;
          const dayManualBlocks = manualBlocksByDate.get(key) ?? [];
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);

          const isAllDayBlocked = dayManualBlocks.some((mb) => mb.all_day);
          const hasPartialBlocks = dayManualBlocks.length > 0 && !isAllDayBlocked;
          const extraBlocked = Math.max(0, blockedCount - dayBookings.length);

          return (
            <div
              key={key}
              className={`group border-r border-b border-border p-1.5 flex flex-col gap-1 relative ${
                !inMonth ? "bg-muted/20" : ""
              } ${idx % 7 === 0 ? "border-l border-border" : ""} ${
                isAllDayBlocked ? "bg-destructive/5" : ""
              }`}
            >
              {/* All-day blocked: diagonal red hatch */}
              {isAllDayBlocked && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(45deg, hsl(var(--destructive)) 0, hsl(var(--destructive)) 1px, transparent 0, transparent 50%)",
                    backgroundSize: "8px 8px",
                    opacity: 0.08,
                  }}
                />
              )}

              {/* Day number + actions */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onCreateBooking(day)}
                    className="h-5 w-5 flex items-center justify-center rounded-sm hover:bg-muted text-muted-foreground"
                    title={`Add booking on ${format(day, "MMM d")}`}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onBlockDay(day)}
                    className="h-5 w-5 flex items-center justify-center rounded-sm hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    title={`Block time on ${format(day, "MMM d")}`}
                  >
                    <Ban className="h-3 w-3" />
                  </button>
                </div>
                <span
                  className={`text-[11px] font-light h-6 w-6 flex items-center justify-center rounded-full transition-colors ${
                    today
                      ? "bg-foreground text-background font-medium"
                      : inMonth
                      ? isAllDayBlocked
                        ? "text-destructive/70"
                        : "text-foreground"
                      : "text-muted-foreground/40"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* All-day block badge */}
              {isAllDayBlocked && (
                <div className="flex items-center gap-1 px-1 py-0.5 bg-destructive/10 border border-destructive/20 rounded-sm relative z-10">
                  <Ban className="h-2.5 w-2.5 text-destructive/60 shrink-0" />
                  <span className="text-[9px] text-destructive/70 font-light truncate">
                    {dayManualBlocks.find((mb) => mb.all_day)?.reason ?? "Day blocked"}
                  </span>
                </div>
              )}

              {/* Partial block chips */}
              {hasPartialBlocks && dayManualBlocks.map((mb) => (
                <div
                  key={mb.id}
                  className="flex items-center gap-1 px-1 py-0.5 bg-destructive/8 border border-destructive/20 rounded-sm relative z-10"
                >
                  <Ban className="h-2 w-2 text-destructive/50 shrink-0" />
                  <span className="text-[9px] text-destructive/60 font-light truncate">
                    {mb.start_time.slice(0, 5)}–{mb.end_time.slice(0, 5)}
                  </span>
                </div>
              ))}

              {/* Bookings */}
              <div className="flex flex-col gap-0.5 overflow-hidden relative z-10">
                {dayBookings.slice(0, 3).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onBookingClick(b)}
                    className={`w-full text-left px-1.5 py-0.5 rounded-sm text-[10px] tracking-wide font-light truncate transition-opacity hover:opacity-80 ${
                      STATUS_COLORS[b.status] ?? STATUS_COLORS["pending"]
                    }`}
                  >
                    {b.client_name}
                  </button>
                ))}
                {dayBookings.length > 3 && (
                  <span className="text-[9px] text-muted-foreground/60 px-1">
                    +{dayBookings.length - 3} more
                  </span>
                )}
                {extraBlocked > 0 && (
                  <div className="flex items-center gap-1 px-1 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                    <span className="text-[9px] text-muted-foreground/50 font-light">
                      {extraBlocked} slot{extraBlocked > 1 ? "s" : ""} booked
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom band: booked slots indicator */}
              {blockedCount > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-muted-foreground/20" />
              )}
              {/* Bottom band: manual blocks indicator (overwrites booked band if both) */}
              {dayManualBlocks.length > 0 && !isAllDayBlocked && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-destructive/40" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
