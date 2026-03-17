import { useState, useRef } from "react";
import { Bug, X, Upload, ImageIcon, Loader2, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BugReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BugReportDialog({ open, onOpenChange }: BugReportDialogProps) {
  const { user } = useAuth();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const limited = [...screenshots, ...files].slice(0, 3);
    setScreenshots(limited);
    const newPreviews = limited.map((f) => URL.createObjectURL(f));
    setPreviews(newPreviews);
  };

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadScreenshots = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of screenshots) {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("bug-screenshots")
        .upload(path, file, { contentType: file.type });
      if (!error) {
        const { data } = supabase.storage.from("bug-screenshots").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in title and description.");
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      const screenshotUrls = await uploadScreenshots();

      const { error } = await (supabase as any).from("bug_reports").insert({
        reporter_id: user.id,
        reporter_email: user.email ?? "",
        title: title.trim(),
        description: description.trim(),
        screenshot_urls: screenshotUrls,
        route: location.pathname,
        status: "open",
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setTitle("");
        setDescription("");
        setScreenshots([]);
        setPreviews([]);
        onOpenChange(false);
      }, 2000);
    } catch {
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-medium tracking-wide uppercase">
            <Bug size={15} className="text-muted-foreground" />
            Report a Bug
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <CheckCircle2 size={36} className="text-primary" />
            <p className="text-sm text-foreground font-medium">Report submitted. Thank you!</p>
            <p className="text-xs text-muted-foreground">We'll look into this as soon as possible.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Route pill */}
            <p className="text-[10px] tracking-widest uppercase text-muted-foreground/60 font-light">
              Page: <span className="text-muted-foreground">{location.pathname}</span>
            </p>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs uppercase tracking-widest font-light">Title</Label>
              <Input
                placeholder="Short summary of the bug"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs uppercase tracking-widest font-light">Description</Label>
              <Textarea
                placeholder="Describe what happened and what you expected to happen..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[110px] resize-none"
                maxLength={2000}
              />
            </div>

            {/* Screenshots */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs uppercase tracking-widest font-light">
                Screenshots <span className="text-muted-foreground/50 normal-case tracking-normal">(up to 3)</span>
              </Label>

              {previews.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {previews.map((src, i) => (
                    <div key={i} className="relative group w-24 h-16 rounded border border-border overflow-hidden">
                      <img src={src} alt={`screenshot ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeScreenshot(i)}
                        className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {screenshots.length < 3 && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "flex items-center gap-2 w-full border border-dashed border-border rounded-md py-3 px-4",
                      "text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors duration-200"
                    )}
                  >
                    <Upload size={13} />
                    <span>Upload screenshots</span>
                    <ImageIcon size={12} className="ml-auto opacity-40" />
                  </button>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting || !title.trim() || !description.trim()}>
                {submitting ? <Loader2 size={13} className="animate-spin" /> : "Submit Report"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
