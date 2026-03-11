import { useMemo, useRef, useEffect } from "react";
import { isSameDay, isToday, format } from "date-fns";
import type { ScheduleBooking } from "./BookingDetailSheet";

const HOUR_START = 6;
const HOUR_END = 22;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const CELL_HEIGHT = 80;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesFromStart(t: string): number {
  return timeToMinutes(t) - HOUR_START * 60;
}

function formatTime(t: string): string {
  const [h, m] = t.split(":");
  const d = new Date();
  d.setHours(parseInt(h), parseInt(m));
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-foreground text-background border-foreground",
  pending: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-muted/40 text-muted-foreground/40 border-border line-through",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  cancelled: "Cancelled",
};

interface DayViewProps {
  currentDate: Date;
  bookings: ScheduleBooking[];
  onBookingClick: (booking: ScheduleBooking) => void;
}

export function DayView({ currentDate, bookings, onBookingClick }: DayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const dayBookings = useMemo(
    () =>
      bookings.filter((b) => {
        const dateStr = b.session_availability?.date ?? b.booked_date;
        if (!dateStr) return false;
        return isSameDay(new Date(dateStr), currentDate);
      }),
    [bookings, currentDate]
  );

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const offset = Math.max(0, (now.getHours() - HOUR_START - 1) * CELL_HEIGHT);
      scrollRef.current.scrollTop = offset;
    }
  }, [currentDate]);

  const today = isToday(currentDate);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Day header */}
      <div className="border-b border-border px-6 py-3 flex items-center gap-3">
        <span
          className={`text-2xl font-light h-10 w-10 flex items-center justify-center rounded-full ${
            today ? "bg-foreground text-background" : "text-foreground"
          }`}
        >
          {format(currentDate, "d")}
        </span>
        <div>
          <p className="text-sm font-light tracking-wide">{format(currentDate, "EEEE")}</p>
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            {format(currentDate, "MMMM yyyy")}
          </p>
        </div>
        <span className="ml-auto text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
          {dayBookings.length === 0
            ? "No bookings"
            : dayBookings.length === 1
            ? "1 booking"
            : `${dayBookings.length} bookings`}
        </span>
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div
          className="relative"
          style={{ gridTemplateColumns: "64px 1fr" }}
        >
          <div className="grid" style={{ gridTemplateColumns: "64px 1fr" }}>
            {/* Time labels */}
            <div className="border-r border-border">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="border-b border-border flex items-start justify-end pr-3 pt-1"
                  style={{ height: CELL_HEIGHT }}
                >
                  <span className="text-[11px] text-muted-foreground/50 font-light -translate-y-2">
                    {h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`}
                  </span>
                </div>
              ))}
            </div>

            {/* Events column */}
            <div className="relative">
              {HOURS.map((h) => (
                <div key={h} className="border-b border-border" style={{ height: CELL_HEIGHT }} />
              ))}

              {/* Booking blocks */}
              {dayBookings.map((b) => {
                const avail = b.session_availability;
                if (!avail?.start_time || !avail?.end_time) {
                  // No time info — render as all-day-ish card
                  return null;
                }
                const topMin = minutesFromStart(avail.start_time);
                const durationMin = timeToMinutes(avail.end_time) - timeToMinutes(avail.start_time);
                const top = (topMin / 60) * CELL_HEIGHT;
                const height = Math.max((durationMin / 60) * CELL_HEIGHT, 28);

                if (topMin < 0 || topMin > (HOUR_END - HOUR_START) * 60) return null;

                return (
                  <button
                    key={b.id}
                    onClick={() => onBookingClick(b)}
                    className={`absolute left-2 right-2 rounded-sm px-3 py-1.5 text-left border overflow-hidden hover:opacity-80 transition-opacity ${
                      STATUS_COLORS[b.status] ?? STATUS_COLORS["pending"]
                    }`}
                    style={{ top, height }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <p className="text-[11px] font-medium leading-tight truncate">{b.client_name}</p>
                        {height > 40 && (
                          <p className="text-[10px] opacity-70 leading-tight truncate">
                            {b.sessions?.title}
                          </p>
                        )}
                        {height > 56 && (
                          <p className="text-[10px] opacity-60 leading-tight">
                            {formatTime(avail.start_time)} – {formatTime(avail.end_time)}
                          </p>
                        )}
                      </div>
                      {height > 32 && (
                        <span className="text-[9px] tracking-wider uppercase opacity-60 shrink-0 mt-0.5">
                          {STATUS_LABELS[b.status] ?? b.status}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Bookings without time info */}
              {dayBookings
                .filter((b) => !b.session_availability?.start_time)
                .map((b) => (
                  <button
                    key={`notime-${b.id}`}
                    onClick={() => onBookingClick(b)}
                    className={`w-[calc(100%-1rem)] mx-2 mt-2 rounded-sm px-3 py-2 text-left border flex items-center justify-between gap-2 hover:opacity-80 transition-opacity ${
                      STATUS_COLORS[b.status] ?? STATUS_COLORS["pending"]
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[11px] font-light">{b.client_name}</p>
                      <p className="text-[10px] opacity-60">{b.sessions?.title}</p>
                    </div>
                    <span className="text-[9px] tracking-wider uppercase opacity-60">
                      {STATUS_LABELS[b.status] ?? b.status}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
