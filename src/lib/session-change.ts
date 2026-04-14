import { supabase } from "@/integrations/supabase/client";
import { addMinutesToTime } from "@/lib/booking-conflict";

export interface SessionOption {
  id: string;
  title: string;
  price: number;
  deposit_enabled: boolean;
  deposit_amount: number;
  deposit_type: string;
  tax_rate: number;
  duration_minutes: number;
}

export interface BookingAddon {
  id: string;
  description: string;
  unit_price: number;
  quantity: number;
  keep: boolean;
}

export const fmtCurrency = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export async function loadActiveSessions(photographerId: string): Promise<SessionOption[]> {
  const { data } = await supabase
    .from("sessions")
    .select("id, title, price, deposit_enabled, deposit_amount, deposit_type, tax_rate, duration_minutes")
    .eq("photographer_id", photographerId)
    .eq("status", "active")
    .order("title");
  return (data as SessionOption[]) ?? [];
}

export async function fetchBookingAddons(bookingId: string): Promise<BookingAddon[]> {
  const { data } = await (supabase as any)
    .from("booking_invoice_items")
    .select("id, description, unit_price, quantity")
    .eq("booking_id", bookingId);
  return (data ?? []).map((item: any) => ({
    id: item.id,
    description: item.description,
    unit_price: item.unit_price,
    quantity: item.quantity,
    keep: true,
  }));
}

export async function executeSessionChange({
  bookingId,
  availabilityId,
  startTime,
  newSession,
  keptAddons,
  allAddons,
}: {
  bookingId: string;
  availabilityId: string;
  startTime: string | null;
  newSession: SessionOption;
  keptAddons: BookingAddon[];
  allAddons: BookingAddon[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    const keptExtrasTotal = keptAddons.reduce((s, a) => s + a.unit_price * a.quantity, 0);

    // Update booking session_id and extras_total
    const { error: bookingErr } = await supabase
      .from("bookings")
      .update({
        session_id: newSession.id,
        extras_total: keptExtrasTotal,
      } as any)
      .eq("id", bookingId);

    if (bookingErr) return { success: false, error: bookingErr.message };

    // Delete removed addons
    const keptIds = keptAddons.map((a) => a.id);
    const removedIds = allAddons.filter((a) => !keptIds.includes(a.id)).map((a) => a.id);
    if (removedIds.length > 0) {
      await (supabase as any)
        .from("booking_invoice_items")
        .delete()
        .in("id", removedIds);
    }

    // Update kept addons (price/qty may have changed)
    for (const addon of keptAddons) {
      await (supabase as any)
        .from("booking_invoice_items")
        .update({ unit_price: addon.unit_price, quantity: addon.quantity })
        .eq("id", addon.id);
    }

    // Update session_availability with new duration
    if (startTime) {
      const endTime = addMinutesToTime(startTime.slice(0, 5), newSession.duration_minutes);
      await (supabase as any)
        .from("session_availability")
        .update({ session_id: newSession.id, end_time: endTime })
        .eq("id", availabilityId);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}
