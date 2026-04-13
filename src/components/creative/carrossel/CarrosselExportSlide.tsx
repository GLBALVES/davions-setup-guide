import { forwardRef } from "react";
import type { Slide } from "@/pages/dashboard/creative/CarrosselPage";
import {
  type BackgroundConfig,
  getBackgroundStyle,
  shouldShowImage,
  getSlideImageUrl,
  getSlideImageOpacity,
  getTextPalette,
} from "./CarrosselBackgroundEditor";

interface Props {
  slide: Slide;
  slideIndex: number;
  totalSlides: number;
  tituloSerie: string;
  background: BackgroundConfig;
  layoutModel: "model1" | "model2" | "model3";
}

const EXPORT_W = 1080;
const EXPORT_H = 1350;
const BORDER_RADIUS = 24;

const CarrosselExportSlide = forwardRef<HTMLDivElement, Props>(
  ({ slide, slideIndex, totalSlides, background, layoutModel }, ref) => {
    const bg = background;
    const palette = getTextPalette(bg.textPalette);
    const showImage = shouldShowImage(bg, slideIndex);
    const slideImageUrl = getSlideImageUrl(bg, slideIndex);
    const slideImageOpacity = getSlideImageOpacity(bg, slideIndex);

    const containerStyle: React.CSSProperties = {
      position: "fixed",
      left: 0,
      top: 0,
      width: EXPORT_W,
      height: EXPORT_H,
      borderRadius: BORDER_RADIUS,
      overflow: "hidden",
      zIndex: -1,
      pointerEvents: "none",
      opacity: 0,
    };

    if (layoutModel === "model1") {
      return (
        <div ref={ref} style={{ ...containerStyle, ...getBackgroundStyle(bg, slideIndex) }}>
          {showImage && slideImageUrl && (
            <img src={slideImageUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", opacity: slideImageOpacity }} />
          )}
          <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, height: "100%", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <span style={{ backgroundColor: palette.badgeBg, color: palette.badge, fontSize: 14, padding: "4px 12px", borderRadius: 9999, fontWeight: 500 }}>
                {slideIndex + 1} / {totalSlides}
              </span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
              <p style={{ color: palette.tag, fontSize: 14, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{slide.tag}</p>
              <h2 style={{ color: palette.titulo, fontSize: 36, fontWeight: 700, lineHeight: 1.2 }}>{slide.titulo}</h2>
              <p style={{ color: palette.corpo, fontSize: 20, lineHeight: 1.6 }}>{slide.corpo}</p>
            </div>
            {slide.cta && (
              <div style={{ textAlign: "center" }}>
                <p style={{ color: palette.cta, fontSize: 18, fontWeight: 600 }}>{slide.cta}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (layoutModel === "model2") {
      return (
        <div ref={ref} style={containerStyle}>
          <div style={{ ...getBackgroundStyle(bg, slideIndex), height: EXPORT_H * 0.55, display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: 48, paddingBottom: 24, boxSizing: "border-box", borderTopLeftRadius: BORDER_RADIUS, borderTopRightRadius: BORDER_RADIUS, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
              <span style={{ backgroundColor: palette.badgeBg, color: palette.badge, fontSize: 14, padding: "4px 12px", borderRadius: 9999, fontWeight: 500 }}>{slideIndex + 1} / {totalSlides}</span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
              <p style={{ color: palette.tag, fontSize: 14, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{slide.tag}</p>
              <h2 style={{ color: palette.titulo, fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>{slide.titulo}</h2>
              <p style={{ color: palette.corpo, fontSize: 18, lineHeight: 1.6 }}>{slide.corpo}</p>
            </div>
            {slide.cta && <p style={{ color: palette.cta, fontSize: 16, fontWeight: 600, marginTop: 12 }}>{slide.cta}</p>}
          </div>
          <div style={{ height: EXPORT_H * 0.45, backgroundColor: "#e5e7eb", borderBottomLeftRadius: BORDER_RADIUS, borderBottomRightRadius: BORDER_RADIUS, overflow: "hidden" }}>
            {slideImageUrl ? (
              <img src={slideImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 18 }}>📷</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} style={containerStyle}>
        <div style={{ height: EXPORT_H * 0.45, backgroundColor: "#e5e7eb", borderTopLeftRadius: BORDER_RADIUS, borderTopRightRadius: BORDER_RADIUS, overflow: "hidden" }}>
          {slideImageUrl ? (
            <img src={slideImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 18 }}>📷</div>
          )}
        </div>
        <div style={{ ...getBackgroundStyle(bg, slideIndex), height: EXPORT_H * 0.55, display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: 48, paddingTop: 32, boxSizing: "border-box", borderBottomLeftRadius: BORDER_RADIUS, borderBottomRightRadius: BORDER_RADIUS, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
            <span style={{ backgroundColor: palette.badgeBg, color: palette.badge, fontSize: 14, padding: "4px 12px", borderRadius: 9999, fontWeight: 500 }}>{slideIndex + 1} / {totalSlides}</span>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
            <p style={{ color: palette.tag, fontSize: 14, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{slide.tag}</p>
            <h2 style={{ color: palette.titulo, fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>{slide.titulo}</h2>
            <p style={{ color: palette.corpo, fontSize: 18, lineHeight: 1.6 }}>{slide.corpo}</p>
          </div>
          {slide.cta && <p style={{ color: palette.cta, fontSize: 16, fontWeight: 600, marginTop: 12 }}>{slide.cta}</p>}
        </div>
      </div>
    );
  }
);

CarrosselExportSlide.displayName = "CarrosselExportSlide";

export default CarrosselExportSlide;
