import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple ZIP builder (STORE method, no compression — fastest for already-compressed images)
function buildZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder();
  const localHeaders: Uint8Array[] = [];
  const centralDirs: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(file.data);

    // Local file header
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true);          // version needed
    lv.setUint16(6, 0, true);           // flags
    lv.setUint16(8, 0, true);           // compression: STORE
    lv.setUint16(10, 0, true);          // mod time
    lv.setUint16(12, 0, true);          // mod date
    lv.setUint32(14, crc, true);        // crc-32
    lv.setUint32(18, file.data.length, true); // compressed size
    lv.setUint32(22, file.data.length, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true); // file name length
    lv.setUint16(28, 0, true);          // extra field length
    local.set(nameBytes, 30);

    localHeaders.push(local);
    localHeaders.push(file.data);

    // Central directory entry
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); // signature
    cv.setUint16(4, 20, true);          // version made by
    cv.setUint16(6, 20, true);          // version needed
    cv.setUint16(8, 0, true);           // flags
    cv.setUint16(10, 0, true);          // compression
    cv.setUint16(12, 0, true);          // mod time
    cv.setUint16(14, 0, true);          // mod date
    cv.setUint32(16, crc, true);        // crc-32
    cv.setUint32(20, file.data.length, true); // compressed size
    cv.setUint32(24, file.data.length, true); // uncompressed size
    cv.setUint16(28, nameBytes.length, true); // name length
    cv.setUint16(30, 0, true);          // extra field length
    cv.setUint16(32, 0, true);          // comment length
    cv.setUint16(34, 0, true);          // disk number start
    cv.setUint16(36, 0, true);          // internal attributes
    cv.setUint32(38, 0, true);          // external attributes
    cv.setUint32(42, offset, true);     // offset of local header
    central.set(nameBytes, 46);

    centralDirs.push(central);
    offset += local.length + file.data.length;
  }

  // End of central directory
  const centralSize = centralDirs.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const allParts = [...localHeaders, ...centralDirs, eocd];
  const totalSize = allParts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const p of allParts) { result.set(p, pos); pos += p.length; }
  return result;
}

// CRC-32 table
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { galleryId, clientToken } = await req.json();
    if (!galleryId) return new Response(JSON.stringify({ error: "galleryId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch gallery — must be published final
    const { data: gallery, error: gErr } = await supabase
      .from("galleries")
      .select("id, title, category, status, access_code")
      .eq("id", galleryId)
      .eq("status", "published")
      .single();

    if (gErr || !gallery) {
      return new Response(JSON.stringify({ error: "Gallery not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (gallery.category !== "final") {
      return new Response(JSON.stringify({ error: "Download only available for final galleries" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch photos
    const { data: photos } = await supabase
      .from("photos")
      .select("id, filename, storage_path")
      .eq("gallery_id", galleryId)
      .order("order_index", { ascending: true });

    if (!photos || photos.length === 0) {
      return new Response(JSON.stringify({ error: "No photos in this gallery" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Download all photos from storage and pack into ZIP
    const files: { name: string; data: Uint8Array }[] = [];
    const fetchPromises = photos.map(async (photo) => {
      if (!photo.storage_path) return;
      const { data: blob, error } = await supabase.storage
        .from("gallery-photos")
        .download(photo.storage_path);
      if (error || !blob) return;
      const arrayBuffer = await blob.arrayBuffer();
      files.push({ name: photo.filename || `photo-${photo.id}.jpg`, data: new Uint8Array(arrayBuffer) });
    });

    await Promise.all(fetchPromises);

    if (files.length === 0) {
      return new Response(JSON.stringify({ error: "Failed to fetch photos" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Sort files by name to keep consistent order
    files.sort((a, b) => a.name.localeCompare(b.name));

    const zipData = buildZip(files);
    const safeTitle = (gallery.title as string).replace(/[^a-z0-9]/gi, "-").toLowerCase();

    return new Response(zipData, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeTitle}.zip"`,
        "Content-Length": String(zipData.length),
      },
    });
  } catch (err) {
    console.error("download-gallery-zip error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
