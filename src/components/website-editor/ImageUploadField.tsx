import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  label: string;
  value: string | null;
  onChange: (url: string) => void;
  bucket?: string;
}

function FaviconTabPreview({ src }: { src: string }) {
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Tab Preview</span>
      {/* Browser chrome mockup */}
      <div className="rounded-t-md overflow-hidden border border-border shadow-sm">
        {/* Window controls bar */}
        <div className="bg-muted/60 px-3 py-2 flex items-center gap-1.5 border-b border-border">
          <span className="w-2.5 h-2.5 rounded-full bg-destructive/50" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/50" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
        </div>
        {/* Tab bar */}
        <div className="bg-muted/30 px-2 pt-2 flex items-end gap-0">
          {/* Active tab */}
          <div className="flex items-center gap-1.5 bg-background border border-b-0 border-border rounded-t-md px-3 py-1.5 max-w-[160px] min-w-0">
            <img src={src} alt="favicon" className="w-3.5 h-3.5 object-contain shrink-0" />
            <span className="text-[10px] text-foreground truncate font-light">Your Studio</span>
            <X className="h-2.5 w-2.5 text-muted-foreground/50 shrink-0 ml-auto" />
          </div>
          {/* Ghost new-tab button */}
          <div className="pb-1 pl-1 text-muted-foreground/30 text-base leading-none">+</div>
        </div>
        {/* Address bar */}
        <div className="bg-background border-t border-border px-3 py-1.5 flex items-center gap-2">
          <div className="flex-1 bg-muted/40 rounded-full px-3 py-1 flex items-center gap-1.5">
            <span className="text-[9px] text-muted-foreground/60">🔒</span>
            <span className="text-[9px] text-muted-foreground/60 font-light truncate">yourstudio.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImageUploadField({ label, value, onChange, bucket = "site-assets" }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const isFavicon = label.toLowerCase().includes("favicon");

  const handleFile = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">{label}</span>
      {value ? (
        <div className="relative group">
          <img
            src={value}
            alt={label}
            className={`w-full rounded-sm border border-border bg-muted/20 ${
              isFavicon
                ? "h-20 object-contain p-3"
                : "h-28 object-contain"
            }`}
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1 right-1 bg-background/80 hover:bg-background border border-border rounded-sm p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className={`flex flex-col items-center justify-center gap-2 border border-dashed border-border hover:border-foreground/30 transition-colors rounded-sm bg-muted/20 hover:bg-muted/40 ${
            isFavicon ? "h-20" : "h-28"
          }`}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
          <span className="text-[10px] text-muted-foreground">{uploading ? "Uploading..." : "Click to upload"}</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {/* Browser tab preview — only for favicon */}
      {isFavicon && value && <FaviconTabPreview src={value} />}
    </div>
  );
}
