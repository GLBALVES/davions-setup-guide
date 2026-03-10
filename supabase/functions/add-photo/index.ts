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
    const formData = await req.formData();

    const photo        = formData.get("photo") as File | null;
    const gallery_id   = formData.get("gallery_id") as string | null;
    const photographer_id = formData.get("photographer_id") as string | null;
    const photo_name   = formData.get("photo_name") as string | null;
    const orderRaw     = formData.get("order_index");
    const order_index  = orderRaw ? parseInt(orderRaw as string, 10) : 0;

    // Validate required fields
    if (!photo) {
      return new Response(
        JSON.stringify({ status: "error", message: "photo is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!gallery_id) {
      return new Response(
        JSON.stringify({ status: "error", message: "gallery_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!photographer_id) {
      return new Response(
        JSON.stringify({ status: "error", message: "photographer_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl      = Deno.env.get("SUPABASE_URL")!;
    const serviceKey       = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey          = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth: try Bearer token first, fall back to photographer_id field
    let userId: string | null = null;
    let dbClient = createClient(supabaseUrl, serviceKey); // default: service role

    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const anonClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userError } = await anonClient.auth.getUser(token);
      if (userError) {
        console.error("Bearer auth error:", userError.message);
      } else if (userData?.user) {
        userId = userData.user.id;
        dbClient = anonClient;
      }
    }

    // Fallback: verify photographer_id exists in DB using service role
    if (!userId) {
      const { data, error } = await dbClient
        .from("photographers")
        .select("id")
        .eq("id", photographer_id)
        .single();

      if (error || !data) {
        console.error("photographer_id auth fallback failed:", error?.message);
        return new Response(
          JSON.stringify({ status: "error", message: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = photographer_id;
    }

    // Upload file to storage
    const arrayBuffer = await photo.arrayBuffer();
    const uint8Array  = new Uint8Array(arrayBuffer);

    // Use original name for DB display, safe name for storage path
    const originalName = photo_name || `${crypto.randomUUID()}.jpg`;
    const ext = originalName.split(".").pop() ?? "jpg";
    // Thorough sanitization: normalize accents, then keep only safe chars
    const safeName = originalName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")  // strip diacritics
      .replace(/[^a-zA-Z0-9.\-_]/g, "_")
      .replace(/_+/g, "_");
    const storagePath = `${userId}/${gallery_id}/${safeName}`;

    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg",
      png: "image/png",  webp: "image/webp",
      tif: "image/tiff", tiff: "image/tiff",
    };
    const mimeType = mimeMap[ext.toLowerCase()] ?? "image/jpeg";

    const storageClient = createClient(supabaseUrl, serviceKey);
    const { error: uploadError } = await storageClient.storage
      .from("gallery-photos")
      .upload(storagePath, uint8Array, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.error("Storage upload error:", uploadError.message);
      return new Response(
        JSON.stringify({ status: "error", message: "Upload failed: " + uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Uploaded ${safeName} (${uint8Array.byteLength} bytes) → ${storagePath}`);

    // Deduplication: check if a record with the same filename already exists in this gallery
    const { data: existing } = await dbClient
      .from("photos")
      .select("id")
      .eq("gallery_id", gallery_id)
      .eq("filename", originalName)
      .maybeSingle();

    if (existing) {
      console.log(`Duplicate detected, returning existing photo_id: ${existing.id}`);
      return new Response(
        JSON.stringify({ photo_id: existing.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert photo record — save original filename for display, safe path for storage
    const { data, error: insertError } = await dbClient
      .from("photos")
      .insert({
        gallery_id,
        photographer_id: userId,
        filename: originalName,
        storage_path: storagePath,
        order_index,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("DB insert error:", insertError.message);
      return new Response(
        JSON.stringify({ status: "error", message: insertError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Photo record created: ${data.id}`);

    // Return photo_id at top level — required by the Lightroom plugin to call recordPublishedPhotoId
    return new Response(
      JSON.stringify({ photo_id: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("add-photo error:", error);
    return new Response(
      JSON.stringify({ status: "error", message: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
