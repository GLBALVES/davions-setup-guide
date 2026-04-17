import { useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EditableImageProps {
  value?: string | null;
  onChange: (url: string) => void;
  photographerId?: string | null;
  /** Folder inside the bucket (default: "blocks") */
  folder?: string;
  className?: string;
  /** Children render the image (or placeholder). The overlay floats above. */
  children: React.ReactNode;
  editMode?: boolean;
  /** When true, allow removing (sets to "") */
  removable?: boolean;
}

const BUCKET = "site-assets";

/**
 * Wraps any image area in the editor preview. On hover (when editMode=true),
 * shows an overlay with Replace / Remove buttons. Clicking Replace opens a
 * file picker and uploads to the photographer's site-assets folder.
 */
export default function EditableImage({
  value,
  onChange,
  photographerId,
  folder = "blocks",
  className,
  children,
  editMode = true,
  removable = true,
}: EditableImageProps) {
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
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${photographerId}/${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Image updated");
    } catch (e: any) {
      console.error("Upload failed", e);
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (!editMode) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative group/img", className)}>
      {children}
      <div
        className={cn(
          "absolute inset-0 z-10 flex items-center justify-center gap-2",
          "bg-foreground/30 opacity-0 group-hover/img:opacity-100 transition-opacity",
          "pointer-events-none"
        )}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          disabled={uploading}
          className="pointer-events-auto px-2.5 py-1.5 rounded text-[11px] bg-background text-foreground hover:bg-background/90 transition-colors flex items-center gap-1.5 shadow-md"
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : value ? <RefreshCw className="h-3 w-3" /> : <ImagePlus className="h-3 w-3" />}
          {value ? "Replace" : "Add image"}
        </button>
        {value && removable && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="pointer-events-auto px-2.5 py-1.5 rounded text-[11px] bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center gap-1.5 shadow-md"
          >
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        )}
      </div>
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
