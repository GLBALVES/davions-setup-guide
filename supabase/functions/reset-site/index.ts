// Reset photographer's website: deletes all site_pages and resets photographer_site
// to defaults (keeps the chosen template). Authenticated; only resets the caller's data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate the JWT and resolve the user
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve the photographer_id (owner) — studio members reset their owner's site
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let photographerId = user.id;
    const { data: member } = await admin
      .from("studio_members")
      .select("photographer_id")
      .eq("email", user.email ?? "")
      .eq("status", "active")
      .maybeSingle();
    if (member?.photographer_id) photographerId = member.photographer_id;

    // Optional: client may pass a desired template to keep after reset
    let keepTemplate = "editorial";
    try {
      if (req.headers.get("content-length") && req.headers.get("content-length") !== "0") {
        const body = await req.json();
        if (typeof body?.keep_template === "string" && body.keep_template.length < 64) {
          keepTemplate = body.keep_template;
        }
      }
    } catch { /* no body, ignore */ }

    // 1. Delete every site page
    const { error: delPagesErr } = await admin
      .from("site_pages")
      .delete()
      .eq("photographer_id", photographerId);
    if (delPagesErr) throw new Error(`Failed to delete pages: ${delPagesErr.message}`);

    // 2. Reset photographer_site to defaults (preserve photographer_id + template)
    const resetPayload = {
      photographer_id: photographerId,
      logo_url: null,
      tagline: null,
      accent_color: "#000000",
      site_headline: null,
      site_subheadline: null,
      cta_text: "Book a Session",
      cta_link: null,
      about_title: "About",
      about_image_url: null,
      instagram_url: null,
      facebook_url: null,
      pinterest_url: null,
      tiktok_url: null,
      youtube_url: null,
      whatsapp: null,
      linkedin_url: null,
      show_store: true,
      show_blog: false,
      show_booking: true,
      show_about: true,
      show_contact: true,
      site_template: keepTemplate,
      seo_title: null,
      seo_description: null,
      og_image_url: null,
      google_analytics_id: null,
      facebook_pixel_id: null,
      footer_text: null,
      site_hero_image_url: null,
      favicon_url: null,
      quote_text: null,
      quote_author: null,
      experience_title: null,
      experience_text: null,
      site_sections_order: null,
      testimonials: [],
      header_bg_color: null,
      header_text_color: null,
      header_visible_socials: null,
      footer_bg_color: null,
      footer_text_color: null,
      footer_show_logo: false,
      footer_show_socials: true,
      footer_visible_socials: null,
      footer_preset: "social",
      hero_bg_color: null,
      hero_text_color: null,
      sessions_bg_color: null,
      sessions_text_color: null,
      portfolio_bg_color: null,
      portfolio_text_color: null,
      about_bg_color: null,
      about_text_color: null,
      quote_bg_color: null,
      quote_text_color: null,
      experience_bg_color: null,
      experience_text_color: null,
      contact_bg_color: null,
      contact_text_color: null,
      testimonials_bg_color: null,
      testimonials_text_color: null,
      site_pages_initialized: false,
      heading_font: null,
      body_font: null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await admin
      .from("photographer_site")
      .upsert(resetPayload, { onConflict: "photographer_id" });
    if (upsertErr) throw new Error(`Failed to reset site: ${upsertErr.message}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[reset-site] error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
