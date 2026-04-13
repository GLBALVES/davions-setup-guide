import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBlogContext } from "@/contexts/BlogContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Sparkles, ImageIcon } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: "cover" | "middle";
  blogId: string;
  blogTitle: string;
  blogKeyword: string;
  onImageSaved: () => void;
};

export function ImageModal({
  open,
  onOpenChange,
  position,
  blogId,
  blogTitle,
  blogKeyword,
  onImageSaved,
}: Props) {
  const { config } = useBlogContext();

  const [imagePrompt, setImagePrompt] = useState(
    () => `${config.defaultImagePrompt}. Blog: "${blogTitle}", keyword: "${blogKeyword}"`
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [altText, setAltText] = useState(blogKeyword || blogTitle);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-image", {
        body: { blogTitle, keyword: blogKeyword, position, imagePrompt },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGeneratedPreview(data.imageBase64);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao gerar imagem.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setUploadedPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const saveImage = async (imageData: string | File) => {
    setIsSaving(true);
    try {
      const timestamp = Date.now();
      const ext = imageData instanceof File ? imageData.name.split(".").pop() || "png" : "png";
      const filePath = `${blogId}/${position}-${timestamp}.${ext}`;

      let uploadData: Blob;
      if (imageData instanceof File) {
        uploadData = imageData;
      } else {
        const base64 = imageData.split(",")[1] || imageData;
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        uploadData = new Blob([bytes], { type: "image/png" });
      }

      const { error: uploadError } = await supabase.storage
        .from("blog-module")
        .upload(filePath, uploadData, { contentType: "image/png", upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("blog-module")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      await supabase.from("ai_blog_images").insert({
        blog_id: blogId,
        position,
        image_url: publicUrl,
        alt_text: altText,
        prompt_used: imageData instanceof File ? null : imagePrompt,
        selected: true,
        photographer_id: config.photographerId ?? "",
      } as any);

      const updateFields =
        position === "cover"
          ? { cover_image_url: publicUrl, cover_image_alt: altText }
          : { middle_image_url: publicUrl, middle_image_alt: altText };

      await supabase
        .from("blogs")
        .update({ ...updateFields, updated_at: new Date().toISOString() })
        .eq("id", blogId);

      toast.success(`Imagem de ${position === "cover" ? "capa" : "meio"} salva!`);
      onImageSaved();
      onOpenChange(false);
      setGeneratedPreview(null);
      setUploadedFile(null);
      setUploadedPreview(null);
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao salvar imagem.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon size={18} />
            Imagem de {position === "cover" ? "capa" : "meio"}
          </DialogTitle>
        </DialogHeader>

        <div className="mb-3">
          <label className="text-xs text-muted-foreground">Alt text</label>
          <Input
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Texto alternativo da imagem"
            className="mt-1"
          />
        </div>

        <Tabs defaultValue="ai">
          <TabsList className="w-full">
            <TabsTrigger value="ai" className="flex-1 gap-1">
              <Sparkles size={14} /> Gerar com IA
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex-1 gap-1">
              <Upload size={14} /> Upload manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-3 mt-3">
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Descreva a imagem desejada..."
            />
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
              {isGenerating ? (
                <><Loader2 className="animate-spin" size={16} /> Gerando imagem...</>
              ) : (
                <><Sparkles size={16} /> Gerar imagem</>
              )}
            </Button>

            {generatedPreview && (
              <div className="space-y-2">
                <img
                  src={generatedPreview}
                  alt="Preview"
                  className="w-full rounded-md border border-border object-cover max-h-64"
                />
                <div className="flex gap-2">
                  <Button onClick={() => saveImage(generatedPreview)} disabled={isSaving} className="flex-1">
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : "Usar esta imagem"}
                  </Button>
                  <Button variant="outline" onClick={handleGenerate} disabled={isGenerating}>
                    Gerar outra
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-3 mt-3">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="mx-auto mb-2 text-muted-foreground" size={24} />
              <p className="text-sm text-muted-foreground">Arraste uma imagem ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP — máx 5MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>

            {uploadedPreview && (
              <div className="space-y-2">
                <img
                  src={uploadedPreview}
                  alt="Preview"
                  className="w-full rounded-md border border-border object-cover max-h-64"
                />
                <Button onClick={() => saveImage(uploadedFile!)} disabled={isSaving} className="w-full">
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : "Usar esta imagem"}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
