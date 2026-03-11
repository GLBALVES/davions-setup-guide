import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Upload, Trash2, Plus, Loader2 } from "lucide-react";

interface BrandAsset { id: string; name: string; file_url: string; width: number | null; height: number | null; category: string; }

interface Props { onAddToCanvas: (url: string, width?: number, height?: number) => void; }

export default function BrandAssetsLibrary({ onAddToCanvas }: Props) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAssets = async () => {
    const { data } = await (supabase as any).from("brand_assets").select("*").order("created_at", { ascending: false });
    setAssets((data as BrandAsset[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAssets(); }, []);

  const handleUpload = async (file: File) => {
    if (!user || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => reject(new Error("Error loading image"));
        img.src = URL.createObjectURL(file);
      });
      const ext = file.name.split(".").pop() || "png";
      const fileName = `brand-assets/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("creative-assets").upload(fileName, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("creative-assets").getPublicUrl(fileName);
      const assetName = file.name.replace(/\.[^.]+$/, "").slice(0, 40);
      const { error: dbErr } = await (supabase as any).from("brand_assets").insert({
        name: assetName, file_url: urlData.publicUrl, width: dims.w, height: dims.h, category: "logo", photographer_id: user.id,
      });
      if (dbErr) throw dbErr;
      toast({ title: "Asset saved!" });
      fetchAssets();
    } catch (e: any) {
      toast({ title: "Upload error", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (asset: BrandAsset) => {
    const { error } = await (supabase as any).from("brand_assets").delete().eq("id", asset.id);
    if (error) { toast({ title: "Error deleting", variant: "destructive" }); return; }
    setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    toast({ title: "Asset removed!" });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="w-full gap-1 text-xs" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {uploading ? "Uploading..." : "Upload Logo / Element"}
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
      </div>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : assets.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No brand assets saved</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {assets.map((asset) => (
            <div key={asset.id} className="relative group border rounded-md overflow-hidden bg-muted/30">
              <img src={asset.file_url} alt={asset.name} className="w-full h-16 object-contain p-1" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6 text-white hover:text-primary" onClick={() => onAddToCanvas(asset.file_url, asset.width ?? undefined, asset.height ?? undefined)} title="Add to canvas"><Plus className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-white hover:text-destructive" onClick={() => handleDelete(asset)} title="Remove"><Trash2 className="h-3 w-3" /></Button>
              </div>
              <p className="text-[10px] text-center truncate px-1 pb-1" title={asset.name}>{asset.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
