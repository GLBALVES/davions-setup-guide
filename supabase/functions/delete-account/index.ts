import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: authedUser }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !authedUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authedUser.id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const photographerId = userId;

    // Delete data from all tables linked to this photographer
    const tablesToClean = [
      "notifications",
      "notification_preferences",
      "booking_invoice_items",
      "booking_briefing_responses",
      "mkt_email_campaign_emails",
      "mkt_email_campaigns",
      "mkt_email_automated",
      "mkt_email_oneoff",
      "mkt_push_notifications",
      "mkt_social_posts",
      "help_messages",
      "help_conversations",
      "ai_blog_images",
      "ai_blog_seo",
      "blogs",
      "ai_themes",
      "ai_blog_config",
      "blog_themes",
      "blog_posts",
      "blog_categories",
      "blog_settings",
      "creative_images",
      "creative_templates",
      "brand_assets",
      "ai_agents",
      "client_projects",
      "contracts",
      "briefings",
      "blocked_times",
      "analytics_pageviews",
      "gallery_settings",
      "galleries",
      "bookings",
      "clients",
    ];

    for (const table of tablesToClean) {
      try {
        await supabase.from(table).delete().eq("photographer_id", photographerId);
      } catch {
        // Some tables may use user_id instead
        try {
          await supabase.from(table).delete().eq("user_id", userId);
        } catch {
          // skip if neither column exists
        }
      }
    }

    // Clean user_id based email tables
    const userIdTables = [
      "email_emails",
      "email_contas",
      "email_pastas",
      "email_grupos",
      "email_grupo_contatos",
      "email_templates",
      "email_assinaturas",
      "email_bloqueados",
      "email_preferencias",
      "email_regras_segmentacao",
      "email_documents",
      "email_document_settings",
    ];

    for (const table of userIdTables) {
      try {
        await supabase.from(table).delete().eq("user_id", userId);
      } catch { /* skip */ }
    }

    // Delete storage files
    const buckets = [
      "gallery-photos",
      "session-covers",
      "site-assets",
      "creative-assets",
      "blog-images",
      "watermarks",
      "bug-screenshots",
      "project-documents",
    ];

    for (const bucket of buckets) {
      try {
        const { data: files } = await supabase.storage.from(bucket).list(userId);
        if (files && files.length > 0) {
          const paths = files.map((f) => `${userId}/${f.name}`);
          await supabase.storage.from(bucket).remove(paths);
        }
      } catch { /* skip */ }
    }

    // Delete bug reports
    try {
      await supabase.from("bug_report_messages").delete().eq("sender_id", userId);
      await supabase.from("bug_reports").delete().eq("reporter_id", userId);
    } catch { /* skip */ }

    // Delete photographer profile (sessions have cascade or need manual delete)
    try {
      // Sessions linked to photographer
      await supabase.from("sessions").delete().eq("photographer_id", photographerId);
    } catch { /* skip */ }

    // Delete photographer profile itself
    await supabase.from("photographers").delete().eq("id", photographerId);

    // Delete user from auth
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error("Failed to delete auth user:", deleteAuthError);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("delete-account error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
