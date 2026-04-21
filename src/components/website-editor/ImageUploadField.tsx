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
  /**
   * Validation options. All optional — when omitted, defaults preserve previous
   * behavior (any image up to 10MB).
   */
  /** Allowed MIME types, e.g. ["image/png","image/svg+xml","image/x-icon"] */
  allowedTypes?: string[];
  /** Friendly label for allowed formats shown in error toasts (e.g. "PNG, SVG, ICO") */
  allowedTypesLabel?: string;
  /** Max file size in MB (default 10) */
  maxSizeMB?: number;
  /** Min width in pixels (validated against decoded image) */
  minWidth?: number;
  /** Min height in pixels */
  minHeight?: number;
  /** Max width in pixels */
  maxWidth?: number;
  /** Max height in pixels */
  maxHeight?: number;
  /** Require exact square (width === height) */
  requireSquare?: boolean;
  /** Helper text shown under the upload area */
  helperText?: string;
}

const BUCKET = "site-assets";

export function ImageUploadField({
  value,
  onChange,
  photographerId,
  folder = "blocks",
  className,
  aspectClass = "aspect-video",
  allowedTypes,
  allowedTypesLabel,
  maxSizeMB = 10,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  requireSquare,
  helperText,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  /** Decode the file to get intrinsic pixel dimensions (skipped for SVG). */
  const readImageSize = (file: File): Promise<{ width: number; height: number } | null> =>
    new Promise((resolve) => {
      if (file.type === "image/svg+xml") return resolve(null);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    // Format validation
    if (allowedTypes && allowedTypes.length > 0) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(
          `Invalid format. Allowed: ${allowedTypesLabel || allowedTypes.join(", ")}`
        );
        return;
      }
    } else if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Size validation
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${maxSizeMB}MB`);
      return;
    }

    if (!photographerId) {
      toast.error("Not signed in");
      return;
    }

    // Dimension validation (skipped silently for SVG / non-decodable)
    if (minWidth || minHeight || maxWidth || maxHeight || requireSquare) {
      const dims = await readImageSize(file);
      if (dims) {
        if (requireSquare && dims.width !== dims.height) {
          toast.error(
            `Image must be square (got ${dims.width}×${dims.height}px)`
          );
          return;
        }
        if (minWidth && dims.width < minWidth) {
          toast.error(`Image width must be at least ${minWidth}px (got ${dims.width}px)`);
          return;
        }
        if (minHeight && dims.height < minHeight) {
          toast.error(`Image height must be at least ${minHeight}px (got ${dims.height}px)`);
          return;
        }
        if (maxWidth && dims.width > maxWidth) {
          toast.error(`Image width must be at most ${maxWidth}px (got ${dims.width}px)`);
          return;
        }
        if (maxHeight && dims.height > maxHeight) {
          toast.error(`Image height must be at most ${maxHeight}px (got ${dims.height}px)`);
          return;
        }
      }
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

  const acceptAttr = allowedTypes && allowedTypes.length > 0 ? allowedTypes.join(",") : "image/*";

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
      {helperText && (
        <p className="text-[10px] text-muted-foreground leading-tight">{helperText}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

export default ImageUploadField;
