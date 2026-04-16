import { useRef, useState } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ImageUploadFieldProps {
  value?: string;
  onChange: (url: string) => void;
  photographerId?: string | null;
  /** Folder inside the bucket (default: "blocks") */
  folder?: string;
  className?: string;
  /** Aspect ratio class for the preview area */
  aspectClass?: string;
}

const BUCKET = "site-assets";

export function ImageUploadField({
  value,
  onChange,
  photographerId,
  folder = "blocks",
  className,
  aspectClass = "aspect-video",
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be smaller than 10MB");
      return;
    }
    if (!photographerId) {
      toast.error("Not signed in");
      return;
    }

    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${photographerId}/${folder}/${crypto.randomUUID()}.${safeExt}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Image uploaded");
    } catch (e: any) {
      console.error("Upload failed", e);
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {value ? (
        <div className="relative group rounded-md overflow-hidden border border-border bg-muted/20">
          <div className={cn("w-full overflow-hidden", aspectClass)}>
            <img src={value} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="px-2 py-1 rounded text-[11px] bg-background text-foreground hover:bg-background/90 transition-colors flex items-center gap-1"
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="px-2 py-1 rounded text-[11px] bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          disabled={uploading}
          className={cn(
            "w-full border border-dashed border-border rounded-md flex flex-col items-center justify-center gap-1.5 bg-muted/10 hover:bg-muted/20 hover:border-foreground/30 transition-colors cursor-pointer p-4",
            aspectClass
          )}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted-foreground/60" />
          )}
          <span className="text-[10px] text-muted-foreground">
            {uploading ? "Uploading..." : "Click or drop image"}
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

export default ImageUploadField;
