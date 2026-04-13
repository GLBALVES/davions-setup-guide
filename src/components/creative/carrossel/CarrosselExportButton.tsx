import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";

const EXPORT_WIDTH = 1080;
const EXPORT_HEIGHT = 1350;

interface Props {
  slidesCount: number;
  tituloSerie: string;
  exportRef: React.RefObject<HTMLDivElement>;
  activeSlide: number;
  onSlideChange: (index: number) => void;
}

const CarrosselExportButton = ({ slidesCount, tituloSerie, exportRef, activeSlide, onSlideChange }: Props) => {
  const [isExporting, setIsExporting] = useState(false);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const waitForRender = async () => {
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    await delay(200);
  };

  const downloadPng = (dataUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
  };

  const sanitizeFilename = (value: string) =>
    value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "carrossel";

  const captureExportNode = async () => {
    const node = exportRef.current;
    if (!node) throw new Error("Export node not found");
    const prev = node.style.opacity;
    node.style.opacity = "1";
    try {
      return await toPng(node, { width: EXPORT_WIDTH, height: EXPORT_HEIGHT, pixelRatio: 1, cacheBust: true });
    } finally {
      node.style.opacity = prev;
    }
  };

  const handleExportCurrent = useCallback(async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      await waitForRender();
      const dataUrl = await captureExportNode();
      downloadPng(dataUrl, `${sanitizeFilename(tituloSerie)}_slide_${activeSlide + 1}.png`);
      toast.success("Slide exportado!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar slide");
    } finally {
      setIsExporting(false);
    }
  }, [exportRef, activeSlide, tituloSerie]);

  const handleExportAll = useCallback(async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      const originalSlide = activeSlide;
      const baseFilename = sanitizeFilename(tituloSerie);
      for (let i = 0; i < slidesCount; i++) {
        onSlideChange(i);
        await waitForRender();
        const dataUrl = await captureExportNode();
        downloadPng(dataUrl, `${baseFilename}_slide_${i + 1}.png`);
      }
      onSlideChange(originalSlide);
      await waitForRender();
      toast.success("Todos os slides exportados!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar slides");
    } finally {
      setIsExporting(false);
    }
  }, [exportRef, slidesCount, activeSlide, onSlideChange, tituloSerie]);

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExportCurrent} disabled={isExporting}>
        {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
        Exportar Slide
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportAll} disabled={isExporting}>
        {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
        Exportar Todos
      </Button>
    </div>
  );
};

export default CarrosselExportButton;
