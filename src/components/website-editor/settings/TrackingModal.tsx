import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function TrackingModal({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: {
    google_analytics_id?: string | null;
    facebook_pixel_id?: string | null;
    custom_head_html?: string | null;
  };
  onSave: (patch: Record<string, any>) => Promise<void> | void;
}) {
  const [ga, setGa] = useState("");
  const [fb, setFb] = useState("");
  const [head, setHead] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setGa(initial.google_analytics_id ?? "");
      setFb(initial.facebook_pixel_id ?? "");
      setHead(initial.custom_head_html ?? "");
    }
  }, [open, initial]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        google_analytics_id: ga.trim() || null,
        facebook_pixel_id: fb.trim() || null,
        custom_head_html: head.trim() || null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tracking & Analytics</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Google Analytics ID</Label>
            <Input
              value={ga}
              onChange={(e) => setGa(e.target.value)}
              placeholder="G-XXXXXXXXXX"
              className="h-9 text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Find your Measurement ID in Google Analytics → Admin → Data Streams.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Meta Pixel ID</Label>
            <Input
              value={fb}
              onChange={(e) => setFb(e.target.value)}
              placeholder="1234567890123456"
              className="h-9 text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Found in Meta Business → Events Manager → Data Sources.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Custom HTML in &lt;head&gt;</Label>
            <Textarea
              value={head}
              onChange={(e) => setHead(e.target.value)}
              placeholder='<script>...</script>'
              className="min-h-[120px] font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Inject custom scripts (Hotjar, Clarity, etc.). Loaded on all public pages.
            </p>
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
