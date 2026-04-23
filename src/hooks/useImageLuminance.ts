import { useEffect, useState } from "react";

/**
 * Detects average luminance of an image (0–1, where 0 = black, 1 = white).
 * Ignores transparent pixels. Returns null while loading or on failure.
 *
 * Uses a small downsampled canvas for performance.
 */
export function useImageLuminance(imageUrl: string | null | undefined): number | null {
  const [luminance, setLuminance] = useState<number | null>(null);

  useEffect(() => {
    setLuminance(null);
    if (!imageUrl) return;

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (cancelled) return;
      try {
        const targetSize = 32;
        const ratio = img.width / img.height || 1;
        const w = ratio >= 1 ? targetSize : Math.max(1, Math.round(targetSize * ratio));
        const h = ratio >= 1 ? Math.max(1, Math.round(targetSize / ratio)) : targetSize;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);

        let sum = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 32) continue; // skip transparent / nearly transparent
          // Relative luminance (sRGB). Quick approx avoiding gamma for speed.
          const r = data[i] / 255;
          const g = data[i + 1] / 255;
          const b = data[i + 2] / 255;
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          sum += lum;
          count++;
        }
        if (!cancelled) {
          setLuminance(count > 0 ? sum / count : null);
        }
      } catch {
        if (!cancelled) setLuminance(null);
      }
    };
    img.onerror = () => {
      if (!cancelled) setLuminance(null);
    };
    img.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return luminance;
}
