import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, Trash2, Plus,
  Download, Loader2, GripVertical, Image as ImageIcon,
  Square, Upload, Link, ArrowUp, ArrowDown, RotateCcw, ZoomIn, ZoomOut, Maximize, Sparkles, Share2,
} from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CreativeFormat, CanvasElement, Slide } from "./creative-types";
import { DIMS, FONT_LIST } from "./creative-types";
import { icons } from "lucide-react";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import CreativeImageBank from "./CreativeImageBank";
import PublishSocialModal from "./PublishSocialModal";

interface Props {
  formato: CreativeFormat;
  slides: Slide[];
  setSlides: React.Dispatch<React.SetStateAction<Slide[]>>;
  currentSlide: number;
  setCurrentSlide: (n: number) => void;
  canvasPadding?: number;
  onCanvasPaddingChange?: (p: number) => void;
  onReset?: () => void;
}

function SortableSlideThumb({ slide, index, isActive, onClick, onDelete, dim }: {
  slide: Slide; index: number; isActive: boolean; onClick: () => void; onDelete: () => void; dim: { w: number; h: number };
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `slide-${index}` });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const thumbW = 60;
  const thumbH = (dim.h / dim.w) * thumbW;
  const thumbScale = thumbW / dim.w;

  return (
    <div ref={setNodeRef} style={style} className="relative group flex flex-col items-center">
      <div {...attributes} {...listeners} className="cursor-grab mb-0.5"><GripVertical className="h-3 w-3 text-muted-foreground" /></div>
      <div
        onClick={onClick}
        className={`rounded border-2 cursor-pointer overflow-hidden relative ${isActive ? "border-primary" : "border-border"}`}
        style={{
          width: thumbW, height: thumbH,
          background: slide.background_gradient || slide.background_color || (slide.background_url ? `url(${slide.background_url}) center/cover` : "hsl(210 30% 10%)"),
        }}
      >
        {slide.elements.map((el) => {
          if (el.type === "text") {
            return (
              <div key={el.id} style={{
                position: "absolute",
                left: el.x * thumbScale, top: el.y * thumbScale,
                fontSize: Math.max(2, el.fontSize * thumbScale),
                color: el.color, fontWeight: el.fontWeight,
                fontFamily: el.fontFamily || "Inter",
                whiteSpace: "pre-wrap", lineHeight: 1.2,
                maxWidth: thumbW - el.x * thumbScale,
                overflow: "hidden", pointerEvents: "none",
              }}>{el.content}</div>
            );
          }
          if (el.type === "icon") {
            return (
              <div key={el.id} style={{
                position: "absolute",
                left: el.x * thumbScale, top: el.y * thumbScale,
                width: Math.max(3, (el.iconSize || 48) * thumbScale),
                height: Math.max(3, (el.iconSize || 48) * thumbScale),
                backgroundColor: el.iconColor || "#ffffff",
                borderRadius: el.iconBgRadius != null ? el.iconBgRadius * thumbScale : (el.iconBgShape === "circle" ? "50%" : 1),
                pointerEvents: "none",
              }} />
            );
          }
          return null;
        })}
        <span className="text-[8px] text-white/70 absolute bottom-0.5 left-1/2 -translate-x-1/2">{index + 1}</span>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 text-[10px] hidden group-hover:flex items-center justify-center">×</button>
    </div>
  );
}

type ResizeState = {
  id: string;
  corner: "se" | "sw" | "ne" | "nw";
  startX: number; startY: number;
  startElX: number; startElY: number;
  startW: number; startH: number;
} | null;

export default function CreativeCanvas({ formato, slides, setSlides, currentSlide, setCurrentSlide, canvasPadding = 60, onCanvasPaddingChange, onReset }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; elX: number; elY: number } | null>(null);
  const [resizing, setResizing] = useState<ResizeState>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clickedElementRef = useRef(false);
  const [snapLines, setSnapLines] = useState<{ x?: number; y?: number }>({});
  const [manualZoom, setManualZoom] = useState(false);
  const [aiImagePrompt, setAiImagePrompt] = useState("");
  const [generatingAiImage, setGeneratingAiImage] = useState(false);
  const [showImageBank, setShowImageBank] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  const dim = DIMS[formato];
  const slide = slides[currentSlide] || { background_url: "", elements: [] };
  const selected = slide.elements.find((e) => e.id === selectedId) || null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const clampPos = useCallback((x: number, y: number, elW: number, elH: number, isFooterElement = false) => {
    if (isFooterElement) {
      return { x: Math.max(0, Math.min(x, dim.w - elW)), y: Math.max(0, Math.min(y, dim.h - elH)) };
    }
    const pad = canvasPadding;
    return {
      x: Math.max(pad, Math.min(x, dim.w - pad - elW)),
      y: Math.max(pad, Math.min(y, dim.h - pad - elH)),
    };
  }, [canvasPadding, dim.w, dim.h]);

  const getElSize = (el: CanvasElement) => {
    if (el.type === "container" || el.type === "image") return { w: el.width || 300, h: el.height || 300 };
    if (el.type === "icon") { const s = (el.iconSize || 48) + 24; return { w: s, h: s }; }
    return { w: 200, h: el.fontSize * 1.5 };
  };

  const computeAutoScale = useCallback(() => {
    if (!containerRef.current) return 0.4;
    const cw = containerRef.current.clientWidth - 32;
    const ch = containerRef.current.clientHeight - 32;
    return Math.min(cw / dim.w, ch / dim.h, 1);
  }, [dim.w, dim.h]);

  useEffect(() => {
    const resize = () => { if (manualZoom) return; setScale(computeAutoScale()); };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [dim.w, dim.h, manualZoom, computeAutoScale]);

  const handleZoom = (newScale: number) => {
    setScale(Math.max(0.1, Math.min(1.5, Math.round(newScale * 100) / 100)));
    setManualZoom(true);
  };

  const resetZoom = () => { setManualZoom(false); setScale(computeAutoScale()); };

  const updateSlide = useCallback(
    (fn: (s: Slide) => Slide) => { setSlides((prev) => prev.map((s, i) => (i === currentSlide ? fn(s) : s))); },
    [currentSlide, setSlides]
  );

  const updateElement = useCallback(
    (id: string, patch: Partial<CanvasElement>) => {
      updateSlide((s) => ({ ...s, elements: s.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)) }));
    },
    [updateSlide]
  );

  const addText = () => {
    const elW = 400; const elH = 60;
    const clamped = clampPos(dim.w / 2 - 200, dim.h / 2 - 30, elW, elH);
    const el: CanvasElement = {
      id: crypto.randomUUID(), type: "text", content: "New text",
      x: clamped.x, y: clamped.y, fontSize: 48,
      color: "#ffffff", fontWeight: "bold", fontStyle: "normal", textAlign: "center",
    };
    updateSlide((s) => ({ ...s, elements: [...s.elements, el] }));
    setSelectedId(el.id);
  };

  const addContainer = () => {
    const clamped = clampPos(100, 100, 400, 200);
    const el: CanvasElement = {
      id: crypto.randomUUID(), type: "container", content: "",
      x: clamped.x, y: clamped.y, fontSize: 0, color: "transparent",
      fontWeight: "normal", fontStyle: "normal", textAlign: "left",
      width: 400, height: 200, bgColor: "rgba(0,0,0,0.5)", borderRadius: 16, opacity: 80, zIndex: 0,
    };
    updateSlide((s) => ({ ...s, elements: [...s.elements, el] }));
    setSelectedId(el.id);
  };

  const addImageFromUrl = (url: string, knownW?: number, knownH?: number) => {
    if (!url) return;
    const loadAndAdd = (w: number, h: number) => {
      const maxSide = 400;
      const ratio = Math.min(maxSide / w, maxSide / h, 1);
      const finalW = Math.round(w * ratio);
      const finalH = Math.round(h * ratio);
      const clamped = clampPos(100, 100, finalW, finalH);
      const el: CanvasElement = {
        id: crypto.randomUUID(), type: "image", content: "",
        x: clamped.x, y: clamped.y, fontSize: 0, color: "transparent",
        fontWeight: "normal", fontStyle: "normal", textAlign: "left",
        imageUrl: url, width: finalW, height: finalH, borderRadius: 0,
      };
      updateSlide((s) => ({ ...s, elements: [...s.elements, el] }));
      setSelectedId(el.id);
      setShowImageDialog(false);
      setImageUrl("");
    };
    if (knownW && knownH) { loadAndAdd(knownW, knownH); return; }
    const img = new window.Image();
    img.onload = () => loadAndAdd(img.naturalWidth, img.naturalHeight);
    img.onerror = () => loadAndAdd(300, 300);
    img.crossOrigin = "anonymous";
    img.src = url;
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    setUploadingImage(true);
    try {
      const fileName = `creatives/${Date.now()}-${crypto.randomUUID()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage.from("creative-assets").upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("creative-assets").getPublicUrl(fileName);
      addImageFromUrl(urlData.publicUrl);
      toast({ title: "Image uploaded!" });
    } catch (e: any) {
      toast({ title: "Error uploading image", description: e.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleGenerateAiImage = async () => {
    if (!aiImagePrompt.trim()) {
      toast({ title: "Describe the image you want", variant: "destructive" });
      return;
    }
    setGeneratingAiImage(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-creative", {
        body: { type: "image", tema: aiImagePrompt, tom: "professional", formato, plataforma: "instagram", orientacao: aiImagePrompt },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.image_url) {
        addImageFromUrl(data.image_url);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await (supabase as any).from("creative_images").insert({
              file_url: data.image_url,
              name: `AI Element - ${new Date().toLocaleDateString("en-US")}`,
              photographer_id: user.id,
            });
          }
        } catch {}
        toast({ title: "Image generated and added!" });
      }
    } catch (e: any) {
      toast({ title: "Error generating image", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingAiImage(false);
    }
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    updateSlide((s) => ({ ...s, elements: s.elements.filter((e) => e.id !== selectedId) }));
    setSelectedId(null);
  };

  const moveElementOrder = (dir: "up" | "down") => {
    if (!selectedId) return;
    updateSlide((s) => {
      const idx = s.elements.findIndex((e) => e.id === selectedId);
      if (idx < 0) return s;
      const newIdx = dir === "up" ? idx + 1 : idx - 1;
      if (newIdx < 0 || newIdx >= s.elements.length) return s;
      const els = [...s.elements];
      [els[idx], els[newIdx]] = [els[newIdx], els[idx]];
      return { ...s, elements: els };
    });
  };

  const layerButtons = (
    <>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveElementOrder("up")} title="Bring forward"><ArrowUp className="h-3.5 w-3.5" /></Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveElementOrder("down")} title="Send backward"><ArrowDown className="h-3.5 w-3.5" /></Button>
    </>
  );

  const onPointerDown = (e: React.PointerEvent, el: CanvasElement) => {
    if (editing === el.id) return;
    e.preventDefault(); e.stopPropagation();
    clickedElementRef.current = true;
    setSelectedId(el.id);
    if (el.locked) return;
    setDragging({ id: el.id, startX: e.clientX, startY: e.clientY, elX: el.x, elY: el.y });
  };

  const SNAP_THRESHOLD = 8;

  const applySnap = useCallback((rawX: number, rawY: number, elW: number, elH: number) => {
    const centerX = dim.w / 2;
    const centerY = dim.h / 2;
    const pad = canvasPadding;
    const elCenterX = rawX + elW / 2;
    const elCenterY = rawY + elH / 2;
    let x = rawX, y = rawY;
    const lines: { x?: number; y?: number } = {};
    if (Math.abs(elCenterX - centerX) < SNAP_THRESHOLD) { x = centerX - elW / 2; lines.x = centerX; }
    else if (Math.abs(rawX - pad) < SNAP_THRESHOLD) { x = pad; lines.x = pad; }
    else if (Math.abs(rawX + elW - (dim.w - pad)) < SNAP_THRESHOLD) { x = dim.w - pad - elW; lines.x = dim.w - pad; }
    if (Math.abs(elCenterY - centerY) < SNAP_THRESHOLD) { y = centerY - elH / 2; lines.y = centerY; }
    else if (Math.abs(rawY - pad) < SNAP_THRESHOLD) { y = pad; lines.y = pad; }
    else if (Math.abs(rawY + elH - (dim.h - pad)) < SNAP_THRESHOLD) { y = dim.h - pad - elH; lines.y = dim.h - pad; }
    return { x, y, lines };
  }, [dim.w, dim.h, canvasPadding]);

  useEffect(() => {
    if (!dragging) { setSnapLines({}); return; }
    const onMove = (e: PointerEvent) => {
      const dx = (e.clientX - dragging.startX) / scale;
      const dy = (e.clientY - dragging.startY) / scale;
      const el = slide.elements.find((el) => el.id === dragging.id);
      if (!el) return;
      const size = getElSize(el);
      const isFooter = (el.zIndex ?? 0) >= 10;
      const clamped = clampPos(dragging.elX + dx, dragging.elY + dy, size.w, size.h, isFooter);
      const snapped = applySnap(clamped.x, clamped.y, size.w, size.h);
      setSnapLines(snapped.lines);
      updateElement(dragging.id, { x: snapped.x, y: snapped.y });
    };
    const onUp = () => { setDragging(null); setSnapLines({}); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [dragging, scale, updateElement, slide.elements, clampPos, applySnap]);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: PointerEvent) => {
      const dx = (e.clientX - resizing.startX) / scale;
      const dy = (e.clientY - resizing.startY) / scale;
      let newW = resizing.startW, newH = resizing.startH;
      let newX = resizing.startElX, newY = resizing.startElY;
      if (resizing.corner === "se") { newW = Math.max(40, resizing.startW + dx); newH = Math.max(40, resizing.startH + dy); }
      else if (resizing.corner === "sw") { newW = Math.max(40, resizing.startW - dx); newH = Math.max(40, resizing.startH + dy); newX = resizing.startElX + (resizing.startW - newW); }
      else if (resizing.corner === "ne") { newW = Math.max(40, resizing.startW + dx); newH = Math.max(40, resizing.startH - dy); newY = resizing.startElY + (resizing.startH - newH); }
      else if (resizing.corner === "nw") { newW = Math.max(40, resizing.startW - dx); newH = Math.max(40, resizing.startH - dy); newX = resizing.startElX + (resizing.startW - newW); newY = resizing.startElY + (resizing.startH - newH); }
      const el = slide.elements.find((el) => el.id === resizing.id);
      const isFooter = (el?.zIndex ?? 0) >= 10;
      const clamped = clampPos(newX, newY, newW, newH, isFooter);
      updateElement(resizing.id, { width: newW, height: newH, x: clamped.x, y: clamped.y });
    };
    const onUp = () => setResizing(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [resizing, scale, updateElement, clampPos]);

  const onResizePointerDown = (e: React.PointerEvent, el: CanvasElement, corner: "se" | "sw" | "ne" | "nw") => {
    e.preventDefault(); e.stopPropagation();
    setResizing({
      id: el.id, corner,
      startX: e.clientX, startY: e.clientY,
      startElX: el.x, startElY: el.y,
      startW: el.width || 300, startH: el.height || 300,
    });
  };

  const addSlide = () => {
    const bg = slide.background_color || "";
    const grad = slide.background_gradient || "";
    setSlides((prev) => [...prev, { background_url: "", background_color: bg, background_gradient: grad, elements: [] }]);
    setCurrentSlide(slides.length);
  };

  const deleteSlide = (idx: number) => {
    if (slides.length <= 1) return;
    setSlides((prev) => prev.filter((_, i) => i !== idx));
    if (currentSlide >= slides.length - 1) setCurrentSlide(Math.max(0, slides.length - 2));
    else if (currentSlide > idx) setCurrentSlide(currentSlide - 1);
  };

  const handleSlideReorder = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = parseInt(String(active.id).replace("slide-", ""));
    const newIdx = parseInt(String(over.id).replace("slide-", ""));
    setSlides((prev) => arrayMove(prev, oldIdx, newIdx));
    if (currentSlide === oldIdx) setCurrentSlide(newIdx);
    else if (currentSlide === newIdx) setCurrentSlide(oldIdx);
  };

  const exportPNG = async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(canvasRef.current, {
        scale: (dim.w * 3) / (dim.w * scale),
        useCORS: true, backgroundColor: "#000000",
        imageTimeout: 0, removeContainer: true,
      });
      const link = document.createElement("a");
      link.download = `creative-${formato}-${currentSlide + 1}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally { setExporting(false); }
  };

  const canvasBg = (): React.CSSProperties => {
    if (slide.background_url) return {
      backgroundImage: `url(${slide.background_url})`,
      backgroundSize: "cover",
      backgroundPosition: slide.background_position || "center",
    };
    if (slide.background_gradient) return { background: slide.background_gradient };
    if (slide.background_color) return { backgroundColor: slide.background_color };
    return { backgroundColor: "hsl(210 30% 10%)" };
  };

  const renderResizeHandles = (el: CanvasElement) => {
    if (selectedId !== el.id || (el.type !== "container" && el.type !== "image") || el.locked) return null;
    const w = el.width || 300;
    const h = el.height || 300;
    const handleSize = 12;
    const corners: { corner: "nw" | "ne" | "sw" | "se"; left: number; top: number; cursor: string }[] = [
      { corner: "nw", left: -handleSize / 2, top: -handleSize / 2, cursor: "nwse-resize" },
      { corner: "ne", left: w - handleSize / 2, top: -handleSize / 2, cursor: "nesw-resize" },
      { corner: "sw", left: -handleSize / 2, top: h - handleSize / 2, cursor: "nesw-resize" },
      { corner: "se", left: w - handleSize / 2, top: h - handleSize / 2, cursor: "nwse-resize" },
    ];
    return corners.map(({ corner, left, top, cursor }) => (
      <div
        key={corner}
        style={{
          position: "absolute", left, top, width: handleSize, height: handleSize,
          background: "hsl(var(--primary))", border: "2px solid white",
          borderRadius: 2, cursor, zIndex: 1000,
        }}
        onPointerDown={(e) => onResizePointerDown(e, el, corner)}
      />
    ));
  };

  const getIconBorderRadius = (el: CanvasElement) => {
    if (el.iconBgRadius != null) return el.iconBgRadius;
    if (el.iconBgShape === "circle") return 999;
    if (el.iconBgShape === "rounded") return 12;
    return 0;
  };

  const renderElement = (el: CanvasElement) => {
    if (el.type === "container") {
      return (
        <div key={el.id} style={{
          position: "absolute", left: el.x, top: el.y,
          width: el.width || 400, height: el.height || 200,
          backgroundColor: el.bgColor || "rgba(0,0,0,0.5)",
          borderRadius: el.borderRadius || 0,
          opacity: (el.opacity ?? 100) / 100,
          zIndex: el.zIndex ?? 0,
          border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor || "#ffffff"}` : undefined,
          outline: selectedId === el.id ? "2px solid hsl(var(--primary))" : "none", outlineOffset: 4,
          cursor: el.locked ? "default" : (dragging?.id === el.id ? "grabbing" : "grab"),
        }} onPointerDown={(e) => onPointerDown(e, el)} onClick={(e) => e.stopPropagation()}>
          {renderResizeHandles(el)}
        </div>
      );
    }
    if (el.type === "image") {
      return (
        <div key={el.id} style={{
          position: "absolute", left: el.x, top: el.y,
          width: el.width || 300, height: el.height || 300,
          outline: selectedId === el.id ? "2px solid hsl(var(--primary))" : "none", outlineOffset: 4,
          cursor: el.locked ? "default" : (dragging?.id === el.id ? "grabbing" : "grab"),
          overflow: selectedId === el.id ? "visible" : "hidden",
          borderRadius: el.borderRadius || 0,
        }} onPointerDown={(e) => onPointerDown(e, el)} onClick={(e) => e.stopPropagation()}>
          <img src={el.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: el.borderRadius || 0 }} draggable={false} />
          {renderResizeHandles(el)}
        </div>
      );
    }
    if (el.type === "icon") {
      const IconComp = el.iconName ? (icons as any)[el.iconName] : null;
      const size = el.iconSize || 48;
      const bgRadius = getIconBorderRadius(el);
      return (
        <div key={el.id} style={{
          position: "absolute", left: el.x, top: el.y,
          outline: selectedId === el.id ? "2px solid hsl(var(--primary))" : "none", outlineOffset: 4,
          cursor: el.locked ? "default" : (dragging?.id === el.id ? "grabbing" : "grab"),
          zIndex: el.zIndex ?? 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          width: size + 24, height: size + 24,
          backgroundColor: el.iconBgColor || "transparent",
          borderRadius: bgRadius,
        }} onPointerDown={(e) => onPointerDown(e, el)} onClick={(e) => e.stopPropagation()}>
          {IconComp && <IconComp size={size} color={el.iconColor || "#ffffff"} />}
        </div>
      );
    }
    // text
    return (
      <div key={el.id} style={{
        position: "absolute", left: el.x, top: el.y,
        fontSize: el.fontSize, color: el.color, fontWeight: el.fontWeight,
        fontStyle: el.fontStyle, textAlign: el.textAlign,
        fontFamily: el.fontFamily || "Inter",
        zIndex: el.zIndex ?? 0,
        cursor: el.locked ? "default" : (dragging?.id === el.id ? "grabbing" : "grab"),
        minWidth: 100, maxWidth: Math.max(200, dim.w - 2 * canvasPadding),
        outline: selectedId === el.id ? "2px solid hsl(var(--primary))" : "none", outlineOffset: 4,
        userSelect: editing === el.id ? "text" : "none",
        textShadow: "0 2px 8px rgba(0,0,0,0.6)", lineHeight: 1.2,
        padding: "4px 8px",
        whiteSpace: "pre-wrap", wordBreak: "break-word",
        backgroundColor: el.textBgColor || "transparent",
        borderRadius: el.textBgRadius || 0,
      }}
        onPointerDown={(e) => onPointerDown(e, el)}
        onDoubleClick={(e) => { e.stopPropagation(); setEditing(el.id); setSelectedId(el.id); }}
        onClick={(e) => e.stopPropagation()}
        contentEditable={editing === el.id}
        suppressContentEditableWarning
        onBlur={(e) => { updateElement(el.id, { content: e.currentTarget.innerText || "" }); setEditing(null); }}
        onKeyDown={(e) => { if (e.key === "Escape") { (e.target as HTMLElement).blur(); } }}
      >
        {el.content}
      </div>
    );
  };

  const renderToolbar = () => {
    if (!selected) return null;
    if (selected.type === "container") {
      return (
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-card border border-border">
          <Label className="text-xs">Color</Label>
          <Input className="w-12 h-8 p-0.5" type="color" value={selected.bgColor || "#000000"} onChange={(e) => updateElement(selected.id, { bgColor: e.target.value })} />
          <Input className="w-20 h-8 text-xs font-mono" type="text" value={selected.bgColor || "#000000"} onChange={(e) => { const v = e.target.value; if (/^#[0-9a-fA-F]{0,6}$/.test(v)) updateElement(selected.id, { bgColor: v }); }} />
          <Label className="text-xs">W</Label>
          <Input className="w-16 h-8" type="number" value={selected.width || 400} onChange={(e) => updateElement(selected.id, { width: Number(e.target.value) })} />
          <Label className="text-xs">H</Label>
          <Input className="w-16 h-8" type="number" value={selected.height || 200} onChange={(e) => updateElement(selected.id, { height: Number(e.target.value) })} />
          <Label className="text-xs">Radius</Label>
          <Input className="w-14 h-8" type="number" value={selected.borderRadius || 0} onChange={(e) => updateElement(selected.id, { borderRadius: Number(e.target.value) })} />
          <Label className="text-xs">Opacity</Label>
          <Slider min={0} max={100} value={[selected.opacity ?? 100]} onValueChange={([v]) => updateElement(selected.id, { opacity: v })} className="w-20" />
          <div className="flex items-center gap-1 border-l border-border pl-2">
            <Label className="text-xs">Border</Label>
            <Input className="w-12 h-8 p-0.5" type="color" value={selected.borderColor || "#ffffff"} onChange={(e) => updateElement(selected.id, { borderColor: e.target.value })} />
            <Label className="text-xs">Width</Label>
            <Slider min={0} max={10} value={[selected.borderWidth || 0]} onValueChange={([v]) => updateElement(selected.id, { borderWidth: v })} className="w-16" />
          </div>
          {layerButtons}
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={deleteSelected}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      );
    }
    if (selected.type === "image") {
      return (
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-card border border-border">
          <Label className="text-xs">W</Label>
          <Input className="w-16 h-8" type="number" value={selected.width || 300} onChange={(e) => updateElement(selected.id, { width: Number(e.target.value) })} />
          <Label className="text-xs">H</Label>
          <Input className="w-16 h-8" type="number" value={selected.height || 300} onChange={(e) => updateElement(selected.id, { height: Number(e.target.value) })} />
          <Label className="text-xs">Radius</Label>
          <Input className="w-14 h-8" type="number" value={selected.borderRadius || 0} onChange={(e) => updateElement(selected.id, { borderRadius: Number(e.target.value) })} />
          {layerButtons}
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={deleteSelected}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      );
    }
    if (selected.type === "icon") {
      const currentRadius = getIconBorderRadius(selected);
      return (
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-card border border-border">
          <Label className="text-xs">Color</Label>
          <Input className="w-12 h-8 p-0.5" type="color" value={selected.iconColor || "#ffffff"} onChange={(e) => updateElement(selected.id, { iconColor: e.target.value })} />
          <Label className="text-xs">Bg</Label>
          <Input className="w-12 h-8 p-0.5" type="color" value={selected.iconBgColor || "#000000"} onChange={(e) => updateElement(selected.id, { iconBgColor: e.target.value })} />
          <Label className="text-xs">Size</Label>
          <Slider min={16} max={120} value={[selected.iconSize || 48]} onValueChange={([v]) => updateElement(selected.id, { iconSize: v })} className="w-20" />
          <Label className="text-xs">Radius</Label>
          <Slider min={0} max={999} value={[currentRadius]} onValueChange={([v]) => updateElement(selected.id, { iconBgRadius: v, iconBgShape: undefined })} className="w-20" />
          {layerButtons}
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={deleteSelected}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      );
    }
    // text toolbar
    return (
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-card border border-border">
        <Select value={selected.fontFamily || "Inter"} onValueChange={(v) => updateElement(selected.id, { fontFamily: v })}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-60">
            {FONT_LIST.map((f) => (<SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>))}
          </SelectContent>
        </Select>
        <Input className="w-12 h-8 p-0.5" type="color" value={selected.color} onChange={(e) => updateElement(selected.id, { color: e.target.value })} />
        <div className="flex items-center gap-1 w-36">
          <Label className="text-xs shrink-0">Size</Label>
          <Slider min={12} max={120} step={2} value={[selected.fontSize]} onValueChange={([v]) => updateElement(selected.id, { fontSize: v })} />
          <span className="text-xs text-muted-foreground w-8">{selected.fontSize}</span>
        </div>
        <Button size="icon" variant={selected.fontWeight === "bold" ? "default" : "ghost"} className="h-8 w-8" onClick={() => updateElement(selected.id, { fontWeight: selected.fontWeight === "bold" ? "normal" : "bold" })}><Bold className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant={selected.fontStyle === "italic" ? "default" : "ghost"} className="h-8 w-8" onClick={() => updateElement(selected.id, { fontStyle: selected.fontStyle === "italic" ? "normal" : "italic" })}><Italic className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant={selected.textAlign === "left" ? "default" : "ghost"} className="h-8 w-8" onClick={() => updateElement(selected.id, { textAlign: "left" })}><AlignLeft className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant={selected.textAlign === "center" ? "default" : "ghost"} className="h-8 w-8" onClick={() => updateElement(selected.id, { textAlign: "center" })}><AlignCenter className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant={selected.textAlign === "right" ? "default" : "ghost"} className="h-8 w-8" onClick={() => updateElement(selected.id, { textAlign: "right" })}><AlignRight className="h-3.5 w-3.5" /></Button>
        <div className="flex items-center gap-1 border-l border-border pl-2">
          <Label className="text-xs">Bg</Label>
          <Input className="w-12 h-8 p-0.5" type="color" value={selected.textBgColor || "#000000"} onChange={(e) => updateElement(selected.id, { textBgColor: e.target.value })} />
          <Label className="text-xs">Radius</Label>
          <Slider min={0} max={40} value={[selected.textBgRadius || 0]} onValueChange={([v]) => updateElement(selected.id, { textBgRadius: v })} className="w-14" />
        </div>
        {layerButtons}
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={deleteSelected}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId || editing) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelected(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, editing]);

  const handleCanvasClick = useCallback(() => {
    if (clickedElementRef.current) { clickedElementRef.current = false; return; }
    setSelectedId(null); setEditing(null);
  }, []);

  return (
    <div className="flex flex-col h-full gap-3">
      {renderToolbar()}
      <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-hidden bg-muted/30 rounded-lg border border-border relative" onClick={handleCanvasClick}>
        <div className="relative shrink-0 shadow-2xl rounded-md overflow-hidden" style={{ width: dim.w * scale, height: dim.h * scale }}>
          <div ref={canvasRef} style={{ width: dim.w, height: dim.h, transform: `scale(${scale})`, transformOrigin: "top left", ...canvasBg() }} className="relative">
            {slide.elements.map(renderElement)}
          </div>
          {canvasPadding > 0 && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none", zIndex: 999,
              transform: `scale(${scale})`, transformOrigin: "top left",
              width: dim.w, height: dim.h,
              border: `${canvasPadding}px solid transparent`,
              boxShadow: `inset 0 0 0 ${canvasPadding}px rgba(255,255,255,0.04)`,
            }}>
              <div style={{ width: "100%", height: "100%", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 2 }} />
            </div>
          )}
          {snapLines.x != null && (
            <div style={{ position: "absolute", top: 0, left: snapLines.x * scale, width: 0, height: dim.h * scale, borderLeft: "1.5px dashed #3b82f6", pointerEvents: "none", zIndex: 1000, opacity: 0.7 }} />
          )}
          {snapLines.y != null && (
            <div style={{ position: "absolute", left: 0, top: snapLines.y * scale, width: dim.w * scale, height: 0, borderTop: "1.5px dashed #ef4444", pointerEvents: "none", zIndex: 1000, opacity: 0.7 }} />
          )}
        </div>
      </div>

      {/* Zoom & Padding */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleZoom(scale - 0.1)} disabled={scale <= 0.1}><ZoomOut className="h-3.5 w-3.5" /></Button>
          <Slider min={10} max={150} step={5} value={[Math.round(scale * 100)]} onValueChange={([v]) => handleZoom(v / 100)} className="w-28" />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleZoom(scale + 0.1)} disabled={scale >= 1.5}><ZoomIn className="h-3.5 w-3.5" /></Button>
          <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={resetZoom} title="Fit to container"><Maximize className="h-3 w-3" /> Fit</Button>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs shrink-0">Padding</Label>
          <Slider min={0} max={120} step={10} value={[canvasPadding]} onValueChange={([v]) => onCanvasPaddingChange?.(v)} className="w-28" />
          <span className="text-xs text-muted-foreground w-8">{canvasPadding}px</span>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={addText} className="gap-1"><Plus className="h-3.5 w-3.5" /> Text</Button>
        <Button size="sm" variant="outline" onClick={addContainer} className="gap-1"><Square className="h-3.5 w-3.5" /> Container</Button>
        <Button size="sm" variant="outline" onClick={() => setShowImageDialog(true)} className="gap-1"><ImageIcon className="h-3.5 w-3.5" /> Image</Button>
        <Button size="sm" variant="outline" onClick={() => setShowImageBank(true)} className="gap-1"><ImageIcon className="h-3.5 w-3.5" /> Bank</Button>
        {formato === "carrossel" && (
          <div className="flex items-center gap-1 ml-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSlideReorder}>
              <SortableContext items={slides.map((_, i) => `slide-${i}`)} strategy={horizontalListSortingStrategy}>
                <div className="flex gap-1.5">
                  {slides.map((s, i) => (
                    <SortableSlideThumb key={i} slide={s} index={i} isActive={i === currentSlide} dim={dim} onClick={() => setCurrentSlide(i)} onDelete={() => deleteSlide(i)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <Button size="sm" variant="outline" onClick={addSlide} className="gap-1 ml-1"><Plus className="h-3.5 w-3.5" /> Slide</Button>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {onReset && (
            <Button size="sm" variant="outline" onClick={onReset} className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10">
              <RotateCcw className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
          <Button size="sm" onClick={exportPNG} disabled={exporting} className="gap-1">
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export PNG
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowPublishModal(true)} className="gap-1">
            <Share2 className="h-3.5 w-3.5" /> Publish
          </Button>
        </div>
      </div>

      {/* Image Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Image</DialogTitle></DialogHeader>
          <Tabs defaultValue="upload">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="upload" className="gap-1"><Upload className="h-3.5 w-3.5" /> Upload</TabsTrigger>
              <TabsTrigger value="url" className="gap-1"><Link className="h-3.5 w-3.5" /> URL</TabsTrigger>
              <TabsTrigger value="ia" className="gap-1"><Sparkles className="h-3.5 w-3.5" /> AI</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="mt-3 space-y-3">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
              <Button variant="outline" className="w-full h-24 border-dashed gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                {uploadingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                {uploadingImage ? "Uploading..." : "Click to select image"}
              </Button>
            </TabsContent>
            <TabsContent value="url" className="mt-3 space-y-3">
              <Input placeholder="https://example.com/image.jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
              <Button className="w-full" onClick={() => addImageFromUrl(imageUrl)} disabled={!imageUrl.trim()}>Add</Button>
            </TabsContent>
            <TabsContent value="ia" className="mt-3 space-y-3">
              <Textarea value={aiImagePrompt} onChange={(e) => setAiImagePrompt(e.target.value)} placeholder="Describe the image you want to generate..." rows={3} />
              <Button className="w-full gap-2" onClick={handleGenerateAiImage} disabled={generatingAiImage || !aiImagePrompt.trim()}>
                {generatingAiImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generatingAiImage ? "Generating..." : "Generate Image with AI"}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <CreativeImageBank open={showImageBank} onOpenChange={setShowImageBank} onSelectImage={(url) => addImageFromUrl(url)} />
      <PublishSocialModal open={showPublishModal} onOpenChange={setShowPublishModal} canvasRef={canvasRef as React.RefObject<HTMLDivElement>} formato={formato} slideIndex={currentSlide} />
    </div>
  );
}
