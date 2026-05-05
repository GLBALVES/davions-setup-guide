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
  };

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
