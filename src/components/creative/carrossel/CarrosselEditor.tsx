import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";
import type { CarrosselData } from "@/pages/dashboard/creative/CarrosselPage";

interface Props {
  data: CarrosselData;
  onChange: (data: CarrosselData) => void;
  onApprove: () => void;
  onDiscard: () => void;
}

const CarrosselEditor = ({ data, onChange, onApprove, onDiscard }: Props) => {
  const updateSlide = (index: number, field: string, value: string) => {
    const updated = { ...data, slides: data.slides.map((s, i) => i === index ? { ...s, [field]: value } : s) };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Editar Carrossel</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onDiscard}>
            <X className="h-4 w-4 mr-1" /> Descartar
          </Button>
          <Button size="sm" onClick={onApprove}>
            <Check className="h-4 w-4 mr-1" /> Aprovar e Salvar
          </Button>
        </div>
      </div>

      <div>
        <Label>Título da Série</Label>
        <Input value={data.titulo_serie} onChange={(e) => onChange({ ...data, titulo_serie: e.target.value })} className="mt-1" />
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {data.slides.map((slide, i) => (
          <Card key={i} className="border-muted">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-bold text-muted-foreground">Slide {slide.numero}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Tag</Label>
                  <Input value={slide.tag} onChange={(e) => updateSlide(i, "tag", e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">CTA</Label>
                  <Input value={slide.cta} onChange={(e) => updateSlide(i, "cta", e.target.value)} placeholder="Somente último slide" className="h-8 text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Título</Label>
                <Input value={slide.titulo} onChange={(e) => updateSlide(i, "titulo", e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Corpo</Label>
                <Textarea value={slide.corpo} onChange={(e) => updateSlide(i, "corpo", e.target.value)} className="text-sm min-h-[60px]" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CarrosselEditor;
