import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, type Lang, type Translations } from "@/lib/i18n/translations";

const STORAGE_KEY = "davions_lang";

function detectLocale(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
  if (saved && ["en", "pt", "es"].includes(saved)) return saved;
  const nav = navigator.language?.toLowerCase() ?? "";
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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLocale);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  // Re-detect if storage changes (multiple tabs)
  useEffect(() => {
    const handler = () => {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved && ["en", "pt", "es"].includes(saved)) setLangState(saved);
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
