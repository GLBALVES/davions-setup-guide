import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, ImagePlus, Type, Palette, Wand2, Undo2, Star, Trash2, Copy, XCircle, Move, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { CreativeFormat, GeneratedTexts, BackgroundType } from "./creative-types";
import { PLATFORMS as PLATFORM_LIST } from "./creative-types";
import CreativeImageBank from "./CreativeImageBank";

interface GradientSuggestion {
  color1: string;
  color2: string;
  direction: string;
  name: string;
}

interface Props {
  formato: CreativeFormat;
  setFormato: (f: CreativeFormat) => void;
  plataformas: string[];
  setPlataformas: (p: string[]) => void;
  onTextsGenerated: (texts: GeneratedTexts) => void;
  onImageGenerated: (url: string, applyToAll?: boolean) => void;
  onBackgroundChange: (type: BackgroundType, value: string) => void;
  numSlides: number;
  setNumSlides: (n: number) => void;
  onUndoBackground?: () => void;
  canUndoBackground?: boolean;
  isCarrossel?: boolean;
  slidesCount?: number;
  onApplyBgToAll?: () => void;
  tema?: string;
  setTema?: (t: string) => void;
  onRemoveBackground?: () => void;
  backgroundPosition?: string;
  onBackgroundPositionChange?: (pos: string) => void;
  hasBackgroundImage?: boolean;
}

export default function CreativeAIPanel({
  formato, setFormato, plataformas, setPlataformas,
  onTextsGenerated, onImageGenerated, onBackgroundChange,
  numSlides, setNumSlides, onUndoBackground, canUndoBackground,
  isCarrossel, slidesCount, onApplyBgToAll,
  tema: temaProp, setTema: setTemaProp,
  onRemoveBackground, backgroundPosition, onBackgroundPositionChange, hasBackgroundImage,
}: Props) {
  const [temaLocal, setTemaLocal] = useState("");
  const tema = temaProp ?? temaLocal;
  const setTema = setTemaProp ?? setTemaLocal;
  const [orientacao, setOrientacao] = useState("");
  const [tom, setTom] = useState("professional");
  const [loadingText, setLoadingText] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [bgType, setBgType] = useState<BackgroundType>("ia");
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const [gradColor1, setGradColor1] = useState("#1a1a2e");
  const [gradColor2, setGradColor2] = useState("#16213e");
  const [gradDirection, setGradDirection] = useState("135deg");
  const [loadingGradient, setLoadingGradient] = useState(false);
  const [gradientSuggestions, setGradientSuggestions] = useState<GradientSuggestion[]>([]);
  const [gradientPrompt, setGradientPrompt] = useState("");
  const [applyImageToAll, setApplyImageToAll] = useState(false);
  const [favoriteGradients, setFavoriteGradients] = useState<GradientSuggestion[]>([]);
  const [favoriteColors, setFavoriteColors] = useState<string[]>([]);
  const [showImageBank, setShowImageBank] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("creative_fav_gradients");
      if (saved) setFavoriteGradients(JSON.parse(saved));
      const savedColors = localStorage.getItem("creative_fav_colors");
      if (savedColors) setFavoriteColors(JSON.parse(savedColors));
    } catch {}
  }, []);

  const saveFavGradient = (g: GradientSuggestion) => {
    const exists = favoriteGradients.some((f) => f.color1 === g.color1 && f.color2 === g.color2 && f.direction === g.direction);
    if (exists) return;
    const updated = [...favoriteGradients, g];
    setFavoriteGradients(updated);
    localStorage.setItem("creative_fav_gradients", JSON.stringify(updated));
    toast({ title: `Gradient "${g.name}" saved to favorites!` });
  };

  const removeFavGradient = (index: number) => {
    const updated = favoriteGradients.filter((_, i) => i !== index);
    setFavoriteGradients(updated);
    localStorage.setItem("creative_fav_gradients", JSON.stringify(updated));
  };

  const saveFavColor = (color: string) => {
    if (favoriteColors.includes(color)) return;
    const updated = [...favoriteColors, color];
    setFavoriteColors(updated);
    localStorage.setItem("creative_fav_colors", JSON.stringify(updated));
    toast({ title: `Color ${color} saved to favorites!` });
  };

  const removeFavColor = (index: number) => {
    const updated = favoriteColors.filter((_, i) => i !== index);
    setFavoriteColors(updated);
    localStorage.setItem("creative_fav_colors", JSON.stringify(updated));
  };

  const saveImageToBank = async (url: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await (supabase as any).from("creative_images").insert({
        file_url: url,
        name: `AI - ${new Date().toLocaleDateString("en-US")}`,
        photographer_id: user.id,
      });
    } catch {}
  };

  const togglePlatform = (p: string) => {
    setPlataformas(
      plataformas.includes(p) ? plataformas.filter((x) => x !== p) : [...plataformas, p]
    );
  };

  const handleBgTypeChange = (type: BackgroundType) => {
    setBgType(type);
    if (type === "solid") onBackgroundChange("solid", bgColor);
    else if (type === "gradient") onBackgroundChange("gradient", `linear-gradient(${gradDirection}, ${gradColor1}, ${gradColor2})`);
  };

  const handleGenerateText = async () => {
    if (!tema.trim()) { toast({ title: "Enter a topic", variant: "destructive" }); return; }
    setLoadingText(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-creative", {
        body: { type: "text", tema, tom, formato, plataforma: plataformas[0] || "instagram", orientacao, numSlides },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.textos) onTextsGenerated(data.textos);
    } catch (e: any) {
      toast({ title: "Error generating texts", description: e.message, variant: "destructive" });
    } finally { setLoadingText(false); }
  };

  const handleGenerateImage = async () => {
    if (!tema.trim()) { toast({ title: "Enter a topic", variant: "destructive" }); return; }
    setLoadingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-creative", {
        body: { type: "image", tema, tom, formato, plataforma: plataformas[0] || "instagram", orientacao },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.image_url) {
        onImageGenerated(data.image_url, applyImageToAll && isCarrossel);
        await saveImageToBank(data.image_url);
      }
    } catch (e: any) {
      toast({ title: "Error generating image", description: e.message, variant: "destructive" });
    } finally { setLoadingImage(false); }
  };

  const handleGenerateGradient = async () => {
    setLoadingGradient(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-creative", {
        body: { type: "gradient", gradientPrompt: gradientPrompt.trim() || undefined, tom },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.gradientes) setGradientSuggestions(data.gradientes);
    } catch (e: any) {
      toast({ title: "Error generating gradients", description: e.message, variant: "destructive" });
    } finally { setLoadingGradient(false); }
  };

  const applyGradient = (g: GradientSuggestion) => {
    setGradColor1(g.color1);
    setGradColor2(g.color2);
    setGradDirection(g.direction);
    onBackgroundChange("gradient", `linear-gradient(${g.direction}, ${g.color1}, ${g.color2})`);
    toast({ title: `Gradient "${g.name}" applied!` });
  };

  const updateHexColor = (value: string, setter: (v: string) => void) => {
    if (/^#[0-9a-fA-F]{0,6}$/.test(value)) setter(value);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-[11px] tracking-wider uppercase font-light">Format</Label>
        <Select value={formato} onValueChange={(v) => setFormato(v as CreativeFormat)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="post_1080">Square — 1080×1080 (Instagram/Facebook)</SelectItem>
            <SelectItem value="portrait_1080">Portrait — 1080×1350 (Instagram 4:5)</SelectItem>
            <SelectItem value="story_1080">Story/Reels — 1080×1920 (Insta/TikTok 9:16)</SelectItem>
            <SelectItem value="landscape_1200">Landscape — 1200×628 (Facebook/LinkedIn/Google)</SelectItem>
            <SelectItem value="landscape_1350">Landscape — 1350×1080 (Instagram Landscape)</SelectItem>
            <SelectItem value="landscape_1920">Widescreen — 1920×1080 (YouTube/Presentation)</SelectItem>
            <SelectItem value="twitter_1600">Twitter/X — 1600×900</SelectItem>
            <SelectItem value="pinterest_1000">Pinterest — 1000×1500 (2:3)</SelectItem>
            <SelectItem value="carrossel">Carousel — 1080×1350 (Instagram)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-[11px] tracking-wider uppercase font-light">Platforms</Label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {PLATFORM_LIST.map((p) => (
            <label key={p.value} className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={plataformas.includes(p.value)} onCheckedChange={() => togglePlatform(p.value)} />
              {p.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-[11px] tracking-wider uppercase font-light">Tone</Label>
        <Select value={tom} onValueChange={setTom}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="casual">Casual</SelectItem>
            <SelectItem value="promotional">Promotional</SelectItem>
            <SelectItem value="educational">Educational</SelectItem>
            <SelectItem value="inspirational">Inspirational</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formato === "carrossel" && (
        <div>
          <Label className="text-[11px] tracking-wider uppercase font-light">Number of Slides</Label>
          <Input type="number" min={1} max={10} value={numSlides} onChange={(e) => setNumSlides(Math.max(1, Math.min(10, Number(e.target.value))))} className="h-8 text-xs" />
        </div>
      )}

      <div>
        <Label className="text-[11px] tracking-wider uppercase font-light">Topic / Subject</Label>
        <Textarea value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Describe the creative topic..." rows={2} className="text-xs" />
      </div>

      <div>
        <Label className="text-[11px] tracking-wider uppercase font-light">Creative Direction</Label>
        <Textarea value={orientacao} onChange={(e) => setOrientacao(e.target.value)} placeholder="Extra instructions for the AI... (optional)" rows={2} className="text-xs" />
      </div>

      <Button onClick={handleGenerateText} disabled={loadingText} className="w-full gap-2 text-xs">
        {loadingText ? <Loader2 className="h-4 w-4 animate-spin" /> : <Type className="h-4 w-4" />}
        Generate Texts with AI
      </Button>

      <div>
        <Label className="text-[11px] tracking-wider uppercase font-light flex items-center gap-1"><Palette className="h-3.5 w-3.5" /> Background</Label>
        <div className="flex gap-1 mt-1">
          {(["ia", "solid", "gradient"] as BackgroundType[]).map((t) => (
            <Button key={t} size="sm" variant={bgType === t ? "default" : "outline"} onClick={() => handleBgTypeChange(t)} className="text-xs flex-1">
              {t === "ia" ? "AI" : t === "solid" ? "Solid" : "Gradient"}
            </Button>
          ))}
        </div>
        {bgType === "solid" && (
          <>
            <div className="mt-2 flex gap-2 items-center">
              <Input type="color" value={bgColor} onChange={(e) => { setBgColor(e.target.value); onBackgroundChange("solid", e.target.value); }} className="w-12 h-8 p-0.5" />
              <Input type="text" value={bgColor} onChange={(e) => { updateHexColor(e.target.value, (v) => { setBgColor(v); if (v.length === 7) onBackgroundChange("solid", v); }); }} className="flex-1 h-8 text-xs font-mono" placeholder="#000000" />
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => saveFavColor(bgColor)} title="Save to favorites">
                <Star className="h-3.5 w-3.5 text-yellow-500" />
              </Button>
            </div>
            {favoriteColors.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500 fill-yellow-500" /> Favorites</p>
                <div className="flex flex-wrap gap-1">
                  {favoriteColors.map((c, i) => (
                    <div key={i} className="relative group">
                      <button onClick={() => { setBgColor(c); onBackgroundChange("solid", c); }} className="w-7 h-7 rounded-md border border-border hover:ring-2 hover:ring-primary transition-all" style={{ backgroundColor: c }} title={c} />
                      <button onClick={() => removeFavColor(i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-3.5 h-3.5 text-[8px] hidden group-hover:flex items-center justify-center">×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {bgType === "gradient" && (
          <div className="mt-2 space-y-2">
            <div className="flex gap-2 items-center">
              <Input type="color" value={gradColor1} onChange={(e) => { setGradColor1(e.target.value); onBackgroundChange("gradient", `linear-gradient(${gradDirection}, ${e.target.value}, ${gradColor2})`); }} className="w-12 h-8 p-0.5" />
              <Input type="text" value={gradColor1} onChange={(e) => { updateHexColor(e.target.value, (v) => { setGradColor1(v); if (v.length === 7) onBackgroundChange("gradient", `linear-gradient(${gradDirection}, ${v}, ${gradColor2})`); }); }} className="flex-1 h-8 text-xs font-mono" />
              <Input type="color" value={gradColor2} onChange={(e) => { setGradColor2(e.target.value); onBackgroundChange("gradient", `linear-gradient(${gradDirection}, ${gradColor1}, ${e.target.value})`); }} className="w-12 h-8 p-0.5" />
              <Input type="text" value={gradColor2} onChange={(e) => { updateHexColor(e.target.value, (v) => { setGradColor2(v); if (v.length === 7) onBackgroundChange("gradient", `linear-gradient(${gradDirection}, ${gradColor1}, ${v})`); }); }} className="flex-1 h-8 text-xs font-mono" />
            </div>
            <Select value={gradDirection} onValueChange={(v) => { setGradDirection(v); onBackgroundChange("gradient", `linear-gradient(${v}, ${gradColor1}, ${gradColor2})`); }}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="to right">Horizontal →</SelectItem>
                <SelectItem value="to bottom">Vertical ↓</SelectItem>
                <SelectItem value="135deg">Diagonal ↘</SelectItem>
                <SelectItem value="45deg">Diagonal ↗</SelectItem>
              </SelectContent>
            </Select>
            <div className="space-y-1.5">
              <Input value={gradientPrompt} onChange={(e) => setGradientPrompt(e.target.value)} placeholder="E.g. ocean blue tones, sunset... (optional)" className="h-8 text-xs" />
              <Button size="sm" variant="outline" onClick={handleGenerateGradient} disabled={loadingGradient} className="w-full gap-2 text-xs">
                {loadingGradient ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                Generate Gradient with AI
              </Button>
            </div>
            {gradientSuggestions.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5">
                {gradientSuggestions.map((g, i) => (
                  <div key={i} className="rounded-md border border-border p-1 hover:ring-2 hover:ring-primary transition-all relative group">
                    <button onClick={() => applyGradient(g)} className="w-full" title={g.name}>
                      <div className="h-8 rounded" style={{ background: `linear-gradient(${g.direction}, ${g.color1}, ${g.color2})` }} />
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{g.name}</p>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); saveFavGradient(g); }} className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" title="Save to favorites">
                      <Star className="h-3 w-3 text-yellow-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {favoriteGradients.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500 fill-yellow-500" /> Favorites</p>
                <div className="grid grid-cols-3 gap-1">
                  {favoriteGradients.map((g, i) => (
                    <div key={i} className="relative group">
                      <button onClick={() => applyGradient(g)} className="w-full rounded-md border border-border p-0.5 hover:ring-2 hover:ring-primary transition-all" title={g.name}>
                        <div className="h-6 rounded" style={{ background: `linear-gradient(${g.direction}, ${g.color1}, ${g.color2})` }} />
                      </button>
                      <button onClick={() => removeFavGradient(i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-3.5 h-3.5 text-[8px] hidden group-hover:flex items-center justify-center" title="Remove">×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {hasBackgroundImage && (
        <div>
          <Label className="text-[11px] tracking-wider uppercase font-light flex items-center gap-1"><Move className="h-3.5 w-3.5" /> Background Position</Label>
          <Select value={backgroundPosition || "center"} onValueChange={(v) => onBackgroundPositionChange?.(v)}>
            <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="right">Right</SelectItem>
              <SelectItem value="top left">Top Left</SelectItem>
              <SelectItem value="top right">Top Right</SelectItem>
              <SelectItem value="bottom left">Bottom Left</SelectItem>
              <SelectItem value="bottom right">Bottom Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {isCarrossel && (slidesCount || 0) > 1 && onApplyBgToAll && (
        <Button size="sm" variant="outline" className="w-full gap-2 text-xs" onClick={onApplyBgToAll}>
          <Copy className="h-3 w-3" /> Apply current background to all slides
        </Button>
      )}

      {bgType === "ia" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button onClick={handleGenerateImage} disabled={loadingImage} variant="secondary" className="flex-1 gap-2 text-xs">
              {loadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              Generate Background Image
            </Button>
            {hasBackgroundImage && onRemoveBackground && (
              <Button onClick={onRemoveBackground} variant="outline" size="icon" title="Remove background">
                <XCircle className="h-4 w-4 text-destructive" />
              </Button>
            )}
            {canUndoBackground && (
              <Button onClick={onUndoBackground} variant="outline" size="icon" title="Undo background">
                <Undo2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          {isCarrossel && (slidesCount || 0) > 1 && (
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={applyImageToAll} onCheckedChange={(v) => setApplyImageToAll(!!v)} />
              Apply to all slides
            </label>
          )}
          <Button size="sm" variant="outline" className="w-full gap-2 text-xs" onClick={() => setShowImageBank(true)}>
            <ImageIcon className="h-3.5 w-3.5" /> Image Bank
          </Button>
        </div>
      )}

      <CreativeImageBank
        open={showImageBank}
        onOpenChange={setShowImageBank}
        onSelectImage={(url) => onImageGenerated(url, applyImageToAll && isCarrossel)}
      />
    </div>
  );
}
