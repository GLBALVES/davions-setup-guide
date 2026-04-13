import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ImageIcon, Trash2, Upload, Image } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export interface SlideColorConfig {
  type: "solid" | "gradient";
  color: string;
  color2?: string;
  direction?: string;
}

export interface BackgroundConfig {
  type: "solid" | "gradient";
  color: string;
  color2?: string;
  direction?: string;
  applyTo: "first" | "all";
  perSlideColors?: Record<number, SlideColorConfig>;
  imageUrl?: string;
  imageOpacity?: number;
  imageApplyTo?: "first" | "all";
  perSlideImages?: Record<number, { imageUrl: string; imageOpacity: number }>;
  textPalette?: string;
}

export interface TextPaletteColors {
  tag: string;
  titulo: string;
  corpo: string;
  cta: string;
  badge: string;
  badgeBg: string;
}

export const TEXT_PALETTES: { id: string; name: string; colors: TextPaletteColors }[] = [
  {
    id: "classic-dark",
    name: "Clássico Escuro",
    colors: { tag: "#ffffffb3", titulo: "#ffffff", corpo: "#ffffffcc", cta: "#ffffffe6", badge: "#ffffff", badgeBg: "#ffffff33" },
  },
  {
    id: "classic-light",
    name: "Clássico Claro",
    colors: { tag: "#6b7280", titulo: "#1a1a2e", corpo: "#374151", cta: "#1a1a2e", badge: "#1a1a2e", badgeBg: "#0000001a" },
  },
  {
    id: "gold",
    name: "Dourado",
    colors: { tag: "#d4a574", titulo: "#d4a574", corpo: "#f5e6d3", cta: "#d4a574", badge: "#f5e6d3", badgeBg: "#d4a57433" },
  },
  {
    id: "neon",
    name: "Neon",
    colors: { tag: "#ff6b9d", titulo: "#00f0ff", corpo: "#ffffff", cta: "#00f0ff", badge: "#00f0ff", badgeBg: "#00f0ff33" },
  },
  {
    id: "nature",
    name: "Natureza",
    colors: { tag: "#6ee7b7", titulo: "#34d399", corpo: "#ffffff", cta: "#34d399", badge: "#34d399", badgeBg: "#34d39933" },
  },
];

export function getTextPalette(paletteId?: string): TextPaletteColors {
  const found = TEXT_PALETTES.find((p) => p.id === paletteId);
  return found?.colors ?? TEXT_PALETTES[0].colors;
}

interface Props {
  background: BackgroundConfig;
  onChange: (bg: BackgroundConfig) => void;
  activeSlide: number;
}

interface LibraryImage {
  id: string;
  file_url: string;
  name: string;
  is_favorite: boolean;
  photographer_id: string;
  created_at: string;
}

const PRESET_COLORS = [
  "#1a1a2e", "#0f172a", "#1e3a5f", "#2d1b69",
  "#1a4731", "#4a1942", "#0d0d0d", "#991b1b",
  "#78350f", "#1e40af", "#047857", "#7c3aed",
];

const GRADIENT_PRESETS = [
  { color: "#1a1a2e", color2: "#4a1942", direction: "135deg" },
  { color: "#0f172a", color2: "#1e3a5f", direction: "135deg" },
  { color: "#1a4731", color2: "#047857", direction: "180deg" },
  { color: "#2d1b69", color2: "#7c3aed", direction: "135deg" },
  { color: "#991b1b", color2: "#78350f", direction: "135deg" },
  { color: "#0d0d0d", color2: "#1e40af", direction: "180deg" },
];

const DIRECTIONS = [
  { label: "↘", value: "135deg" },
  { label: "→", value: "90deg" },
  { label: "↓", value: "180deg" },
  { label: "↗", value: "45deg" },
];

export function getBackgroundStyle(bg: BackgroundConfig, slideIndex: number): React.CSSProperties {
  const perSlide = bg.perSlideColors?.[slideIndex];
  if (perSlide) {
    if (perSlide.type === "gradient" && perSlide.color2) {
      return { background: `linear-gradient(${perSlide.direction || "135deg"}, ${perSlide.color}, ${perSlide.color2})` };
    }
    return { backgroundColor: perSlide.color };
  }

  const shouldApply = bg.applyTo === "all" || slideIndex === 0;
  if (!shouldApply) {
    return { backgroundColor: "#1a1a2e" };
  }
  if (bg.type === "gradient" && bg.color2) {
    return { background: `linear-gradient(${bg.direction || "135deg"}, ${bg.color}, ${bg.color2})` };
  }
  return { backgroundColor: bg.color };
}

export function shouldShowImage(bg: BackgroundConfig, slideIndex: number): boolean {
  if (bg.perSlideImages?.[slideIndex]) return true;
  if (!bg.imageUrl) return false;
  return bg.imageApplyTo === "all" || slideIndex === 0;
}

export function getSlideImageUrl(bg: BackgroundConfig, slideIndex: number): string | undefined {
  const perSlide = bg.perSlideImages?.[slideIndex];
  if (perSlide) return perSlide.imageUrl;
  if (!bg.imageUrl) return undefined;
  if (bg.imageApplyTo === "all" || slideIndex === 0) return bg.imageUrl;
  return undefined;
}

export function getSlideImageOpacity(bg: BackgroundConfig, slideIndex: number): number {
  const perSlide = bg.perSlideImages?.[slideIndex];
  if (perSlide) return perSlide.imageOpacity;
  return bg.imageOpacity ?? 0.7;
}

type ColorScope = "this" | "all";
type ImageScope = "this" | "all";

const CarrosselBackgroundEditor = ({ background, onChange, activeSlide }: Props) => {
  const { user } = useAuth();
  const photographerId = user?.id ?? null;

  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [colorScope, setColorScope] = useState<ColorScope>("all");
  const [imageScope, setImageScope] = useState<ImageScope>("all");
  const [library, setLibrary] = useState<LibraryImage[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadLibrary();
  }, [photographerId]);

  const loadLibrary = async () => {
    if (!photographerId) return;
    const { data } = await supabase
      .from("carousel_image_library")
      .select("*")
      .eq("photographer_id", photographerId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setLibrary(data as LibraryImage[]);
  };

  const perSlide = background.perSlideColors?.[activeSlide];
  const effectiveColor = perSlide?.color ?? background.color;
  const effectiveColor2 = perSlide?.color2 ?? background.color2;
  const effectiveType = perSlide?.type ?? background.type;
  const effectiveDirection = perSlide?.direction ?? background.direction;

  const updateColor = (updates: Partial<SlideColorConfig>) => {
    if (colorScope === "this") {
      const current: SlideColorConfig = perSlide ?? { type: background.type, color: background.color, color2: background.color2, direction: background.direction };
      const updated = { ...current, ...updates };
      onChange({
        ...background,
        perSlideColors: { ...background.perSlideColors, [activeSlide]: updated },
      });
    } else {
      onChange({
        ...background,
        ...updates,
        applyTo: "all",
        perSlideColors: undefined,
      });
    }
  };

  const applyImage = (url: string) => {
    if (imageScope === "this") {
      const opacity = background.perSlideImages?.[activeSlide]?.imageOpacity ?? background.imageOpacity ?? 0.7;
      onChange({
        ...background,
        perSlideImages: {
          ...background.perSlideImages,
          [activeSlide]: { imageUrl: url, imageOpacity: opacity },
        },
      });
    } else {
      onChange({
        ...background,
        imageUrl: url,
        imageOpacity: background.imageOpacity ?? 0.7,
        imageApplyTo: "all",
        perSlideImages: undefined,
      });
    }
  };

  const saveToLibrary = async (url: string, source: "upload" | "ai", promptText?: string) => {
    if (!photographerId) return;
    await supabase.from("carousel_image_library").insert({ url, source, prompt: promptText || null, photographer_id: photographerId });
    loadLibrary();
  };

  const deleteFromLibrary = async (id: string, url: string) => {
    try {
      const { error } = await supabase.from("carousel_image_library").delete().eq("id", id);
      if (error) throw error;

      try {
        const bucketUrl = supabase.storage.from("carousel-images").getPublicUrl("").data.publicUrl;
        if (url.startsWith(bucketUrl)) {
          const path = url.replace(bucketUrl + "/", "");
          await supabase.storage.from("carousel-images").remove([path]);
        }
      } catch {}

      loadLibrary();
      toast.success("Imagem removida!");
    } catch (err: any) {
      toast.error("Erro ao remover imagem: " + err.message);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("carousel-images").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("carousel-images").getPublicUrl(path);
      const url = urlData.publicUrl;
      applyImage(url);
      await saveToLibrary(url, "upload");
      toast.success("Imagem enviada!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar imagem");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast.error("Digite um prompt para gerar a imagem");
      return;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-background-image", {
        body: { prompt: prompt.trim() },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.imageUrl) throw new Error("Nenhuma imagem gerada");

      applyImage(data.imageUrl);
      await saveToLibrary(data.imageUrl, "ai", prompt.trim());
      toast.success("Imagem gerada!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar imagem");
    } finally {
      setIsGenerating(false);
    }
  };

  const currentImageUrl = getSlideImageUrl(background, activeSlide);
  const currentOpacity = getSlideImageOpacity(background, activeSlide);

  return (
    <div className="space-y-4">
      {/* Color/Gradient Section */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Fundo do Slide</Label>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Editar:</Label>
          <div className="flex gap-1">
            <Button variant={colorScope === "this" ? "default" : "outline"} size="sm" className="h-6 text-xs px-2" onClick={() => setColorScope("this")}>
              Slide {activeSlide + 1}
            </Button>
            <Button variant={colorScope === "all" ? "default" : "outline"} size="sm" className="h-6 text-xs px-2" onClick={() => setColorScope("all")}>
              Todos
            </Button>
          </div>
        </div>

        <Tabs value={effectiveType} onValueChange={(v) => updateColor({ type: v as "solid" | "gradient" })}>
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="solid" className="text-xs">Cor sólida</TabsTrigger>
            <TabsTrigger value="gradient" className="text-xs">Gradiente</TabsTrigger>
          </TabsList>

          <TabsContent value="solid" className="space-y-2 mt-2">
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateColor({ color: c })}
                  className={`w-7 h-7 rounded-md border-2 transition-all ${effectiveColor === c && effectiveType === "solid" ? "border-primary scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="color" value={effectiveColor} onChange={(e) => updateColor({ color: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0" />
              <Input value={effectiveColor} onChange={(e) => updateColor({ color: e.target.value })} className="h-8 text-sm font-mono" placeholder="#000000" />
            </div>
          </TabsContent>

          <TabsContent value="gradient" className="space-y-2 mt-2">
            <div className="flex flex-wrap gap-2">
              {GRADIENT_PRESETS.map((g, i) => (
                <button
                  key={i}
                  onClick={() => updateColor({ type: "gradient", color: g.color, color2: g.color2, direction: g.direction })}
                  className="w-10 h-7 rounded-md border-2 border-transparent hover:border-primary transition-all"
                  style={{ background: `linear-gradient(${g.direction}, ${g.color}, ${g.color2})` }}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1">
                <input type="color" value={effectiveColor} onChange={(e) => updateColor({ color: e.target.value })} className="w-7 h-7 rounded cursor-pointer border-0" />
                <Input value={effectiveColor} onChange={(e) => updateColor({ color: e.target.value })} className="h-7 text-xs font-mono" />
              </div>
              <div className="flex items-center gap-1">
                <input type="color" value={effectiveColor2 || "#4a1942"} onChange={(e) => updateColor({ color2: e.target.value })} className="w-7 h-7 rounded cursor-pointer border-0" />
                <Input value={effectiveColor2 || ""} onChange={(e) => updateColor({ color2: e.target.value })} className="h-7 text-xs font-mono" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-xs mr-1">Direção:</Label>
              {DIRECTIONS.map((d) => (
                <Button key={d.value} variant={effectiveDirection === d.value ? "default" : "outline"} size="sm" className="w-7 h-7 p-0 text-xs" onClick={() => updateColor({ direction: d.value })}>
                  {d.label}
                </Button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Image Section */}
      <div className="space-y-3 border-t pt-4">
        <Label className="text-sm font-semibold flex items-center gap-1.5">
          <ImageIcon className="h-4 w-4" /> Imagem (sobre o fundo)
        </Label>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Aplicar em:</Label>
          <div className="flex gap-1">
            <Button variant={imageScope === "this" ? "default" : "outline"} size="sm" className="h-6 text-xs px-2" onClick={() => setImageScope("this")}>
              Slide {activeSlide + 1}
            </Button>
            <Button variant={imageScope === "all" ? "default" : "outline"} size="sm" className="h-6 text-xs px-2" onClick={() => setImageScope("all")}>
              Todos
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <Button variant="outline" size="sm" className="h-8 flex-1" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
            Enviar imagem
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => { setShowLibrary(!showLibrary); if (!showLibrary) loadLibrary(); }}>
            <Image className="h-4 w-4 mr-1" /> Banco
          </Button>
        </div>

        <div className="flex gap-2">
          <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ex: fundo abstrato tecnologia azul" className="h-8 text-sm" disabled={isGenerating} onKeyDown={(e) => e.key === "Enter" && handleGenerateImage()} />
          <Button size="sm" className="h-8" onClick={handleGenerateImage} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar IA"}
          </Button>
        </div>

        {currentImageUrl && (
          <div className="space-y-3">
            <div className="relative">
              <img src={currentImageUrl} alt="Background" className="w-full h-20 object-cover rounded-md border" />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-1 right-1 h-6 w-6 p-0"
                onClick={() => {
                  if (imageScope === "this" && background.perSlideImages?.[activeSlide]) {
                    const updated = { ...background.perSlideImages };
                    delete updated[activeSlide];
                    onChange({ ...background, perSlideImages: Object.keys(updated).length ? updated : undefined });
                  } else {
                    onChange({ ...background, imageUrl: undefined, perSlideImages: undefined });
                  }
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Opacidade: {Math.round(currentOpacity * 100)}%</Label>
              <Slider
                value={[Math.round(currentOpacity * 100)]}
                onValueChange={([v]) => {
                  if (imageScope === "this" || background.perSlideImages?.[activeSlide]) {
                    const perImg = background.perSlideImages?.[activeSlide];
                    if (perImg) {
                      onChange({ ...background, perSlideImages: { ...background.perSlideImages, [activeSlide]: { ...perImg, imageOpacity: v / 100 } } });
                    }
                  } else {
                    onChange({ ...background, imageOpacity: v / 100 });
                  }
                }}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          </div>
        )}

        {showLibrary && (
          <div className="space-y-2 border rounded-md p-3">
            <Label className="text-xs font-semibold">Banco de Imagens</Label>
            {library.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma imagem salva ainda.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                {library.map((img) => (
                  <div key={img.id} className="relative group">
                    <button onClick={() => applyImage(img.url)} className="relative aspect-square w-full rounded-md overflow-hidden border-2 border-transparent hover:border-primary transition-all">
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 right-0 text-[8px] bg-black/60 text-white px-1 rounded-tl">{img.source === "ai" ? "IA" : "UP"}</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteFromLibrary(img.id, img.url); }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Text Palette Section */}
      <div className="space-y-3 border-t pt-4">
        <Label className="text-sm font-semibold">Cores do Texto</Label>
        <div className="flex flex-wrap gap-2">
          {TEXT_PALETTES.map((p) => (
            <button
              key={p.id}
              onClick={() => onChange({ ...background, textPalette: p.id })}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                (background.textPalette ?? "classic-dark") === p.id ? "border-primary bg-accent" : "border-transparent hover:border-muted-foreground/30"
              }`}
            >
              <div className="w-14 h-10 rounded flex flex-col items-center justify-center gap-0.5" style={{ backgroundColor: p.id === "classic-light" ? "#ffffff" : "#1a1a2e" }}>
                <span style={{ color: p.colors.tag, fontSize: "5px", fontWeight: 700 }}>TAG</span>
                <span style={{ color: p.colors.titulo, fontSize: "8px", fontWeight: 700 }}>Título</span>
                <span style={{ color: p.colors.corpo, fontSize: "6px" }}>Corpo</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CarrosselBackgroundEditor;
