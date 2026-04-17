import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import ImageUploadField from "@/components/website-editor/ImageUploadField";

type Redirect = { from: string; to: string };

export default function AdvancedModal({
  open,
  onOpenChange,
  photographerId,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  photographerId: string | null;
  initial: {
    custom_css?: string | null;
    custom_body_html?: string | null;
    favicon_url?: string | null;
    redirects?: Redirect[] | null;
  };
  onSave: (patch: Record<string, any>) => Promise<void> | void;
}) {
  const [css, setCss] = useState("");
  const [body, setBody] = useState("");
  const [favicon, setFavicon] = useState<string | null>(null);
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCss(initial.custom_css ?? "");
      setBody(initial.custom_body_html ?? "");
      setFavicon(initial.favicon_url ?? null);
      setRedirects(Array.isArray(initial.redirects) ? initial.redirects : []);
    }
  }, [open, initial]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        custom_css: css.trim() || null,
        custom_body_html: body.trim() || null,
        favicon_url: favicon || null,
        redirects: redirects.filter((r) => r.from.trim() && r.to.trim()),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advanced</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Favicon</Label>
            <ImageUploadField
              value={favicon ?? ""}
              onChange={(url) => setFavicon(url || null)}
              photographerId={photographerId}
              folder="favicon"
              aspectClass="aspect-square w-24"
            />
            <p className="text-[11px] text-muted-foreground">
              Square image, 32×32 or 64×64 recommended.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Custom CSS</Label>
            <Textarea
              value={css}
              onChange={(e) => setCss(e.target.value)}
              placeholder="/* Override styles */"
              className="min-h-[140px] font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Custom HTML before &lt;/body&gt;</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="<!-- chat widget, footer scripts -->"
              className="min-h-[100px] font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Redirects</Label>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setRedirects([...redirects, { from: "", to: "" }])}
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            {redirects.length === 0 ? (
              <p className="text-[11px] text-muted-foreground py-2">No redirects yet.</p>
            ) : (
              <div className="space-y-2">
                {redirects.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={r.from}
                      onChange={(e) => {
                        const next = [...redirects];
                        next[i] = { ...next[i], from: e.target.value };
                        setRedirects(next);
                      }}
                      placeholder="/old-path"
                      className="h-8 text-xs flex-1"
                    />
                    <span className="text-muted-foreground text-xs">→</span>
                    <Input
                      value={r.to}
                      onChange={(e) => {
                        const next = [...redirects];
                        next[i] = { ...next[i], to: e.target.value };
                        setRedirects(next);
                      }}
                      placeholder="/new-path"
                      className="h-8 text-xs flex-1"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setRedirects(redirects.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
