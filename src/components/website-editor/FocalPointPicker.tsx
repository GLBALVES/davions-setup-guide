import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface FocalPointPickerProps {
  imageUrl: string;
  focalX?: number; // 0-100
  focalY?: number; // 0-100
  onChange: (x: number, y: number) => void;
  onReset?: () => void;
}

/**
 * Click-to-set focal point picker for background images.
 * Renders a small preview of the image with a crosshair marker.
 */
export function FocalPointPicker({
  imageUrl,
  focalX,
  focalY,
  onChange,
  onReset,
}: FocalPointPickerProps) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);

  const fx = typeof focalX === "number" ? focalX : 50;
  const fy = typeof focalY === "number" ? focalY : 50;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    onChange(Math.round(x), Math.round(y));
  };

  if (!imageUrl) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          {(t as any).focalPoint || "Focal point"}
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => onReset?.()}
        >
          {(t as any).reset || "Reset"}
        </Button>
      </div>
      <div
        ref={ref}
        onClick={handleClick}
        className="relative w-full overflow-hidden rounded-md border border-border cursor-crosshair bg-muted"
        style={{ aspectRatio: "16 / 9" }}
      >
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
        <div
          className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow-md pointer-events-none"
          style={{
            left: `${fx}%`,
            top: `${fy}%`,
            backgroundColor: "hsl(var(--primary))",
          }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        {(t as any).focalPointHint || "Click on the image to set the focal point"}
      </p>
    </div>
  );
}
