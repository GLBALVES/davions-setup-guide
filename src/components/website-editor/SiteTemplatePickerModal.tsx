import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TemplatePreviewCard } from "@/components/dashboard/TemplatePreviewCard";

// Display labels for each visual site template (flower-themed, internal IDs preserved).
const TEMPLATES: { id: string; label: string; description: string }[] = [
  { id: "editorial", label: "Rosa", description: "Editorial • elegante e atemporal" },
  { id: "grid", label: "Lírio", description: "Grade limpa, foco em portfólio" },
  { id: "magazine", label: "Tulipa", description: "Estilo revista, hero amplo" },
  { id: "clean", label: "Margarida", description: "Minimalista, muito espaço em branco" },
  { id: "sierra", label: "Orquídea", description: "Cinematográfico e contemplativo" },
  { id: "canvas", label: "Camélia", description: "Tela editorial em camadas" },
  { id: "avery", label: "Jasmim", description: "Suave, neutro, focado no texto" },
  { id: "seville", label: "Hibisco", description: "Quente e acolhedor" },
  { id: "milo", label: "Açucena", description: "Suave, claro e arejado" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTemplate: string;
  onApply: (templateId: string) => void;
}

export default function SiteTemplatePickerModal({ open, onOpenChange, currentTemplate, onApply }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">Escolha o template do site</DialogTitle>
          <DialogDescription className="text-xs">
            Aplica imediatamente ao site publicado. Suas páginas e conteúdo permanecem inalterados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 -mr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-2">
            {TEMPLATES.map((tpl) => (
              <TemplatePreviewCard
                key={tpl.id}
                value={tpl.id}
                label={tpl.label}
                description={tpl.description}
                selected={tpl.id === currentTemplate}
                onClick={() => {
                  onApply(tpl.id);
                  onOpenChange(false);
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
