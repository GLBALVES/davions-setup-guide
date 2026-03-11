import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Facebook, Instagram, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props { open: boolean; onOpenChange: (open: boolean) => void; canvasRef: React.RefObject<HTMLDivElement>; formato: string; slideIndex: number; }
interface PlatformConnection { platform: string; is_active: boolean; credentials: Record<string, string>; }
type PublishStatus = "idle" | "publishing" | "success" | "error";

export default function PublishSocialModal({ open, onOpenChange, canvasRef, formato, slideIndex }: Props) {
  const [platforms, setPlatforms] = useState<PlatformConnection[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [publishStatus, setPublishStatus] = useState<Record<string, PublishStatus>>({});
  const [publishing, setPublishing] = useState(false);

  useEffect(() => { if (open) { loadPlatforms(); setPublishStatus({}); } }, [open]);

  const loadPlatforms = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).from("social_api_connections").select("platform, is_active, credentials").eq("is_active", true);
      if (error) throw error;
      const active = (data as any[]) || [];
      setPlatforms(active);
      setSelectedPlatforms(active.map((p: any) => p.platform));
    } catch { setPlatforms([]); } finally { setLoading(false); }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) => prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]);
  };

  const getIcon = (platform: string) => {
    if (platform === "facebook") return <Facebook className="h-5 w-5 text-blue-600" />;
    if (platform === "instagram") return <Instagram className="h-5 w-5 text-pink-600" />;
    return null;
  };

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) { toast({ title: "Select at least one platform", variant: "destructive" }); return; }
    if (!canvasRef.current) { toast({ title: "Canvas not found", variant: "destructive" }); return; }
    setPublishing(true);
    const statusMap: Record<string, PublishStatus> = {};
    selectedPlatforms.forEach((p) => (statusMap[p] = "publishing"));
    setPublishStatus({ ...statusMap });
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(canvasRef.current, { scale: 2, useCORS: true, backgroundColor: "#000000", imageTimeout: 0, removeContainer: true });
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
      const fileName = `social-publish/${Date.now()}-${crypto.randomUUID()}.png`;
      const { error: uploadError } = await supabase.storage.from("creative-assets").upload(fileName, blob, { contentType: "image/png" });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("creative-assets").getPublicUrl(fileName);
      const imageUrl = urlData.publicUrl;
      for (const platform of selectedPlatforms) {
        try {
          setPublishStatus((prev) => ({ ...prev, [platform]: "publishing" }));
          const { data, error } = await supabase.functions.invoke("publish-social", { body: { action: "publish", platform, image_url: imageUrl, caption } });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          setPublishStatus((prev) => ({ ...prev, [platform]: "success" }));
        } catch (e: any) {
          setPublishStatus((prev) => ({ ...prev, [platform]: "error" }));
          toast({ title: `Error publishing to ${platform}`, description: e.message, variant: "destructive" });
        }
      }
    } catch (e: any) {
      toast({ title: "Publishing error", description: e.message, variant: "destructive" });
      selectedPlatforms.forEach((p) => { setPublishStatus((prev) => ({ ...prev, [p]: "error" })); });
    } finally { setPublishing(false); }
  };

  const getStatusIcon = (status: PublishStatus) => {
    if (status === "publishing") return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    if (status === "success") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (status === "error") return <XCircle className="h-4 w-4 text-destructive" />;
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-light tracking-wide">Publish to Social Media</DialogTitle>
          <DialogDescription className="text-xs">Slide {slideIndex + 1} — {formato}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : platforms.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            <p>No social media configured.</p>
            <p className="mt-1">Go to <strong>Settings → Social Media</strong> to connect your accounts.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Platforms</Label>
              {platforms.map((p) => (
                <div key={p.platform} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <Checkbox checked={selectedPlatforms.includes(p.platform)} onCheckedChange={() => togglePlatform(p.platform)} disabled={publishing} />
                  {getIcon(p.platform)}
                  <span className="flex-1 text-xs font-medium capitalize">{p.platform}</span>
                  {getStatusIcon(publishStatus[p.platform] || "idle")}
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Caption</Label>
              <Textarea placeholder="Write your post caption..." value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} disabled={publishing} className="text-xs" />
            </div>
            <Button onClick={handlePublish} disabled={publishing || selectedPlatforms.length === 0} className="w-full gap-2 text-xs">
              {publishing ? (<><Loader2 className="h-4 w-4 animate-spin" /> Publishing...</>) : "Publish"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
