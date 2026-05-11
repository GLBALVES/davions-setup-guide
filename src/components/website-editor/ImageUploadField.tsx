import { useRef, useState } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import GalleryImagePicker from "./GalleryImagePicker";

interface ImageUploadFieldProps {
  value?: string;
  onChange: (url: string) => void;
  photographerId?: string | null;
  /** Folder inside the bucket (default: "blocks") */
  folder?: string;
  className?: string;
  /** Aspect ratio class for the preview area */
  aspectClass?: string;
  /** Allowed MIME types, e.g. ["image/png","image/svg+xml","image/x-icon"] */
  allowedTypes?: string[];
  /** Friendly label for allowed formats shown in error toasts (e.g. "PNG, SVG, ICO") */
  allowedTypesLabel?: string;
  /** Max file size in MB (default 50) */
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
  /**
   * When provided, the file picker / gallery picker allow multi-selection.
   * The first selected URL is delivered via `onChange`; remaining URLs are
   * delivered via `onAddMore` so the caller can append additional items.
   */
  onAddMore?: (extraUrls: string[]) => void;
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
  maxSizeMB = 50,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  requireSquare,
  helperText,
  onAddMore,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Determine whether the picker can be used (needs allowing arbitrary images,
  // i.e. no strict format/size validation that wouldn't apply to gallery photos)
  const allowGalleryPicker = !allowedTypes && !requireSquare && !minWidth && !minHeight && !maxWidth && !maxHeight;

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

  const validateFile = async (file: File): Promise<string | null> => {
    if (allowedTypes && allowedTypes.length > 0) {
      if (!allowedTypes.includes(file.type)) {
        return `Invalid format. Allowed: ${allowedTypesLabel || allowedTypes.join(", ")}`;
      }
    } else if (!file.type.startsWith("image/")) {
      return "Please select an image file";
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `Image must be smaller than ${maxSizeMB}MB`;
    }
    if (minWidth || minHeight || maxWidth || maxHeight || requireSquare) {
      const dims = await readImageSize(file);
      if (dims) {
        if (requireSquare && dims.width !== dims.height) return `Image must be square (got ${dims.width}×${dims.height}px)`;
        if (minWidth && dims.width < minWidth) return `Image width must be at least ${minWidth}px`;
        if (minHeight && dims.height < minHeight) return `Image height must be at least ${minHeight}px`;
        if (maxWidth && dims.width > maxWidth) return `Image width must be at most ${maxWidth}px`;
        if (maxHeight && dims.height > maxHeight) return `Image height must be at most ${maxHeight}px`;
      }
    }
    return null;
  };

  const uploadFile = async (file: File): Promise<string> => {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${photographerId}/${folder}/${crypto.randomUUID()}.${safeExt}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!photographerId) {
      toast.error("Not signed in");
      return;
    }
    const allowMulti = !!onAddMore;
    const list = allowMulti ? Array.from(files) : [files[0]];

    setUploading(true);
    try {
      const urls: string[] = [];
      let failed = 0;
      for (const file of list) {
        const err = await validateFile(file);
        if (err) {
          toast.error(err);
          failed++;
          continue;
        }
        try {
          urls.push(await uploadFile(file));
        } catch (e: any) {
          console.error("Upload failed", e);
          failed++;
        }
      }
      if (urls.length > 0) {
        onChange(urls[0]);
        if (urls.length > 1 && onAddMore) onAddMore(urls.slice(1));
        toast.success(urls.length > 1 ? `${urls.length} images uploaded` : "Image uploaded");
      }
      if (failed > 0) toast.error(`${failed} image${failed > 1 ? "s" : ""} failed`);
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
          <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1.5">
            <button
              type="button"
              onClick={() => allowGalleryPicker ? setPickerOpen(true) : inputRef.current?.click()}
              disabled={uploading}
              title="Replace"
              aria-label="Replace"
              className="w-full max-w-[7rem] px-2 py-1 rounded text-[10px] leading-none bg-background text-foreground hover:bg-background/90 transition-colors inline-flex items-center justify-center gap-1 shadow-sm"
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin shrink-0" /> : <Upload className="h-3 w-3 shrink-0" />}
              <span className="truncate">Replace</span>
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              title="Remove"
              aria-label="Remove"
              className="w-full max-w-[7rem] px-2 py-1 rounded text-[10px] leading-none bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors inline-flex items-center justify-center gap-1 shadow-sm"
            >
              <X className="h-3 w-3 shrink-0" />
              <span className="truncate">Remove</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => allowGalleryPicker ? setPickerOpen(true) : inputRef.current?.click()}
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
      {allowGalleryPicker && (
        <GalleryImagePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          photographerId={photographerId}
          onSelect={(url) => onChange(url)}
          uploadFolder={folder}
        />
      )}
    </div>
  );
}

export default ImageUploadField;
