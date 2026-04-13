import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CarrosselForm from "@/components/creative/carrossel/CarrosselForm";
import CarrosselPreview from "@/components/creative/carrossel/CarrosselPreview";
import CarrosselSlideList from "@/components/creative/carrossel/CarrosselSlideList";
import CarrosselHistorico from "@/components/creative/carrossel/CarrosselHistorico";
import CarrosselEditor from "@/components/creative/carrossel/CarrosselEditor";
import CarrosselBackgroundEditor, { type BackgroundConfig } from "@/components/creative/carrossel/CarrosselBackgroundEditor";
import CarrosselCaption from "@/components/creative/carrossel/CarrosselCaption";
import CarrosselPreviewModel2 from "@/components/creative/carrossel/CarrosselPreviewModel2";
import CarrosselPreviewModel3 from "@/components/creative/carrossel/CarrosselPreviewModel3";
import CarrosselExportButton from "@/components/creative/carrossel/CarrosselExportButton";
import CarrosselExportSlide from "@/components/creative/carrossel/CarrosselExportSlide";
import { Settings, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export interface Slide {
  numero: number;
  tag: string;
  titulo: string;
  corpo: string;
  cta: string;
}

export interface CarrosselData {
  titulo_serie: string;
  slides: Slide[];
}

export interface FormData {
  tema: string;
  tom: string;
  nicho: string;
  quantidade: number;
  marca: string;
  cta: string;
}

export type LayoutModel = "model1" | "model2" | "model3";

const LAYOUT_LABELS: Record<LayoutModel, string> = {
  model1: "Modelo 1",
  model2: "Modelo 2",
  model3: "Modelo 3",
};

const CarrosselPage = () => {
  const { user } = useAuth();
  const photographerId = user?.id ?? null;

  const [carrossel, setCarrossel] = useState<CarrosselData | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [refreshHistory, setRefreshHistory] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [formDataRef, setFormDataRef] = useState<FormData | null>(null);
  const [background, setBackground] = useState<BackgroundConfig>({ type: "solid", color: "#1a1a2e", applyTo: "all", textPalette: "classic-dark" });
  const [layoutModel, setLayoutModel] = useState<LayoutModel>("model1");
  const slideRef = useRef<HTMLDivElement>(null);
  const exportSlideRef = useRef<HTMLDivElement>(null);

  // Approval dialog state
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedSaveModel, setSelectedSaveModel] = useState<LayoutModel>("model1");

  const handleGenerate = async (formData: FormData) => {
    setIsLoading(true);
    setProgress(0);
    setCarrossel(null);
    setIsEditing(false);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 15, 90));
    }, 500);

    try {
      const { data, error } = await supabase.functions.invoke("generate-carousel", {
        body: formData,
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setCarrossel(data);
      setFormDataRef(formData);
      setActiveSlide(0);
      setProgress(100);
      setIsEditing(true);

      toast.success("Carrossel gerado! Revise e aprove os textos.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar carrossel");
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
      setProgress(0);
    }
  };

  const openApproveDialog = () => {
    setSelectedSaveModel(layoutModel);
    setApproveDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!carrossel || !formDataRef || !photographerId) return;

    setApproveDialogOpen(false);

    const { error } = await supabase.from("carousel_historico").insert({
      tema: formDataRef.tema,
      tom: formDataRef.tom,
      nicho: formDataRef.nicho || null,
      slides_json: carrossel as unknown as any,
      photographer_id: photographerId,
      background_config: background as unknown as any,
      layout_model: selectedSaveModel,
    });

    if (error) {
      toast.error("Erro ao salvar carrossel: " + error.message);
      return;
    }

    setRefreshHistory((prev) => prev + 1);
    toast.success("Carrossel aprovado e salvo!");
    setIsEditing(false);
  };

  const handleDiscard = () => {
    setCarrossel(null);
    setIsEditing(false);
    setFormDataRef(null);
  };

  const handleLoadFromHistory = (data: CarrosselData, historyLayoutModel?: string, historyBackground?: BackgroundConfig) => {
    setCarrossel(data);
    setActiveSlide(0);
    setIsEditing(false);
    if (historyLayoutModel && ["model1", "model2", "model3"].includes(historyLayoutModel)) {
      setLayoutModel(historyLayoutModel as LayoutModel);
    }
    if (historyBackground && historyBackground.type) {
      setBackground(historyBackground);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerador de Carrossel</h1>
          <p className="text-muted-foreground mt-1">
            Crie carrosséis profissionais para Instagram com inteligência artificial
          </p>
        </div>
        <Link to="/dashboard/creative/meta-config">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-1" /> Config Meta
          </Button>
        </Link>
      </div>

      <CarrosselForm onGenerate={handleGenerate} isLoading={isLoading} progress={progress} />

      {carrossel && isEditing && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <CarrosselEditor
              data={carrossel}
              onChange={(updated) => {
                setCarrossel(updated);
                if (activeSlide >= updated.slides.length) setActiveSlide(0);
              }}
              onApprove={openApproveDialog}
              onDiscard={handleDiscard}
            />
            {formDataRef && (
              <CarrosselCaption
                key={carrossel.titulo_serie}
                tema={formDataRef.tema}
                nicho={formDataRef.nicho}
                tom={formDataRef.tom}
                tituloSerie={carrossel.titulo_serie}
                autoGenerate={true}
              />
            )}
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex gap-2">
                <Button variant={layoutModel === "model1" ? "default" : "outline"} size="sm" onClick={() => setLayoutModel("model1")}>Modelo 1</Button>
                <Button variant={layoutModel === "model2" ? "default" : "outline"} size="sm" onClick={() => setLayoutModel("model2")}>Modelo 2</Button>
                <Button variant={layoutModel === "model3" ? "default" : "outline"} size="sm" onClick={() => setLayoutModel("model3")}>Modelo 3</Button>
              </div>
              <CarrosselExportButton
                slidesCount={carrossel.slides.length}
                tituloSerie={carrossel.titulo_serie}
                exportRef={exportSlideRef}
                activeSlide={activeSlide}
                onSlideChange={setActiveSlide}
              />
            </div>

            {layoutModel === "model1" ? (
              <CarrosselPreview slides={carrossel.slides} activeSlide={activeSlide} onSlideChange={setActiveSlide} tituloSerie={carrossel.titulo_serie} background={background} slideRef={slideRef} />
            ) : layoutModel === "model2" ? (
              <CarrosselPreviewModel2 slides={carrossel.slides} activeSlide={activeSlide} onSlideChange={setActiveSlide} tituloSerie={carrossel.titulo_serie} background={background} slideRef={slideRef} />
            ) : (
              <CarrosselPreviewModel3 slides={carrossel.slides} activeSlide={activeSlide} onSlideChange={setActiveSlide} tituloSerie={carrossel.titulo_serie} background={background} slideRef={slideRef} />
            )}
            <CarrosselBackgroundEditor background={background} onChange={setBackground} activeSlide={activeSlide} />
          </div>

          <CarrosselExportSlide
            ref={exportSlideRef}
            slide={carrossel.slides[activeSlide]}
            slideIndex={activeSlide}
            totalSlides={carrossel.slides.length}
            tituloSerie={carrossel.titulo_serie}
            background={background}
            layoutModel={layoutModel}
          />
        </div>
      )}

      {carrossel && !isEditing && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {layoutModel === "model1" ? (
              <CarrosselPreview slides={carrossel.slides} activeSlide={activeSlide} onSlideChange={setActiveSlide} tituloSerie={carrossel.titulo_serie} background={background} />
            ) : layoutModel === "model2" ? (
              <CarrosselPreviewModel2 slides={carrossel.slides} activeSlide={activeSlide} onSlideChange={setActiveSlide} tituloSerie={carrossel.titulo_serie} background={background} />
            ) : (
              <CarrosselPreviewModel3 slides={carrossel.slides} activeSlide={activeSlide} onSlideChange={setActiveSlide} tituloSerie={carrossel.titulo_serie} background={background} />
            )}
          </div>
          <div>
            <CarrosselSlideList slides={carrossel.slides} activeSlide={activeSlide} onSlideSelect={setActiveSlide} />
          </div>
        </div>
      )}

      <CarrosselHistorico refreshKey={refreshHistory} onLoad={handleLoadFromHistory} />

      {/* Approval dialog - choose layout model */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-[425px] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Salvar Carrossel</DialogTitle>
            <DialogDescription>Escolha o modelo de layout para salvar com este carrossel.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 py-4">
            {(["model1", "model2", "model3"] as LayoutModel[]).map((m) => (
              <Button
                key={m}
                variant={selectedSaveModel === m ? "default" : "outline"}
                className="min-w-[100px]"
                onClick={() => setSelectedSaveModel(m)}
              >
                {LAYOUT_LABELS[m]}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleApprove}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CarrosselPage;
