import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TemplatePreviewCard } from "@/components/dashboard/TemplatePreviewCard";
import { TemplatePreviewModal } from "@/components/website-editor/TemplatePreviewModal";

// Canonical template list — must match /dashboard/website (WebsiteSettings.tsx).
export const TEMPLATES = [
  { value: "editorial", label: "Rosa", description: "Full-bleed hero, minimal typography, luxury feel." },
  { value: "grid", label: "Lírio", description: "Photo-first grid layout with sidebar details." },
  { value: "magazine", label: "Orquídea", description: "Bold columns, mixed-size cards, editorial headlines." },
  { value: "clean", label: "Jasmim", description: "Centered, whitespace-heavy, distraction-free." },
  { value: "sierra", label: "Lavanda", description: "Full-screen hero, large serif typography, dark editorial tone." },
  { value: "canvas", label: "Dália", description: "Elegant serif italic hero, poetic and intimate feel." },
  { value: "avery", label: "Camélia", description: "Fixed vertical sidebar with masonry portfolio grid." },
  { value: "seville", label: "Magnólia", description: "Contained hero, airy typography, luxurious and light." },
  { value: "milo", label: "Violeta", description: "Typography-focused hero, warm tone, asymmetric photos." },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTemplate: string;
  onApply: (templateId: string) => void;
  storeSlug?: string;
}

export default function SiteTemplatePickerModal({
  open,
  onOpenChange,
  currentTemplate,
  onApply,
  storeSlug = "",
}: Props) {
  const [pendingTemplate, setPendingTemplate] = useState<string>(currentTemplate);
  const [previewModalTemplate, setPreviewModalTemplate] = useState<string | null>(null);

  // Reset pending selection whenever the modal is opened.
  useEffect(() => {
    if (open) setPendingTemplate(currentTemplate);
  }, [open, currentTemplate]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
          {/* Sticky header */}
          <DialogHeader className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 flex-row items-center justify-between gap-4 space-y-0">
            <div className="flex flex-col gap-1 min-w-0">
              <DialogTitle className="text-base">Choose a template</DialogTitle>
              <DialogDescription className="text-xs">
                Pick a layout for your site. Preview before applying.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0 mr-8">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!pendingTemplate || pendingTemplate === currentTemplate}
                onClick={() => {
                  if (pendingTemplate) onApply(pendingTemplate);
                  onOpenChange(false);
                }}
              >
                Confirm
              </Button>
            </div>
          </DialogHeader>

          {/* Scrollable grid */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TEMPLATES.map((tmpl) => (
                <TemplatePreviewCard
                  key={tmpl.value}
                  value={tmpl.value}
                  label={tmpl.label}
                  description={tmpl.description}
                  selected={(pendingTemplate ?? currentTemplate) === tmpl.value}
                  onClick={() => setPendingTemplate(tmpl.value)}
                  onPreview={() => setPreviewModalTemplate(tmpl.value)}
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template preview modal */}
      {previewModalTemplate && (
        <TemplatePreviewModal
          open={!!previewModalTemplate}
          onClose={() => setPreviewModalTemplate(null)}
          templateId={previewModalTemplate}
          templateLabel={
            TEMPLATES.find((t) => t.value === previewModalTemplate)?.label ?? previewModalTemplate
          }
          storeSlug={storeSlug}
          onApply={(tid) => {
            onApply(tid);
            setPreviewModalTemplate(null);
            onOpenChange(false);
          }}
          isCurrentTemplate={currentTemplate === previewModalTemplate}
        />
      )}
    </>
  );
}
