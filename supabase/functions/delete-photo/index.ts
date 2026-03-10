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
    // Parse body once at the top
    const body = await req.json().catch(() => ({}));
    const { photo_id, photographer_id } = body;

    console.log("delete-photo called with photo_id:", photo_id, "photographer_id:", photographer_id);

    if (!photo_id) {
      return new Response(
        JSON.stringify({ status: "error", message: "photo_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
    const anonKey      = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- Auth verification ---
    let verified = false;

    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const anonClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      try {
        const { data: claims, error: claimsError } = await anonClient.auth.getClaims(token);
        if (claimsError) {
          console.warn("Bearer auth error:", claimsError.message);
        } else if (claims?.claims?.sub) {
          console.log("Authenticated via Bearer token, userId:", claims.claims.sub);
          verified = true;
        }
      } catch (jwtErr) {
        console.warn("JWT verification failed (possibly expired), trying photographer_id fallback:", String(jwtErr));
        // verified permanece false → fallback de photographer_id será tentado
      }
    }

    // Fallback: verify photographer_id exists in DB
    if (!verified && photographer_id) {
      const serviceClient = createClient(supabaseUrl, serviceKey);
      const { data, error } = await serviceClient
        .from("photographers")
        .select("id")
        .eq("id", photographer_id)
        .single();
      if (error || !data) {
        console.error("photographer_id auth fallback failed:", error?.message);
      } else {
        console.log("Authenticated via photographer_id fallback:", photographer_id);
        verified = true;
      }
    }

    if (!verified) {
      return new Response(
        JSON.stringify({ status: "error", message: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for all operations to bypass RLS
    const serviceClient = createClient(supabaseUrl, serviceKey);

    // 1. Fetch the photo record to get storage_path
    const { data: photo, error: fetchError } = await serviceClient
      .from("photos")
      .select("storage_path")
      .eq("id", photo_id)
      .single();

    if (fetchError || !photo) {
      console.error("Photo not found:", fetchError?.message);
      return new Response(
        JSON.stringify({ status: "error", message: "Photo not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found photo with storage_path:", photo.storage_path);

    // 2. Delete from Storage
    if (photo.storage_path) {
      const { error: storageError } = await serviceClient.storage
        .from("gallery-photos")
        .remove([photo.storage_path]);
      if (storageError) {
        console.error("Storage delete error:", storageError.message);
      } else {
        console.log("Storage file deleted:", photo.storage_path);
      }
    } else {
      console.log("No storage_path on record, skipping storage delete");
    }

    // 3. Delete from DB
    const { error: dbError } = await serviceClient
      .from("photos")
      .delete()
      .eq("id", photo_id);

    if (dbError) {
      console.error("DB delete error:", dbError.message);
      return new Response(
        JSON.stringify({ status: "error", message: dbError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Deleted photo_id:", photo_id);
    return new Response(
      JSON.stringify({ deleted: photo_id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("delete-photo error:", err);
    return new Response(
      JSON.stringify({ status: "error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
