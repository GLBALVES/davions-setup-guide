import { supabase } from "@/integrations/supabase/client";

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) &&
         timeToMinutes(aEnd) > timeToMinutes(bStart);
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflictType: "booking" | "blocked" | null;
  conflictDetails: string | null;
}

/**
 * Check if a time range on a given date conflicts with existing bookings or blocked times.
 * @param photographerId - photographer's ID
 * @param date - date string in yyyy-MM-dd
 * @param startTime - start time HH:mm
 * @param endTime - end time HH:mm
 * @param excludeBookingId - optional booking ID to exclude (for editing existing)
 */
export async function checkBookingConflict(
  photographerId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string,
): Promise<ConflictResult> {
  const noConflict: ConflictResult = { hasConflict: false, conflictType: null, conflictDetails: null };

  // 1. Check blocked_times
  const { data: blockedTimes } = await (supabase as any)
    .from("blocked_times")
    .select("start_time, end_time, all_day, reason")
    .eq("photographer_id", photographerId)
    .eq("date", date);

  if (blockedTimes) {
    for (const bt of blockedTimes) {
      if (bt.all_day) {
        return {
          hasConflict: true,
          conflictType: "blocked",
          conflictDetails: bt.reason || "This day is blocked",
        };
      }
      const bStart = bt.start_time.slice(0, 5);
      const bEnd = bt.end_time.slice(0, 5);
      if (timesOverlap(startTime, endTime, bStart, bEnd)) {
        return {
          hasConflict: true,
          conflictType: "blocked",
          conflictDetails: bt.reason || `Blocked: ${bStart}–${bEnd}`,
        };
      }
    }
  }

  // 2. Check existing confirmed bookings via session_availability
  const { data: bookings } = await (supabase as any)
    .from("bookings")
    .select("id, client_name, availability_id, session_id")
    .eq("photographer_id", photographerId)
    .eq("booked_date", date)
    .neq("status", "cancelled");

  if (bookings && bookings.length > 0) {
    const filtered = excludeBookingId
      ? bookings.filter((b: any) => b.id !== excludeBookingId)
      : bookings;

    if (filtered.length > 0) {
      const availIds = filtered.map((b: any) => b.availability_id);
      const { data: avails } = await (supabase as any)
        .from("session_availability")
        .select("id, start_time, end_time")
        .in("id", availIds);

      if (avails) {
        const availMap: Record<string, any> = {};
        avails.forEach((a: any) => { availMap[a.id] = a; });

        for (const b of filtered) {
          const avail = availMap[b.availability_id];
          if (!avail) continue;
          const bStart = avail.start_time.slice(0, 5);
          const bEnd = avail.end_time.slice(0, 5);
          if (timesOverlap(startTime, endTime, bStart, bEnd)) {
            return {
              hasConflict: true,
              conflictType: "booking",
              conflictDetails: `Conflicts with ${b.client_name}'s booking (${bStart}–${bEnd})`,
            };
          }
        }
      }
    }
  }

  return noConflict;
}

/**
 * Sync date/time changes from client_projects to related booking + session_availability tables.
 */
export async function syncProjectDateToBooking(
  bookingId: string,
  newDate: string,
  newStartTime: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get booking to find availability_id and session duration
    const { data: booking, error: bErr } = await (supabase as any)
      .from("bookings")
      .select("availability_id, session_id")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking) {
      return { success: false, error: "Booking not found" };
    }

    // Get session duration
    const { data: session } = await (supabase as any)
      .from("sessions")
      .select("duration_minutes")
      .eq("id", booking.session_id)
      .single();

    const duration = session?.duration_minutes ?? 60;
    const newEndTime = addMinutesToTime(newStartTime, duration);

    // Update bookings.booked_date
    const { error: updateBookingErr } = await supabase
      .from("bookings")
      .update({ booked_date: newDate } as any)
      .eq("id", bookingId);

    if (updateBookingErr) {
      return { success: false, error: updateBookingErr.message };
    }

    // Update session_availability
    const { error: updateAvailErr } = await (supabase as any)
      .from("session_availability")
      .update({
        date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
      })
      .eq("id", booking.availability_id);

    if (updateAvailErr) {
      return { success: false, error: updateAvailErr.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}
