import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Star, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CreativeImage { id: string; photographer_id: string; file_url: string; name: string; is_favorite: boolean; created_at: string; }

interface Props { open: boolean; onOpenChange: (open: boolean) => void; onSelectImage: (url: string) => void; }

export default function CreativeImageBank({ open, onOpenChange, onSelectImage }: Props) {
  const [images, setImages] = useState<CreativeImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "favorites">("all");

  const fetchImages = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).from("creative_images").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setImages((data as any[]) || []);
    } catch (e: any) {
      toast({ title: "Error loading images", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { if (open) fetchImages(); }, [open]);

  const toggleFavorite = async (img: CreativeImage) => {
    try {
      const { error } = await (supabase as any).from("creative_images").update({ is_favorite: !img.is_favorite }).eq("id", img.id);
      if (error) throw error;
      setImages((prev) => prev.map((i) => (i.id === img.id ? { ...i, is_favorite: !i.is_favorite } : i)));
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const deleteImage = async (img: CreativeImage) => {
    try {
      const urlParts = img.file_url.split("/creative-assets/");
      if (urlParts[1]) { await supabase.storage.from("creative-assets").remove([decodeURIComponent(urlParts[1])]); }
      const { error } = await (supabase as any).from("creative_images").delete().eq("id", img.id);
      if (error) throw error;
      setImages((prev) => prev.filter((i) => i.id !== img.id));
      toast({ title: "Image deleted!" });
    } catch (e: any) { toast({ title: "Error deleting", description: e.message, variant: "destructive" }); }
  };

  const filtered = filter === "favorites" ? images.filter((i) => i.is_favorite) : images;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-light tracking-wide">
            <ImageIcon className="h-5 w-5" /> Image Bank
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mb-3">
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")} className="text-xs">
            All ({images.length})
          </Button>
          <Button size="sm" variant={filter === "favorites" ? "default" : "outline"} onClick={() => setFilter("favorites")} className="text-xs">
            <Star className="h-3.5 w-3.5 mr-1" /> Favorites ({images.filter((i) => i.is_favorite).length})
          </Button>
        </div>
        <ScrollArea className="h-[50vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-12">
              {filter === "favorites" ? "No favorite images." : "No images generated yet."}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((img) => (
                <div key={img.id} className="relative group rounded-lg border border-border overflow-hidden">
                  <button onClick={() => { onSelectImage(img.file_url); onOpenChange(false); }} className="w-full">
                    <img src={img.file_url} alt={img.name} className="w-full h-28 object-cover hover:opacity-80 transition-opacity" />
                  </button>
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(img); }} className="bg-background/80 rounded-full p-1 hover:bg-background">
                      <Star className={`h-3.5 w-3.5 ${img.is_favorite ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteImage(img); }} className="bg-background/80 rounded-full p-1 hover:bg-destructive/20">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground px-1 py-0.5 truncate">{img.name || new Date(img.created_at).toLocaleDateString("en-US")}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
