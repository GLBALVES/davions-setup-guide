import { useLanguage } from "@/contexts/LanguageContext";
import type { Lang } from "@/lib/i18n/translations";

const OPTIONS: { value: Lang; flag: string; label: string }[] = [
  { value: "en", flag: "🇺🇸", label: "EN" },
  { value: "pt", flag: "🇧🇷", label: "PT" },
  { value: "es", flag: "🇪🇸", label: "ES" },
];

interface Props {
  className?: string;
}

/**
 * Floating language switcher for public-facing pages (store, shop, blog, sub-pages).
 * Locale is auto-detected on first load via LanguageContext (navigator.language),
 * this lets visitors override it.
 */
export default function PublicLanguageSwitcher({ className = "" }: Props) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={`fixed top-3 right-3 z-[60] flex items-center gap-0.5 rounded-full border border-border/60 bg-background/80 backdrop-blur-md px-1 py-1 shadow-sm ${className}`}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setLang(opt.value)}
          aria-label={`Switch to ${opt.label}`}
          className={`h-6 px-2 text-[10px] tracking-wider uppercase font-light rounded-full transition-colors duration-200 ${
            lang === opt.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <span className="mr-1">{opt.flag}</span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
