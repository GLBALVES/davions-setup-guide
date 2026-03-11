import { useMemo, useRef, useEffect } from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  format,
} from "date-fns";
import type { ScheduleBooking } from "./BookingDetailSheet";
import type { BlockedSlot, ManualBlock } from "@/pages/dashboard/Schedule";

const HOUR_START = 6;
const HOUR_END = 22;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const CELL_HEIGHT = 64;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesFromStart(t: string): number {
  return timeToMinutes(t) - HOUR_START * 60;
}

function padTwo(n: number) {
  return String(n).padStart(2, "0");
}

function minutesToTimeStr(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${padTwo(h)}:${padTwo(m)}`;
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

interface WeekViewProps {
  currentDate: Date;
  bookings: ScheduleBooking[];
  blockedSlots: BlockedSlot[];
  manualBlocks: ManualBlock[];
  onBookingClick: (booking: ScheduleBooking) => void;
  onCreateBooking: (date: Date, startTime: string) => void;
}

export function WeekView({ currentDate, bookings, blockedSlots, manualBlocks, onBookingClick, onCreateBooking }: WeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, ScheduleBooking[]>();
    days.forEach((d) => map.set(format(d, "yyyy-MM-dd"), []));
    bookings.forEach((b) => {
      const dateStr = b.session_availability?.date ?? b.booked_date;
      if (!dateStr) return;
      const key = dateStr.slice(0, 10);
      if (map.has(key)) map.get(key)!.push(b);
    });
    return map;
  }, [bookings, days]);

  const blockedByDay = useMemo(() => {
    const map = new Map<string, BlockedSlot[]>();
    days.forEach((d) => map.set(format(d, "yyyy-MM-dd"), []));
    blockedSlots.forEach((s) => {
      if (!s.date) return;
      const key = s.date.slice(0, 10);
      if (map.has(key)) map.get(key)!.push(s);
    });
    return map;
  }, [blockedSlots, days]);

  const manualBlocksByDay = useMemo(() => {
    const map = new Map<string, ManualBlock[]>();
    days.forEach((d) => map.set(format(d, "yyyy-MM-dd"), []));
    manualBlocks.forEach((mb) => {
      const key = mb.date.slice(0, 10);
      if (map.has(key)) map.get(key)!.push(mb);
    });
    return map;
  }, [manualBlocks, days]);

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const offset = Math.max(0, (now.getHours() - HOUR_START - 1) * CELL_HEIGHT);
      scrollRef.current.scrollTop = offset;
    }
  }, []);

  const handleCellClick = (day: Date, hourIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const yOffset = e.clientY - rect.top;
    const fractionalMinutes = Math.floor((yOffset / CELL_HEIGHT) * 60);
    const totalMins = (HOUR_START + hourIndex) * 60 + fractionalMinutes;
    const snapped = Math.round(totalMins / 15) * 15;
    onCreateBooking(day, minutesToTimeStr(snapped));
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Day headers */}
      <div className="grid border-b border-border" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
        <div className="border-r border-border" />
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayBlocked = blockedByDay.get(key) ?? [];
          const dayManual = manualBlocksByDay.get(key) ?? [];
          const isAllDay = dayManual.some((mb) => mb.all_day);
          return (
            <div
              key={key}
              className={`py-2 text-center border-r border-border last:border-r-0 ${
                isAllDay ? "bg-destructive/5" : ""
              }`}
            >
              <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">
                {format(day, "EEE")}
              </p>
              <span
                className={`text-sm font-light h-7 w-7 flex items-center justify-center rounded-full mx-auto mt-0.5 ${
                  isToday(day)
                    ? "bg-foreground text-background"
                    : isAllDay
                    ? "text-destructive/70"
                    : "text-foreground"
                }`}
              >
                {format(day, "d")}
              </span>
              {isAllDay && (
                <p className="text-[8px] tracking-wider uppercase text-destructive/60 mt-0.5 font-light">
                  Blocked
                </p>
              )}
              {!isAllDay && (dayBlocked.length > 0 || dayManual.length > 0) && (
                <p className="text-[8px] tracking-wider uppercase text-muted-foreground/50 mt-0.5">
                  {dayBlocked.length + dayManual.length} blocked
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          {/* Time labels column */}
          <div className="border-r border-border">
            {HOURS.map((h) => (
              <div
                key={h}
                className="border-b border-border flex items-start justify-end pr-2 pt-1"
                style={{ height: CELL_HEIGHT }}
              >
                <span className="text-[10px] text-muted-foreground/50 font-light leading-none -translate-y-1.5">
                  {h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayBookings = bookingsByDay.get(key) ?? [];
            const dayBlocked = blockedByDay.get(key) ?? [];
            const dayManual = manualBlocksByDay.get(key) ?? [];
            const isAllDay = dayManual.some((mb) => mb.all_day);

            return (
              <div
                key={key}
                className={`relative border-r border-border last:border-r-0 ${
                  isAllDay ? "bg-destructive/3" : ""
                }`}
              >
                {/* All-day blocked: full column hatch */}
                {isAllDay && (
                  <div
                    className="absolute inset-0 pointer-events-none z-[1]"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(45deg, hsl(var(--destructive)) 0, hsl(var(--destructive)) 1px, transparent 0, transparent 50%)",
                      backgroundSize: "10px 10px",
                      opacity: 0.06,
                    }}
                  />
                )}

                {/* Hour cells — clickable */}
                {HOURS.map((h, hIdx) => (
                  <div
                    key={h}
                    className="border-b border-border group cursor-pointer hover:bg-muted/30 transition-colors relative"
                    style={{ height: CELL_HEIGHT }}
                    onClick={(e) => handleCellClick(day, hIdx, e)}
                  >
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-30 transition-opacity text-[18px] text-muted-foreground pointer-events-none select-none">
                      +
                    </span>
                  </div>
                ))}

                {/* Session-availability blocked strips (is_booked=true) */}
                {dayBlocked.map((s) => {
                  const topMin = minutesFromStart(s.start_time);
                  const durationMin = timeToMinutes(s.end_time) - timeToMinutes(s.start_time);
                  const top = (topMin / 60) * CELL_HEIGHT;
                  const height = Math.max((durationMin / 60) * CELL_HEIGHT, 16);
                  if (topMin < 0 || topMin > (HOUR_END - HOUR_START) * 60) return null;
                  return (
                    <div
                      key={`blocked-${s.id}`}
                      className="absolute left-0 right-0 pointer-events-none z-[2]"
                      style={{ top, height }}
                    >
                      <div
                        className="absolute inset-0 opacity-30"
                        style={{
                          backgroundImage:
                            "repeating-linear-gradient(45deg, hsl(var(--muted-foreground)) 0, hsl(var(--muted-foreground)) 1px, transparent 0, transparent 50%)",
                          backgroundSize: "6px 6px",
                        }}
                      />
                      <div className="absolute inset-0 border-l-2 border-muted-foreground/30 bg-muted-foreground/5" />
                    </div>
                  );
                })}

                {/* Manual blocked time ranges */}
                {!isAllDay && dayManual.map((mb) => {
                  const topMin = minutesFromStart(mb.start_time.slice(0, 5));
                  const durationMin = timeToMinutes(mb.end_time.slice(0, 5)) - timeToMinutes(mb.start_time.slice(0, 5));
                  const top = (topMin / 60) * CELL_HEIGHT;
                  const height = Math.max((durationMin / 60) * CELL_HEIGHT, 20);
                  if (topMin < 0 || topMin > (HOUR_END - HOUR_START) * 60) return null;
                  return (
                    <div
                      key={`manual-${mb.id}`}
                      className="absolute left-0 right-0 z-[3] pointer-events-none"
                      style={{ top, height }}
                      title={mb.reason ?? `Blocked: ${formatTime(mb.start_time)} – ${formatTime(mb.end_time)}`}
                    >
                      <div
                        className="absolute inset-0 opacity-15"
                        style={{
                          backgroundImage:
                            "repeating-linear-gradient(45deg, hsl(var(--destructive)) 0, hsl(var(--destructive)) 1px, transparent 0, transparent 50%)",
                          backgroundSize: "6px 6px",
                        }}
                      />
                      <div className="absolute inset-0 border-l-2 border-destructive/50 bg-destructive/8 flex items-center px-2 overflow-hidden">
                        <span className="text-[9px] tracking-wider uppercase text-destructive/60 font-light truncate">
                          {mb.reason
                            ? mb.reason
                            : `${formatTime(mb.start_time)} – ${formatTime(mb.end_time)}`}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Booking blocks */}
                {dayBookings.map((b) => {
                  const avail = b.session_availability;
                  if (!avail?.start_time || !avail?.end_time) return null;
                  const topMin = minutesFromStart(avail.start_time);
                  const durationMin = timeToMinutes(avail.end_time) - timeToMinutes(avail.start_time);
                  const top = (topMin / 60) * CELL_HEIGHT;
                  const height = Math.max((durationMin / 60) * CELL_HEIGHT, 20);
                  if (topMin < 0 || topMin > (HOUR_END - HOUR_START) * 60) return null;
                  return (
                    <button
                      key={b.id}
                      onClick={(e) => { e.stopPropagation(); onBookingClick(b); }}
                      className={`absolute left-0.5 right-0.5 rounded-sm px-1.5 py-0.5 text-left border overflow-hidden hover:opacity-80 transition-opacity z-10 ${
                        STATUS_COLORS[b.status] ?? STATUS_COLORS["pending"]
                      }`}
                      style={{ top, height }}
                    >
                      <p className="text-[10px] font-light leading-tight truncate">{b.client_name}</p>
                      {height > 32 && (
                        <p className="text-[9px] opacity-70 leading-tight truncate">{b.sessions?.title}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
