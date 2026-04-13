import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";
import type { Slide } from "@/pages/dashboard/creative/CarrosselPage";
import { type BackgroundConfig, getBackgroundStyle, shouldShowImage, getSlideImageUrl, getSlideImageOpacity, getTextPalette } from "./CarrosselBackgroundEditor";

interface Props {
  slides: Slide[];
  activeSlide: number;
  onSlideChange: (index: number) => void;
  tituloSerie: string;
  background?: BackgroundConfig;
  slideRef?: React.RefObject<HTMLDivElement>;
}

const defaultBg: BackgroundConfig = { type: "solid", color: "#1a1a2e", applyTo: "all" };

const CarrosselPreview = ({ slides, activeSlide, onSlideChange, tituloSerie, background, slideRef }: Props) => {
  const slide = slides[activeSlide];
  const total = slides.length;
  const bg = background || defaultBg;

  const copySlide = (s: Slide) => {
    const text = `${s.tag}\n\n${s.titulo}\n\n${s.corpo}${s.cta ? `\n\n${s.cta}` : ""}`;
    navigator.clipboard.writeText(text);
    toast.success("Slide copiado!");
  };

  const copyAll = () => {
    const text = slides
      .map((s) => `--- Slide ${s.numero} ---\n${s.tag}\n${s.titulo}\n${s.corpo}${s.cta ? `\n${s.cta}` : ""}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Todos os slides copiados!");
  };

  const showImage = shouldShowImage(bg, activeSlide);
  const slideImageUrl = getSlideImageUrl(bg, activeSlide);
  const slideImageOpacity = getSlideImageOpacity(bg, activeSlide);
  const palette = getTextPalette(bg.textPalette);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">{tituloSerie}</h3>

      <div className="relative aspect-[4/5] rounded-lg overflow-hidden max-w-md mx-auto" ref={slideRef} style={getBackgroundStyle(bg, activeSlide)}>
        {showImage && slideImageUrl && (
          <img src={slideImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover min-w-full min-h-full" style={{ opacity: slideImageOpacity, objectPosition: "center" }} />
        )}
        <div className="relative z-10 flex flex-col justify-between p-8 h-full">
          <div className="flex justify-between items-start">
            <div />
            <Badge variant="secondary" className="border-0 text-xs" style={{ backgroundColor: palette.badgeBg, color: palette.badge }}>
              {activeSlide + 1} / {total}
            </Badge>
          </div>
          <div className="flex-1 flex flex-col justify-center space-y-4">
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: palette.tag }}>{slide.tag}</p>
            <h2 className="text-xl md:text-2xl font-bold leading-tight" style={{ color: palette.titulo }}>{slide.titulo}</h2>
            <p className="text-sm leading-relaxed" style={{ color: palette.corpo }}>{slide.corpo}</p>
          </div>
          {slide.cta && (
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: palette.cta }}>{slide.cta}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="sm" onClick={() => onSlideChange(Math.max(0, activeSlide - 1))} disabled={activeSlide === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <span className="text-sm text-muted-foreground">{activeSlide + 1} / {total}</span>
        <Button variant="outline" size="sm" onClick={() => onSlideChange(Math.min(total - 1, activeSlide + 1))} disabled={activeSlide === total - 1}>
          Próximo <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="flex justify-center gap-1.5">
        {slides.map((_, i) => (
          <button key={i} onClick={() => onSlideChange(i)} className={`w-2 h-2 rounded-full transition-colors ${i === activeSlide ? "bg-primary" : "bg-muted-foreground/30"}`} />
        ))}
      </div>

      <div className="flex gap-2 justify-center">
        <Button variant="outline" size="sm" onClick={() => copySlide(slide)}>
          <Copy className="h-4 w-4 mr-1" /> Copiar slide atual
        </Button>
        <Button variant="outline" size="sm" onClick={copyAll}>
          <Copy className="h-4 w-4 mr-1" /> Copiar todos os slides
        </Button>
      </div>
    </div>
  );
};

export default CarrosselPreview;
