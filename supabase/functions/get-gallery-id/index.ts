import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const body = await req.json().catch(() => ({}));
    const { photographer_id, title } = body;

    if (!photographer_id) {
      return new Response(
        JSON.stringify({ status: "error", message: "photographer_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!title) {
      return new Response(
        JSON.stringify({ status: "error", message: "title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- Auth: verify photographer_id exists ---
    let verified = false;

    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const anonClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      try {
        const { data: claims, error } = await anonClient.auth.getClaims(token);
        if (!error && claims?.claims?.sub) {
          verified = true;
        }
      } catch (jwtErr) {
        console.warn("JWT verification failed, trying photographer_id fallback:", String(jwtErr));
      }
    }

    if (!verified && photographer_id) {
      const serviceClient = createClient(supabaseUrl, serviceKey);
      const { data } = await serviceClient
        .from("photographers")
        .select("id")
        .eq("id", photographer_id)
        .single();
      if (data) {
        verified = true;
      }
    }

    if (!verified) {
      return new Response(
        JSON.stringify({ status: "error", message: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Lookup gallery by photographer_id + title ---
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { data: gallery, error } = await serviceClient
      .from("galleries")
      .select("id, title, slug")
      .eq("photographer_id", photographer_id)
      .ilike("title", title)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("DB error:", error.message);
      return new Response(
        JSON.stringify({ status: "error", message: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!gallery) {
      console.warn(`Gallery not found for photographer_id=${photographer_id} title="${title}"`);
      return new Response(
        JSON.stringify({ status: "error", message: "Gallery not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found gallery id=${gallery.id} for title="${title}"`);
    return new Response(
      JSON.stringify({ status: "success", gallery_id: gallery.id, slug: gallery.slug, title: gallery.title }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-gallery-id error:", err);
    return new Response(
      JSON.stringify({ status: "error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
