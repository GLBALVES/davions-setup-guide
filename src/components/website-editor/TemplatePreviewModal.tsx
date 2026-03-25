import { ExternalLink, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
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
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Content */}
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 flex flex-col border border-border bg-background shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 overflow-hidden"
          style={{ width: "95vw", maxWidth: "95vw", height: "90vh" }}
        >
          {/* Hidden title for a11y */}
          <DialogPrimitive.Title className="sr-only">
            {templateLabel} Preview
          </DialogPrimitive.Title>

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

              <DialogPrimitive.Close asChild>
                <button className="ml-1 p-1 rounded-sm text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* iframe — fills remaining height */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <iframe
              src={previewUrl}
              className="w-full h-full border-none block"
              title={`Preview of ${templateLabel} template`}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
