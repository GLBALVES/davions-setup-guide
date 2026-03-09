import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function getAuthenticatedClient(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const body = await req.clone().json().catch(() => ({}));

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error } = await supabase.auth.getClaims(token);
    if (!error && claims?.claims) {
      return { supabase, userId: claims.claims.sub as string };
    }
  }

  if (body.photographer_id) {
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data } = await supabase.from("photographers").select("id").eq("id", body.photographer_id).single();
    if (data) {
      return { supabase, userId: body.photographer_id as string };
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await getAuthenticatedClient(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ status: "error", message: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { gallery_id, photo_name, photo, order_index } = await req.json();

    if (!gallery_id) {
      return new Response(
        JSON.stringify({ status: "error", message: "gallery_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let storagePath: string | null = null;

    // Handle base64 photo upload
    if (photo) {
      // Strip data URI prefix: "data:image/jpeg;base64,..."
      const base64Data = photo.replace(/^data:[^;]+;base64,/, "");
      const fileBytes = decode(base64Data);

      // Determine extension from data URI or filename
      const ext = photo_name
        ? photo_name.split(".").pop() || "jpg"
        : "jpg";
      const fileName = photo_name || `${crypto.randomUUID()}.${ext}`;
      storagePath = `${auth.userId}/${gallery_id}/${fileName}`;

      // Use service role client for storage upload (bypasses RLS cleanly)
      const storageClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { error: uploadError } = await storageClient.storage
        .from("gallery-photos")
        .upload(storagePath, fileBytes, {
          contentType: `image/${ext === "png" ? "png" : "jpeg"}`,
          upsert: true,
        });

      if (uploadError) {
        return new Response(
          JSON.stringify({ status: "error", message: "Upload failed: " + uploadError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Insert photo record
    const { data, error } = await auth.supabase
      .from("photos")
      .insert({
        gallery_id,
        photographer_id: auth.userId,
        filename: photo_name ?? "",
        storage_path: storagePath,
        order_index: order_index ?? 0,
      })
      .select("id")
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ status: "error", message: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ status: "success", response: { photo_id: data.id } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ status: "error", message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
