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
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Generate a random 6-char alphanumeric access code (no ambiguous chars)
function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function getAuthenticatedClient(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const body = await req.clone().json().catch(() => ({}));

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Try Bearer token first, then fall back to photographer_id in body
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
      console.warn("JWT verification failed (possibly expired), trying photographer_id fallback:", String(jwtErr));
    }
  }

  // Fallback: photographer_id in body (legacy plugin without auth headers)
  if (body.photographer_id) {
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data } = await supabase.from("photographers").select("id").eq("id", body.photographer_id).single();
    if (data) {
      return { supabase, userId: body.photographer_id as string };
    }
  }

  return null;
}

// Ensure slug uniqueness by appending a suffix if needed
async function uniqueSlug(supabase: ReturnType<typeof createClient>, base: string, photographerId: string): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (true) {
    const { data } = await supabase
      .from("galleries")
      .select("id")
      .eq("slug", slug)
      .eq("photographer_id", photographerId)
      .maybeSingle();
    if (!data) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
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

    const { gallery_name, gallery_type } = await req.json();

    const title = gallery_name ?? "";
    const baseSlug = slugify(title) || "gallery";
    const slug = await uniqueSlug(auth.supabase, baseSlug, auth.userId);
    const access_code = generateAccessCode();

    const { data, error } = await auth.supabase
      .from("galleries")
      .insert({
        photographer_id: auth.userId,
        title,
        category: gallery_type ?? "proof",
        slug,
        access_code,
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
      JSON.stringify({ status: "success", response: { unique_id: data.id, slug, access_code } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ status: "error", message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
