import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBlogContext } from "@/contexts/BlogContext";
import { Settings2, Lightbulb, Sparkles, Rocket, Check } from "lucide-react";

const STORAGE_PREFIX = "davions_blog_onboarding_completed_";

type Lang = "en" | "pt" | "es";

const copy: Record<Lang, {
  title: string;
  subtitle: string;
  steps: { title: string; desc: string; cta: string }[];
  back: string;
  next: string;
  skip: string;
  finish: string;
  stepLabel: (n: number, total: number) => string;
}> = {
  pt: {
    title: "Bem-vindo ao Blog ✨",
    subtitle: "Em 4 passos rápidos você publica seu primeiro post com IA.",
    steps: [
      { title: "Configure seu estúdio", desc: "Defina nome, tom de voz e CTA padrão. A IA usa isso em todos os posts.", cta: "Abrir configurações" },
      { title: "Gere temas com IA", desc: "Informe seu nicho e palavras-chave. A IA sugere 10 temas otimizados para SEO.", cta: "Ir para temas" },
      { title: "Crie o artigo completo", desc: "Escolha um tema e gere título, conteúdo, imagens e SEO — em PT, EN ou ES.", cta: "Abrir gerador" },
      { title: "Publique no seu site", desc: "Revise o rascunho e ative a página /blog no editor de site.", cta: "Concluir" },
    ],
    back: "Voltar",
    next: "Próximo",
    skip: "Pular tour",
    finish: "Começar agora",
    stepLabel: (n, t) => `Passo ${n} de ${t}`,
  },
  en: {
    title: "Welcome to Blog ✨",
    subtitle: "Publish your first AI post in 4 quick steps.",
    steps: [
      { title: "Set up your studio", desc: "Define name, tone of voice and default CTA. AI uses this across every post.", cta: "Open settings" },
      { title: "Generate themes with AI", desc: "Enter your niche and keywords. AI suggests 10 SEO-optimized topics.", cta: "Go to themes" },
      { title: "Create the full article", desc: "Pick a theme and generate title, content, images and SEO — in EN, PT or ES.", cta: "Open generator" },
      { title: "Publish on your site", desc: "Review the draft and enable the /blog page in the website editor.", cta: "Finish" },
    ],
    back: "Back",
    next: "Next",
    skip: "Skip tour",
    finish: "Start now",
    stepLabel: (n, t) => `Step ${n} of ${t}`,
  },
  es: {
    title: "Bienvenido al Blog ✨",
    subtitle: "Publica tu primer post con IA en 4 pasos rápidos.",
    steps: [
      { title: "Configura tu estudio", desc: "Define nombre, tono de voz y CTA por defecto. La IA lo usa en todos los posts.", cta: "Abrir configuración" },
      { title: "Genera temas con IA", desc: "Indica tu nicho y palabras clave. La IA sugiere 10 temas optimizados para SEO.", cta: "Ir a temas" },
      { title: "Crea el artículo completo", desc: "Elige un tema y genera título, contenido, imágenes y SEO — en ES, EN o PT.", cta: "Abrir generador" },
      { title: "Publica en tu sitio", desc: "Revisa el borrador y activa la página /blog en el editor de sitio.", cta: "Finalizar" },
    ],
    back: "Atrás",
    next: "Siguiente",
    skip: "Saltar tour",
    finish: "Comenzar ahora",
    stepLabel: (n, t) => `Paso ${n} de ${t}`,
  },
};

const ICONS = [Settings2, Lightbulb, Sparkles, Rocket];
const ROUTES = [
  "/dashboard/blog/config",
  "/dashboard/blog/temas",
  "/dashboard/blog/gerador",
  "/dashboard/website/editor",
];

interface BlogOnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BlogOnboardingWizard = ({ open, onOpenChange }: BlogOnboardingWizardProps) => {
  const { lang: language } = useLanguage();
  const { photographerId } = useBlogContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const lang = (["en", "pt", "es"].includes(language) ? language : "pt") as Lang;
  const t = copy[lang];
  const total = t.steps.length;
  const current = t.steps[step];
  const Icon = ICONS[step];
  const isLast = step === total - 1;

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const markCompleted = () => {
    if (photographerId) {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${photographerId}`, "1");
      } catch {}
    }
  };

  const handleSkip = () => {
    markCompleted();
    onOpenChange(false);
  };

  const handleNext = () => {
    if (isLast) {
      markCompleted();
      onOpenChange(false);
      navigate(ROUTES[step]);
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleStepCta = () => {
    markCompleted();
    onOpenChange(false);
    navigate(ROUTES[step]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">{t.title}</DialogTitle>
          <DialogDescription className="text-xs">{t.subtitle}</DialogDescription>
        </DialogHeader>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mt-2">
          {t.steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < step ? "bg-primary" : i === step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground -mt-1">{t.stepLabel(step + 1, total)}</p>

        {/* Step content */}
        <div className="py-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-foreground mb-1">{current.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{current.desc}</p>
            </div>
          </div>

          {/* Mini-checklist preview */}
          <div className="mt-4 space-y-1.5 pl-12">
            {t.steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                    i < step
                      ? "bg-green-500/15 text-green-600"
                      : i === step
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < step ? <Check className="h-2.5 w-2.5" /> : <span className="text-[8px]">{i + 1}</span>}
                </div>
                <span
                  className={`text-[11px] truncate ${
                    i === step ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  {s.title}
                </span>
              </div>
            ))}
          </div>

          {/* Quick CTA to jump into the step */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleStepCta}
            className="w-full mt-4"
          >
            {current.cta} →
          </Button>
        </div>

        <DialogFooter className="flex-row sm:justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            {t.skip}
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                {t.back}
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {isLast ? t.finish : t.next}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const isBlogOnboardingCompleted = (photographerId: string | null) => {
  if (!photographerId) return true;
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${photographerId}`) === "1";
  } catch {
    return true;
  }
};

export const resetBlogOnboarding = (photographerId: string | null) => {
  if (!photographerId) return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${photographerId}`);
  } catch {}
};
