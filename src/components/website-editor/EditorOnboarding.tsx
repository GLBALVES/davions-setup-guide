import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Sparkles, X, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

const STORAGE_KEY = "davions_editor_onboarding_v1";

type Step = 1 | 2;

type Lang = "en" | "pt" | "es";

const COPY: Record<Lang, {
  step: string;
  of: string;
  skip: string;
  next: string;
  done: string;
  s1Title: string;
  s1Body: string;
  s2Title: string;
  s2Body: string;
}> = {
  en: {
    step: "Step",
    of: "of",
    skip: "Skip tour",
    next: "Next",
    done: "Got it",
    s1Title: "Welcome — your page is empty",
    s1Body:
      "This is your blank canvas. Start by adding sections like Header, Text, Gallery or CTA to build your page.",
    s2Title: "Use “Add section” to start",
    s2Body:
      "Click the floating button in the bottom-right at any time to open the quick picker and create your first section.",
  },
  pt: {
    step: "Passo",
    of: "de",
    skip: "Pular tour",
    next: "Próximo",
    done: "Entendi",
    s1Title: "Bem-vindo — sua página está vazia",
    s1Body:
      "Este é seu espaço em branco. Comece adicionando seções como Header, Texto, Galeria ou CTA para montar sua página.",
    s2Title: "Use “Add section” para começar",
    s2Body:
      "Clique no botão flutuante no canto inferior direito a qualquer momento para abrir o seletor rápido e criar sua primeira seção.",
  },
  es: {
    step: "Paso",
    of: "de",
    skip: "Saltar tour",
    next: "Siguiente",
    done: "Entendido",
    s1Title: "Bienvenido — tu página está vacía",
    s1Body:
      "Este es tu lienzo en blanco. Empieza agregando secciones como Header, Texto, Galería o CTA para armar tu página.",
    s2Title: "Usa “Add section” para empezar",
    s2Body:
      "Haz clic en el botón flotante en la esquina inferior derecha en cualquier momento para abrir el selector rápido y crear tu primera sección.",
  },
};

interface EditorOnboardingProps {
  /** Only show when these are true (editor is ready and page is empty) */
  active: boolean;
}

/**
 * Two-step mini onboarding for the website editor.
 * Step 1 — explains the empty page state.
 * Step 2 — highlights the floating "Add section" FAB (bottom-right).
 *
 * Auto-shown once per browser. User can skip or dismiss. Persists via localStorage.
 */
export default function EditorOnboarding({ active }: EditorOnboardingProps) {
  const { lang: ctxLang } = useLanguage();
  const lang = (["en", "pt", "es"].includes(ctxLang) ? ctxLang : "en") as Lang;
  const t = COPY[lang];

  const [step, setStep] = useState<Step>(1);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!active) return;
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setOpen(true);
    } catch {
      // ignore (private mode etc.)
    }
  }, [active]);

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
    setStep(1);
  };

  if (!open || !active) return null;

  const overlay = (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {/* Soft dim background that doesn't fully block the editor */}
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-[1px] pointer-events-auto" />

      {/* Spotlight ring around the FAB on step 2 */}
      {step === 2 && (
        <div
          aria-hidden
          className="absolute bottom-3 right-5 h-16 w-44 rounded-full ring-4 ring-primary/70 shadow-[0_0_0_9999px_hsl(var(--foreground)/0.35)] animate-pulse pointer-events-none"
        />
      )}

      {/* Tooltip card */}
      <div
        className={cn(
          "absolute pointer-events-auto",
          step === 1
            ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            : "bottom-28 right-8"
        )}
      >
        <div className="w-[320px] rounded-xl bg-background border border-border shadow-2xl p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                {step === 1 ? <Sparkles className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </span>
              <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-medium">
                {t.step} {step} {t.of} 2
              </span>
            </div>
            <button
              type="button"
              onClick={finish}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t.skip}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-foreground leading-snug">
              {step === 1 ? t.s1Title : t.s2Title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {step === 1 ? t.s1Body : t.s2Body}
            </p>
          </div>

          {/* Step indicator dots */}
          <div className="flex items-center gap-1.5 pt-1">
            <span
              className={cn(
                "h-1.5 rounded-full transition-all",
                step === 1 ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
              )}
            />
            <span
              className={cn(
                "h-1.5 rounded-full transition-all",
                step === 2 ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
              )}
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={finish}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.skip}
            </button>
            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                {t.next}
                <ArrowRight className="h-3 w-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Check className="h-3 w-3" />
                {t.done}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
