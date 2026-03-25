import { X, ExternalLink } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TemplatePreviewModalProps {
  open: boolean;
  onClose: () => void;
  templateId: string;
  templateLabel: string;
  storeSlug: string;
  onApply: (templateId: string) => void;
  isCurrentTemplate: boolean;
}

export function TemplatePreviewModal({
  open,
  onClose,
  templateId,
  templateLabel,
  storeSlug,
  onApply,
  isCurrentTemplate,
}: TemplatePreviewModalProps) {
  const previewUrl = `/store/${storeSlug}?preview=${templateId}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="p-0 gap-0 border-border overflow-hidden"
        style={{ maxWidth: "95vw", width: "95vw", height: "90vh", maxHeight: "90vh" }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-background shrink-0">
          <div className="flex items-center gap-3">
            <p className="text-[11px] tracking-[0.2em] uppercase font-light text-foreground">
              {templateLabel}
            </p>
            <span className="text-[10px] text-muted-foreground font-light">Preview</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] tracking-wider uppercase font-light px-3 gap-1.5"
              onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="h-3 w-3" />
              Open Full
            </Button>

            {!isCurrentTemplate && (
              <Button
                size="sm"
                className="h-7 text-[10px] tracking-wider uppercase font-light px-3"
                onClick={() => { onApply(templateId); onClose(); }}
              >
                Apply Template
              </Button>
            )}

            <button
              onClick={onClose}
              className="ml-1 p-1 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* iframe */}
        <div className="flex-1 overflow-hidden" style={{ height: "calc(90vh - 44px)" }}>
          <iframe
            src={previewUrl}
            className="w-full h-full border-none"
            title={`Preview of ${templateLabel} template`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
