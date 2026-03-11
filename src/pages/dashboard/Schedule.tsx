import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfToday,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { MonthView } from "@/components/dashboard/schedule/MonthView";
import { WeekView } from "@/components/dashboard/schedule/WeekView";
import { DayView } from "@/components/dashboard/schedule/DayView";
import { BookingDetailSheet, type ScheduleBooking } from "@/components/dashboard/schedule/BookingDetailSheet";
import { CreateBookingDialog } from "@/components/dashboard/schedule/CreateBookingDialog";

export interface BlockedSlot {
  id: string;
  date: string | null;
  start_time: string;
  end_time: string;
  session_id: string;
}

type ViewMode = "month" | "week" | "day";

const VIEW_LABELS: Record<ViewMode, string> = {
  month: "Month",
  week: "Week",
  day: "Day",
};

function formatRangeLabel(mode: ViewMode, date: Date): string {
  if (mode === "month") return format(date, "MMMM yyyy");
  if (mode === "day") return format(date, "EEEE, MMMM d, yyyy");
  const start = startOfWeek(date, { weekStartsOn: 0 });
  const end = endOfWeek(date, { weekStartsOn: 0 });
  if (format(start, "MMM yyyy") === format(end, "MMM yyyy")) {
    return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
  }
  return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

const Schedule = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState<Date>(startOfToday());
  const [bookings, setBookings] = useState<ScheduleBooking[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<ScheduleBooking | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<Date | null>(null);
  const [createDefaultTime, setCreateDefaultTime] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let from: Date, to: Date;
    if (viewMode === "month") {
      from = startOfMonth(currentDate);
      to = endOfMonth(currentDate);
    } else if (viewMode === "week") {
      from = startOfWeek(currentDate, { weekStartsOn: 0 });
      to = endOfWeek(currentDate, { weekStartsOn: 0 });
    } else {
      from = currentDate;
      to = currentDate;
    }

    const fromStr = format(addDays(from, -7), "yyyy-MM-dd");
    const toStr = format(addDays(to, 7), "yyyy-MM-dd");

    const [bookingsResult, availResult] = await Promise.all([
      (supabase as any)
        .from("bookings")
        .select(`
          *,
          sessions ( title, duration_minutes, briefing_id ),
          session_availability ( start_time, end_time, date )
        `)
        .eq("photographer_id", user.id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: true }),

      (supabase as any)
        .from("session_availability")
        .select("id, date, start_time, end_time, session_id")
        .eq("photographer_id", user.id)
        .eq("is_booked", true)
        .not("date", "is", null)
        .gte("date", fromStr)
        .lte("date", toStr),
    ]);

    if (bookingsResult.error) {
      toast({ title: "Failed to load schedule", variant: "destructive" });
    } else {
      setBookings((bookingsResult.data as ScheduleBooking[]) ?? []);
    }

    if (!availResult.error) {
      setBlockedSlots((availResult.data as BlockedSlot[]) ?? []);
    }

    setLoading(false);
  }, [user, viewMode, currentDate, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navigate = (direction: "prev" | "next" | "today") => {
    if (direction === "today") {
      setCurrentDate(startOfToday());
      return;
    }
    const delta = direction === "next" ? 1 : -1;
    if (viewMode === "month") setCurrentDate((d) => (delta > 0 ? addMonths(d, 1) : subMonths(d, 1)));
    else if (viewMode === "week") setCurrentDate((d) => (delta > 0 ? addWeeks(d, 1) : subWeeks(d, 1)));
    else setCurrentDate((d) => (delta > 0 ? addDays(d, 1) : subDays(d, 1)));
  };

  const handleBookingClick = (booking: ScheduleBooking) => {
    setSelectedBooking(booking);
    setSheetOpen(true);
  };

  const handleStatusChange = (id: string, status: "confirmed" | "cancelled") => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    if (selectedBooking?.id === id) {
      setSelectedBooking((prev) => (prev ? { ...prev, status } : prev));
    }
  };

  const handleCreateBooking = (date: Date, startTime?: string) => {
    setCreateDefaultDate(date);
    setCreateDefaultTime(startTime ?? null);
    setCreateOpen(true);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ maxHeight: "100vh" }}>
          <DashboardHeader />

          <main className="flex-1 flex flex-col min-h-0 overflow-hidden px-6 py-6 md:px-10">
            {/* Page title + controls */}
            <div className="flex flex-col gap-4 mb-5 shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                    <span className="inline-block w-6 h-px bg-border" />
                    Schedule
                  </p>
                  <h1 className="text-2xl font-light tracking-wide flex items-center gap-2.5">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    Calendar
                  </h1>
                </div>
                <Button
                  size="sm"
                  className="text-xs gap-2 shrink-0 mt-1"
                  onClick={() => handleCreateBooking(currentDate)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Booking
                </Button>
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => navigate("prev")}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate("today")} className="text-xs">
                    Today
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => navigate("next")}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-light tracking-wide ml-1">
                    {formatRangeLabel(viewMode, currentDate)}
                  </span>
                </div>

                {/* View toggle */}
                <div className="flex items-center border border-border overflow-hidden rounded-none">
                  {(["month", "week", "day"] as ViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-4 py-1.5 text-[10px] tracking-[0.2em] uppercase font-light transition-colors border-r border-border last:border-r-0 ${
                        viewMode === mode
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}
                    >
                      {VIEW_LABELS[mode]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calendar content */}
            <div className="flex-1 min-h-0 border border-border overflow-hidden flex flex-col">
              {loading ? (
                <div className="flex items-center justify-center flex-1">
                  <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">
                    Loading…
                  </span>
                </div>
              ) : viewMode === "month" ? (
                <MonthView
                  currentDate={currentDate}
                  bookings={bookings}
                  blockedSlots={blockedSlots}
                  onBookingClick={handleBookingClick}
                  onCreateBooking={(date) => handleCreateBooking(date)}
                />
              ) : viewMode === "week" ? (
                <WeekView
                  currentDate={currentDate}
                  bookings={bookings}
                  blockedSlots={blockedSlots}
                  onBookingClick={handleBookingClick}
                  onCreateBooking={handleCreateBooking}
                />
              ) : (
                <DayView
                  currentDate={currentDate}
                  bookings={bookings}
                  blockedSlots={blockedSlots}
                  onBookingClick={handleBookingClick}
                  onCreateBooking={handleCreateBooking}
                />
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 shrink-0">
              <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/50">Legend</p>
              {[
                { label: "Confirmed", cls: "bg-foreground" },
                { label: "Pending", cls: "bg-muted border border-border" },
                { label: "Blocked", cls: "bg-muted-foreground/15 border border-dashed border-muted-foreground/30" },
              ].map(({ label, cls }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-sm ${cls}`} />
                  <span className="text-[10px] text-muted-foreground font-light">{label}</span>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>

      <BookingDetailSheet
        booking={selectedBooking}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onStatusChange={handleStatusChange}
      />

      <CreateBookingDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultDate={createDefaultDate}
        defaultStartTime={createDefaultTime}
        onCreated={fetchData}
      />
    </SidebarProvider>
  );
};

export default Schedule;
