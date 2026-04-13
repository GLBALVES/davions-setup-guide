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

    // Use service role to gather all data
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get photographer_id (could be the user or via studio_members)
    const { data: photographer } = await supabase
      .from("photographers")
      .select("*")
      .eq("id", userId)
      .single();

    const photographerId = photographer?.id ?? userId;

    // Gather data from all relevant tables
    const [
      bookingsRes,
      clientsRes,
      galleriesRes,
      sessionsRes,
      projectsRes,
      contractsRes,
      notificationsRes,
    ] = await Promise.all([
      supabase.from("bookings").select("id, client_name, client_email, booked_date, status, payment_status, created_at").eq("photographer_id", photographerId),
      supabase.from("clients").select("full_name, email, phone, birth_date, address_street, address_city, address_state, address_zip, address_country, instagram, created_at").eq("photographer_id", photographerId),
      supabase.from("galleries").select("id, title, status, category, created_at").eq("photographer_id", photographerId),
      supabase.from("sessions").select("id, title, price, duration_minutes, created_at").eq("photographer_id", photographerId),
      supabase.from("client_projects").select("id, title, client_name, client_email, stage, created_at").eq("photographer_id", photographerId),
      supabase.from("contracts").select("id, name, created_at").eq("photographer_id", photographerId),
      supabase.from("notifications").select("id, title, body, event, created_at").eq("photographer_id", photographerId),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: userId,
      photographer_id: photographerId,
      profile: photographer ?? null,
      bookings: bookingsRes.data ?? [],
      clients: clientsRes.data ?? [],
      galleries: galleriesRes.data ?? [],
      sessions: sessionsRes.data ?? [],
      projects: projectsRes.data ?? [],
      contracts: contractsRes.data ?? [],
      notifications: notificationsRes.data ?? [],
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="user-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    console.error("export-user-data error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
