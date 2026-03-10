import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function getAuthFromBearer(req: Request): Promise<{ userId: string; supabase: ReturnType<typeof createClient> } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error } = await supabase.auth.getClaims(token);
  if (!error && claims?.claims) {
    return { supabase, userId: claims.claims.sub as string };
  }
  return null;
}

async function getAuthFromPhotographerId(photographerId: string): Promise<{ userId: string; supabase: ReturnType<typeof createClient> } | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data } = await supabase.from("photographers").select("id").eq("id", photographerId).single();
  if (data) {
    return { supabase, userId: photographerId };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    const isMultipart = contentType.includes("multipart/form-data");

    // ── Multipart path (Lightroom plugin) ──────────────────────────────────
    if (isMultipart) {
      const formData = await req.formData();

      const gallery_id     = formData.get("gallery_id") as string | null;
      const photo_name     = formData.get("photo_name") as string | null;
      const photographer_id = formData.get("photographer_id") as string | null;
      const orderRaw       = formData.get("order_index");
      const order_index    = orderRaw ? parseInt(orderRaw as string, 10) : 0;

      if (!gallery_id) {
        return new Response(
          JSON.stringify({ status: "error", message: "gallery_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Auth: Bearer first, then photographer_id form field
      let auth = await getAuthFromBearer(req);
      if (!auth && photographer_id) {
        auth = await getAuthFromPhotographerId(photographer_id);
      }
      if (!auth) {
        return new Response(
          JSON.stringify({ status: "error", message: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Extract file bytes
      const file = formData.get("photo") as File | null;
      let storagePath: string | null = null;

      if (file) {
        const ext = (photo_name ? photo_name.split(".").pop() : null) || "jpg";
        const fileName = photo_name || `${crypto.randomUUID()}.${ext}`;
        storagePath = `${auth.userId}/${gallery_id}/${fileName}`;

        const bytes = new Uint8Array(await file.arrayBuffer());

        const contentTypeMap: Record<string, string> = {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          webp: "image/webp",
          tif: "image/tiff",
          tiff: "image/tiff",
        };
        const mimeType = contentTypeMap[ext.toLowerCase()] ?? "image/jpeg";

        const storageClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { error: uploadError } = await storageClient.storage
          .from("gallery-photos")
          .upload(storagePath, bytes, { contentType: mimeType, upsert: true });

        if (uploadError) {
          return new Response(
            JSON.stringify({ status: "error", message: "Upload failed: " + uploadError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const { data, error } = await auth.supabase
        .from("photos")
        .insert({
          gallery_id,
          photographer_id: auth.userId,
          filename: photo_name ?? "",
          storage_path: storagePath,
          order_index,
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
    }

    // ── JSON / base64 path (legacy fallback) ───────────────────────────────
    const auth = await getAuthFromBearer(req);
    if (!auth) {
      // Try photographer_id in JSON body
      const body = await req.json();
      const legacyAuth = body.photographer_id
        ? await getAuthFromPhotographerId(body.photographer_id)
        : null;

      if (!legacyAuth) {
        return new Response(
          JSON.stringify({ status: "error", message: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { gallery_id, photo_name, photo, order_index } = body;

      if (!gallery_id) {
        return new Response(
          JSON.stringify({ status: "error", message: "gallery_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let storagePath: string | null = null;

      if (photo) {
        const base64Data = photo.replace(/^data:[^;]+;base64,/, "");
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const ext = photo_name ? photo_name.split(".").pop() || "jpg" : "jpg";
        const fileName = photo_name || `${crypto.randomUUID()}.${ext}`;
        storagePath = `${legacyAuth.userId}/${gallery_id}/${fileName}`;

        const storageClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { error: uploadError } = await storageClient.storage
          .from("gallery-photos")
          .upload(storagePath, bytes, {
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

      const { data, error } = await legacyAuth.supabase
        .from("photos")
        .insert({
          gallery_id,
          photographer_id: legacyAuth.userId,
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
    }

    // Bearer JSON path
    const body = await req.json();
    const { gallery_id, photo_name, photo, order_index } = body;

    if (!gallery_id) {
      return new Response(
        JSON.stringify({ status: "error", message: "gallery_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let storagePath: string | null = null;

    if (photo) {
      const base64Data = photo.replace(/^data:[^;]+;base64,/, "");
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const ext = photo_name ? photo_name.split(".").pop() || "jpg" : "jpg";
      const fileName = photo_name || `${crypto.randomUUID()}.${ext}`;
      storagePath = `${auth.userId}/${gallery_id}/${fileName}`;

      const storageClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { error: uploadError } = await storageClient.storage
        .from("gallery-photos")
        .upload(storagePath, bytes, {
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
