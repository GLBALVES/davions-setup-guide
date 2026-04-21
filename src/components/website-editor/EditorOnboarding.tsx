import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, MousePointerClick, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const STORAGE_KEY = "davions_editor_onboarding_v1";

type Lang = "en" | "pt" | "es";

const COPY: Record<Lang, {
  step1Title: string;
  step1Desc: string;
  step1Cta: string;
  step2Title: string;
  step2Desc: string;
  step2Cta: string;
  skip: string;
}> = {
  en: {
    step1Title: "This page is empty",
    step1Desc:
      "Add your first section to start building. Pick from Header, Text, Gallery, CTA and more — or browse the full catalog.",
    step1Cta: "Show me the button",
    step2Title: "Click here to add a section",
    step2Desc: "Tap the highlighted button to open the quick picker.",
    step2Cta: "Got it",
    skip: "Skip",
  },
  pt: {
    step1Title: "Esta página está vazia",
    step1Desc:
      "Adicione sua primeira seção para começar. Escolha entre Header, Texto, Galeria, CTA e mais — ou navegue pelo catálogo completo.",
    step1Cta: "Me mostrar o botão",
    step2Title: "Clique aqui para adicionar uma seção",
    step2Desc: "Toque no botão destacado para abrir o seletor rápido.",
    step2Cta: "Entendi",
    skip: "Pular",
  },
  es: {
    step1Title: "Esta página está vacía",
    step1Desc:
      "Añade tu primera sección para empezar. Elige entre Header, Texto, Galería, CTA y más — o explora el catálogo completo.",
    step1Cta: "Muéstrame el botón",
    step2Title: "Haz clic aquí para añadir una sección",
    step2Desc: "Toca el botón destacado para abrir el selector rápido.",
    step2Cta: "Entendido",
    skip: "Saltar",
  },
};

interface EditorOnboardingProps {
  /** Show only when editing AND the page is empty */
  active: boolean;
}

export default function EditorOnboarding({ active }: EditorOnboardingProps) {
  const { lang: language } = useLanguage();
  const lang = (["en", "pt", "es"].includes(language) ? language : "en") as Lang;
  const t = COPY[lang];

  const [step, setStep] = useState<1 | 2 | null>(null);
  // Tracks whether we've previously seen the page in a "has sections" state.
  // When the user empties the page again, we reset the onboarding flag so the
  // 2-step tour replays from the beginning.
  const hadSectionsRef = useRef(false);

  // Initialize from localStorage on mount / when becoming active.
  // If the page just transitioned from "has sections" → empty, clear the
  // completed flag so the tour shows again.
  useEffect(() => {
    if (!active) {
      // Page is non-empty (or editor closed) → remember it for next transition
      hadSectionsRef.current = true;
      setStep(null);
      return;
    }
    try {
      // Coming back to an empty page after having sections: reset progress
      if (hadSectionsRef.current) {
        localStorage.removeItem(STORAGE_KEY);
        hadSectionsRef.current = false;
      }
      const completed = localStorage.getItem(STORAGE_KEY) === "1";
      if (!completed) setStep(1);
    } catch {
      setStep(1);
    }
  }, [active]);

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setStep(null);
  };

  // Closing step 1 (X or backdrop) auto-advances to step 2 instead of dismissing
  const closeStep1 = () => setStep(2);

  if (!active || step === null) return null;

  return createPortal(
    <div className="fixed inset-0 z-[55] pointer-events-none">
      {step === 1 && (
        <>
          {/* Soft backdrop — click to advance to spotlight */}
          <button
            type="button"
            aria-label="Close hint"
            onClick={closeStep1}
            className="absolute inset-0 bg-black/30 backdrop-blur-[1px] pointer-events-auto"
          />
          {/* Centered card */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
            <div className="relative w-[340px] rounded-xl bg-background border border-border shadow-2xl p-5">
              <button
                type="button"
                onClick={closeStep1}
                aria-label="Close"
                className="absolute top-2.5 right-2.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground mb-1">{t.step1Title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.step1Desc}</p>
                </div>
              </div>

              {/* Step dots */}
              <div className="flex items-center gap-1.5 mt-4">
                <div className="h-1 flex-1 rounded-full bg-primary" />
                <div className="h-1 flex-1 rounded-full bg-muted" />
              </div>

              <div className="flex items-center justify-between mt-4">
                <button
                  type="button"
                  onClick={finish}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t.skip}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 transition-colors"
                >
                  {t.step1Cta}
                  <MousePointerClick className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          {/* Dim backdrop with a "hole" around the FAB via a giant outer ring */}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={finish}
            className="absolute inset-0 pointer-events-auto"
          />

          {/* Spotlight ring around the FAB ("bottom-6 right-8") */}
          <div
            aria-hidden
            className="absolute bottom-3 right-5 h-16 w-44 rounded-full ring-4 ring-primary/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] animate-pulse pointer-events-none"
          />

          {/* Tooltip pointing to the FAB */}
          <div className="absolute bottom-28 right-8 pointer-events-auto">
            <div className="relative w-[260px] rounded-xl bg-background border border-border shadow-2xl p-4">
              <button
                type="button"
                onClick={finish}
                aria-label="Close"
                className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <h3 className="text-xs font-medium text-foreground mb-1 pr-5">{t.step2Title}</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{t.step2Desc}</p>

              <div className="flex items-center gap-1.5 mt-3">
                <div className="h-1 flex-1 rounded-full bg-muted" />
                <div className="h-1 flex-1 rounded-full bg-primary" />
              </div>

              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  onClick={finish}
                  className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 transition-colors"
                >
                  {t.step2Cta}
                </button>
              </div>

              {/* Pointer arrow toward FAB */}
              <div className="absolute -bottom-1.5 right-10 w-3 h-3 rotate-45 bg-background border-r border-b border-border" />
            </div>
          </div>
        </>
      )}
    </div>,
    document.body
  );
}
