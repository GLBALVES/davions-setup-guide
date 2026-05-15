import { createContext, useContext, useState, useEffect, useLayoutEffect, ReactNode } from "react";
import { translations, type Lang, type Translations } from "@/lib/i18n/translations";

const STORAGE_KEY = "davions_lang";
const VALID: Lang[] = ["en", "pt", "es"];

function detectLocale(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved && VALID.includes(saved)) return saved;
  } catch (_) {
    // ignore
  }
  const nav = (typeof navigator !== "undefined" ? navigator.language : "")?.toLowerCase() ?? "";
  if (nav.startsWith("pt")) return "pt";
  if (nav.startsWith("es")) return "es";
  return "en";
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: translations.en,
});

// Initialize synchronously so the very first render is already in the right language.
const INITIAL_LANG: Lang = detectLocale();
if (typeof document !== "undefined") {
  document.documentElement.lang = INITIAL_LANG;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(INITIAL_LANG);

  // Keep <html lang> in sync before paint to avoid any flicker on locale changes.
  useLayoutEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch (_) {
      // ignore
    }
  };

  // Re-detect if storage changes (multiple tabs)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key && e.key !== STORAGE_KEY) return;
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved && VALID.includes(saved)) setLangState(saved);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
