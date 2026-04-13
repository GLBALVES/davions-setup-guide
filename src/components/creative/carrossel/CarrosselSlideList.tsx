import { Card } from "@/components/ui/card";
import type { Slide } from "@/pages/dashboard/creative/CarrosselPage";

interface Props {
  slides: Slide[];
  activeSlide: number;
  onSlideSelect: (index: number) => void;
}

const CarrosselSlideList = ({ slides, activeSlide, onSlideSelect }: Props) => {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground">Slides</h3>
      {slides.map((slide, i) => (
        <Card
          key={i}
          className={`p-3 cursor-pointer transition-all hover:shadow-md ${
            i === activeSlide ? "border-primary border-2 shadow-md" : "border-border"
          }`}
          onClick={() => onSlideSelect(i)}
        >
          <div className="flex items-start gap-3">
            <span className="text-xs font-bold bg-muted text-muted-foreground rounded-full w-6 h-6 flex items-center justify-center shrink-0">
              {slide.numero}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-sm text-foreground truncate">{slide.titulo}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{slide.tag}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default CarrosselSlideList;
