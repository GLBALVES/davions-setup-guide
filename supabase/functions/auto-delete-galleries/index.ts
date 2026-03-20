import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // 1. Get all gallery_settings for auto-delete
    const { data: settingsRows } = await supabase
      .from("gallery_settings")
      .select("photographer_id, key, value")
      .in("key", [
        "proof_auto_delete_enabled", "proof_auto_delete_days",
        "final_auto_delete_enabled", "final_auto_delete_days",
      ]);

    if (!settingsRows || settingsRows.length === 0) {
      return new Response(JSON.stringify({ status: "ok", deleted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build per-photographer config map
    type Config = {
      proof_auto_delete_enabled?: string;
      proof_auto_delete_days?: string;
      final_auto_delete_enabled?: string;
      final_auto_delete_days?: string;
    };
    const configMap: Record<string, Config> = {};
    for (const row of settingsRows) {
      if (!configMap[row.photographer_id]) configMap[row.photographer_id] = {};
      (configMap[row.photographer_id] as any)[row.key] = row.value;
    }

    let totalDeleted = 0;

    for (const [photographerId, cfg] of Object.entries(configMap)) {
      for (const galleryType of ["proof", "final"] as const) {
        const enabledKey = `${galleryType}_auto_delete_enabled` as keyof Config;
        const daysKey = `${galleryType}_auto_delete_days` as keyof Config;

        if (cfg[enabledKey] !== "true") continue;
        const days = parseInt(cfg[daysKey] ?? "", 10);
        if (isNaN(days) || days <= 0) continue;

        const cutoffDate = new Date(Date.now() - days * 86400000).toISOString();

        // Find galleries of this type, unpublished (draft/expired), older than cutoff
        // We use updated_at as the "last status change" proxy
        const { data: galleries } = await supabase
          .from("galleries")
          .select("id")
          .eq("photographer_id", photographerId)
          .eq("category", galleryType)
          .in("status", ["draft", "expired"])
          .lt("updated_at", cutoffDate);

        if (!galleries || galleries.length === 0) continue;

        for (const gallery of galleries) {
          // Delete photos from storage
          const { data: photos } = await supabase
            .from("photos")
            .select("storage_path")
            .eq("gallery_id", gallery.id);

          if (photos && photos.length > 0) {
            const paths = photos.map((p) => p.storage_path).filter((p): p is string => !!p);
            if (paths.length > 0) {
              await supabase.storage.from("gallery-photos").remove(paths);
            }
          }

          // Delete gallery record (cascades to photos table)
          await supabase.from("galleries").delete().eq("id", gallery.id);
          totalDeleted++;
        }
      }
    }

    return new Response(JSON.stringify({ status: "ok", deleted: totalDeleted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ status: "error", message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
