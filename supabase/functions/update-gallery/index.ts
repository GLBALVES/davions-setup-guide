import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Generate URL-friendly slug from a string
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Ensure slug uniqueness, excluding the current gallery
async function uniqueSlug(
  supabase: ReturnType<typeof createClient>,
  base: string,
  photographerId: string,
  excludeGalleryId: string
): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (true) {
    const { data } = await supabase
      .from("galleries")
      .select("id")
      .eq("slug", slug)
      .eq("photographer_id", photographerId)
      .neq("id", excludeGalleryId)
      .maybeSingle();
    if (!data) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
}

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
    try {
      const { data: claims, error } = await supabase.auth.getClaims(token);
      if (!error && claims?.claims) {
        return { supabase, userId: claims.claims.sub as string };
      }
    } catch (jwtErr) {
      console.warn("JWT verification failed, trying photographer_id fallback:", String(jwtErr));
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

    const { gallery_id, gallery_name, gallery_type } = await req.json();
    console.log("update-gallery called with gallery_id:", gallery_id, "gallery_name:", gallery_name, "gallery_type:", gallery_type);

    if (!gallery_id) {
      return new Response(
        JSON.stringify({ status: "error", message: "gallery_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (gallery_name !== undefined) {
      updates.title = gallery_name;
      // Regenerate slug whenever the title changes, ensuring uniqueness
      const base = slugify(gallery_name) || "gallery";
      updates.slug = await uniqueSlug(auth.supabase, base, auth.userId, gallery_id);
    }

    if (gallery_type !== undefined) updates.category = gallery_type;

    const { error } = await auth.supabase
      .from("galleries")
      .update(updates)
      .eq("id", gallery_id);

    if (error) {
      return new Response(
        JSON.stringify({ status: "error", message: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ status: "success", slug: updates.slug }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ status: "error", message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
