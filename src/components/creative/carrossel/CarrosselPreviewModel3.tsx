import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";
import type { Slide } from "@/pages/dashboard/creative/CarrosselPage";
import { type BackgroundConfig, getBackgroundStyle, getSlideImageUrl, getTextPalette } from "./CarrosselBackgroundEditor";

interface Props {
  slides: Slide[];
  activeSlide: number;
  onSlideChange: (index: number) => void;
  tituloSerie: string;
  background?: BackgroundConfig;
  slideRef?: React.RefObject<HTMLDivElement>;
}

const defaultBg: BackgroundConfig = { type: "solid", color: "#1a1a2e", applyTo: "all" };

const CarrosselPreviewModel3 = ({ slides, activeSlide, onSlideChange, tituloSerie, background, slideRef }: Props) => {
  const slide = slides[activeSlide];
  const total = slides.length;
  const bg = background || defaultBg;
  const palette = getTextPalette(bg.textPalette);
  const slideImageUrl = getSlideImageUrl(bg, activeSlide);

  const copySlide = (s: Slide) => {
    const text = `${s.tag}\n\n${s.titulo}\n\n${s.corpo}${s.cta ? `\n\n${s.cta}` : ""}`;
    navigator.clipboard.writeText(text);
    toast.success("Slide copiado!");
  };

  const copyAll = () => {
    const text = slides.map((s) => `--- Slide ${s.numero} ---\n${s.tag}\n${s.titulo}\n${s.corpo}${s.cta ? `\n${s.cta}` : ""}`).join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Todos os slides copiados!");
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">{tituloSerie}</h3>

      <div ref={slideRef} className="relative aspect-[4/5] rounded-lg overflow-hidden max-w-md mx-auto flex flex-col">
        <div className="relative bg-muted overflow-hidden min-h-0" style={{ flex: "0 0 45%" }}>
          {slideImageUrl ? (
            <img src={slideImageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <span className="text-2xl text-muted-foreground/40">📷</span>
                </div>
                <p className="text-xs">Adicione uma imagem</p>
              </div>
            </div>
          )}
        </div>
        <div className="relative flex flex-col justify-start p-6 pt-4 overflow-hidden min-h-0" style={{ ...getBackgroundStyle(bg, activeSlide), flex: "0 0 55%" }}>
          <div className="flex justify-end mb-3">
            <Badge variant="secondary" className="border-0 text-xs" style={{ backgroundColor: palette.badgeBg, color: palette.badge }}>
              {activeSlide + 1} / {total}
            </Badge>
          </div>
          <div className="flex-1 flex flex-col justify-center space-y-3">
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: palette.tag }}>{slide.tag}</p>
            <h2 className="text-lg md:text-xl font-bold leading-tight" style={{ color: palette.titulo }}>{slide.titulo}</h2>
            <p className="text-sm leading-relaxed line-clamp-4" style={{ color: palette.corpo }}>{slide.corpo}</p>
          </div>
          {slide.cta && <div className="mt-2"><p className="text-sm font-semibold" style={{ color: palette.cta }}>{slide.cta}</p></div>}
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

export default CarrosselPreviewModel3;
