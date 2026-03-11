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
import { Plus } from "lucide-react";
import type { ScheduleBooking } from "./BookingDetailSheet";
import type { BlockedSlot } from "@/pages/dashboard/Schedule";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-foreground text-background",
  pending: "bg-muted text-muted-foreground border border-border",
  cancelled: "bg-muted/40 text-muted-foreground/50 line-through",
};

interface MonthViewProps {
  currentDate: Date;
  bookings: ScheduleBooking[];
  blockedSlots: BlockedSlot[];
  onBookingClick: (booking: ScheduleBooking) => void;
  onCreateBooking: (date: Date) => void;
}

export function MonthView({ currentDate, bookings, blockedSlots, onBookingClick, onCreateBooking }: MonthViewProps) {
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

  // Count blocked slots per date (slots where is_booked=true)
  const blockedCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    blockedSlots.forEach((s) => {
      if (!s.date) return;
      const key = s.date.slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [blockedSlots]);

  // Set of availability_ids already shown via bookings (to know which blocked slots are "new")
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
      <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: "minmax(100px, 1fr)" }}>
        {days.map((day, idx) => {
          const key = format(day, "yyyy-MM-dd");
          const dayBookings = bookingsByDate.get(key) ?? [];
          const blockedCount = blockedCountByDate.get(key) ?? 0;
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);

          // "Extra" blocked count = blocked slots that aren't already a visible booking
          const visibleBookingCount = dayBookings.length;
          const extraBlocked = Math.max(0, blockedCount - visibleBookingCount);
          const isFullyBlocked = blockedCount > 0 && visibleBookingCount === 0 && blockedCount >= 3;

          return (
            <div
              key={key}
              className={`group border-r border-b border-border p-1.5 flex flex-col gap-1 min-h-0 overflow-hidden relative ${
                !inMonth ? "bg-muted/20" : ""
              } ${idx % 7 === 0 ? "border-l border-border" : ""} ${
                isFullyBlocked ? "bg-muted/30" : ""
              }`}
            >
              {/* Diagonal hatch overlay for fully-blocked days */}
              {isFullyBlocked && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-10"
                  style={{
                    backgroundImage: "repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)",
                    backgroundSize: "8px 8px",
                  }}
                />
              )}

              {/* Day number + quick add */}
              <div className="flex items-center justify-between relative z-10">
                <button
                  onClick={() => onCreateBooking(day)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 flex items-center justify-center rounded-sm hover:bg-muted text-muted-foreground"
                  title={`Add booking on ${format(day, "MMM d")}`}
                >
                  <Plus className="h-3 w-3" />
                </button>
                <span
                  className={`text-[11px] font-light h-6 w-6 flex items-center justify-center rounded-full transition-colors ${
                    today
                      ? "bg-foreground text-background font-medium"
                      : inMonth
                      ? "text-foreground"
                      : "text-muted-foreground/40"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>

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
                {/* Extra blocked slots not shown as bookings */}
                {extraBlocked > 0 && (
                  <div className="flex items-center gap-1 px-1 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                    <span className="text-[9px] text-muted-foreground/50 font-light">
                      {extraBlocked} slot{extraBlocked > 1 ? "s" : ""} blocked
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom "blocked" band if day has booked slots */}
              {blockedCount > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-muted-foreground/20" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
