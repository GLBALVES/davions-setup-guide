import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gallery_id, client_email, client_name, photo_count, is_free, dedupe_key } =
      await req.json();

    if (!gallery_id || typeof gallery_id !== "string") {
      return new Response(JSON.stringify({ error: "gallery_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: gallery, error: gErr } = await supabase
      .from("galleries")
      .select("id, title, photographer_id, slug")
      .eq("id", gallery_id)
      .maybeSingle();

    if (gErr || !gallery) {
      return new Response(JSON.stringify({ error: "gallery not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dedupe — avoid double notifications (Stripe success_url remounts)
    if (dedupe_key) {
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("photographer_id", gallery.photographer_id)
        .eq("event", "gallery_checkout")
        .contains("metadata", { dedupe_key })
        .limit(1)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ ok: true, deduped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const who = client_name || client_email || "Client";
    const count = Number(photo_count) || 0;
    const title = is_free
      ? `Selection submitted — ${who}`
      : `Gallery purchase — ${who}`;
    const body = is_free
      ? `${who} submitted ${count} photo${count !== 1 ? "s" : ""} from "${gallery.title}".`
      : `${who} purchased ${count} photo${count !== 1 ? "s" : ""} from "${gallery.title}".`;

    const { data: pref } = await supabase
      .from("notification_preferences")
      .select("in_app, browser_push")
      .eq("photographer_id", gallery.photographer_id)
      .eq("event", "gallery_checkout")
      .maybeSingle();

    const inApp = pref ? (pref as any).in_app : true;
    const push = pref ? (pref as any).browser_push : false;

    if (inApp) {
      await supabase.from("notifications").insert({
        photographer_id: gallery.photographer_id,
        type: "success",
        event: "gallery_checkout",
        title,
        body,
        metadata: {
          gallery_id: gallery.id,
          client_email: client_email ?? null,
          photo_count: count,
          is_free: !!is_free,
          dedupe_key: dedupe_key ?? null,
        },
      });
    }

    if (push) {
      try {
        await supabase.functions.invoke("send-push", {
          body: {
            photographer_id: gallery.photographer_id,
            title,
            body,
            url: `/dashboard/galleries`,
          },
        });
      } catch (e) {
        console.error("[notify-gallery-checkout] push failed", e);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-gallery-checkout] error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
