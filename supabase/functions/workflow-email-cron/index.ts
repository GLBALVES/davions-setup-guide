import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function dispatch(supabase: any, payload: any) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-workflow-email`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify(payload),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: Record<string, number> = {
    session_completed: 0,
    download_reminder_7d: 0,
    post_delivery_feedback_7d: 0,
    balance_due_session_day: 0,
  };

  // Helpers ------------------------------------------------
  const enc = new TextEncoder();
  const b64url = (buf: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  async function signToken(bookingId: string, expSec: number): Promise<string> {
    const payload = b64url(enc.encode(JSON.stringify({ b: bookingId, e: expSec })));
    const k = await crypto.subtle.importKey(
      "raw", enc.encode(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", k, enc.encode(payload));
    return `${payload}.${b64url(sig)}`;
  }
  function fmtBRL(cents: number) {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }


  try {
    // 1) session_completed — bookings whose shoot has ended
    const nowIso = new Date().toISOString();
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, photographer_id, client_name, client_email, booked_date, session_id, sessions(title, end_time)")
      .eq("payment_status", "paid")
      .lt("booked_date", nowIso.split("T")[0]);

    for (const b of bookings || []) {
      if (!b.client_email) continue;
      await dispatch(supabase, {
        photographer_id: b.photographer_id,
        trigger: "session_completed",
        recipient_email: b.client_email,
        recipient_name: b.client_name,
        booking_id: b.id,
        vars: {
          shoot_date: b.booked_date,
          session_type: (b as any).sessions?.title || "",
        },
      });
      results.session_completed++;
    }

    // 2) download_reminder_7d — final galleries published >=7d ago, no download
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: galleriesNoDl } = await supabase
      .from("galleries")
      .select("id, photographer_id, title, slug, access_code, final_published_at, last_download_at, bookings(client_email, client_name)")
      .lte("final_published_at", sevenDaysAgo)
      .is("last_download_at", null);

    for (const g of galleriesNoDl || []) {
      const email = (g as any).bookings?.client_email;
      if (!email) continue;
      await dispatch(supabase, {
        photographer_id: g.photographer_id,
        trigger: "download_reminder_7d",
        recipient_email: email,
        recipient_name: (g as any).bookings?.client_name,
        gallery_id: g.id,
        vars: {
          gallery_link: `https://davions.com/g/${g.slug}`,
          download_link: `https://davions.com/g/${g.slug}?download=1`,
        },
      });
      results.download_reminder_7d++;
    }

    // 3) post_delivery_feedback_7d — last_download_at >=7d ago
    const { data: galleriesDownloaded } = await supabase
      .from("galleries")
      .select("id, photographer_id, title, slug, last_download_at, bookings(client_email, client_name)")
      .lte("last_download_at", sevenDaysAgo);

    for (const g of galleriesDownloaded || []) {
      const email = (g as any).bookings?.client_email;
      if (!email) continue;
      await dispatch(supabase, {
        photographer_id: g.photographer_id,
        trigger: "post_delivery_feedback_7d",
        recipient_email: email,
        recipient_name: (g as any).bookings?.client_name,
        gallery_id: g.id,
        vars: {
          gallery_link: `https://davions.com/g/${g.slug}`,
          feedback_link: `https://davions.com/feedback/${g.id}`,
        },
      });
      results.post_delivery_feedback_7d++;
    }

    // 4) balance_due_session_day — bookings with deposit_paid whose session
    //    is configured with balance_due_timing='session_day' and the offset
    //    fire-time is reached (now within fire_at .. fire_at + 24h window).
    const { data: depositBookings } = await supabase
      .from("bookings")
      .select(`
        id, photographer_id, client_name, client_email, booked_date, session_id, extras_total,
        sessions!inner(title, price, deposit_enabled, deposit_amount, deposit_type, tax_rate, balance_due_timing, balance_due_offset_hours),
        session_availability:availability_id(start_time)
      `)
      .eq("payment_status", "deposit_paid")
      .neq("status", "cancelled");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const now = Date.now();

    for (const b of depositBookings || []) {
      const s: any = (b as any).sessions;
      const av: any = (b as any).session_availability;
      if (!s || s.balance_due_timing !== "session_day") continue;
      if (!b.client_email || !b.booked_date) continue;

      const startTime = av?.start_time ?? "00:00:00";
      const fireAt = new Date(`${b.booked_date}T${startTime}`).getTime()
        + ((s.balance_due_offset_hours ?? 0) * 3600 * 1000);
      if (now < fireAt) continue;
      if (now > fireAt + 24 * 3600 * 1000) continue; // window expired

      // Compute remaining balance
      const sessionPrice = s.price ?? 0;
      const subtotal = sessionPrice + ((b as any).extras_total ?? 0);
      const taxRate = s.tax_rate ?? 0;
      const taxAmount = Math.round(subtotal * (taxRate / 100));
      const fullTotal = subtotal + taxAmount;
      const isPercent = s.deposit_type === "percent" || s.deposit_type === "percentage";
      const depositBase = isPercent
        ? Math.round(fullTotal * ((s.deposit_amount ?? 0) / 100))
        : (s.deposit_amount ?? 0);
      const remaining = fullTotal - depositBase;
      if (remaining <= 0) continue;

      // Sign a token valid 30 days
      const token = await signToken(b.id, Math.floor(now / 1000) + 30 * 86400);
      const paymentLink = `${supabaseUrl}/functions/v1/get-balance-payment-link?token=${token}`;

      await dispatch(supabase, {
        photographer_id: b.photographer_id,
        trigger: "balance_due_session_day",
        recipient_email: b.client_email,
        recipient_name: b.client_name,
        booking_id: b.id,
        vars: {
          shoot_date: b.booked_date,
          shoot_time: String(startTime).slice(0, 5),
          session_type: s.title || "",
          balance_amount: fmtBRL(remaining),
          payment_link: paymentLink,
        },
      });
      results.balance_due_session_day++;
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
