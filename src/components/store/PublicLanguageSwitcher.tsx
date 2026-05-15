import { useLanguage } from "@/contexts/LanguageContext";
import type { Lang } from "@/lib/i18n/translations";

const OPTIONS: { value: Lang; flag: string; label: string }[] = [
  { value: "en", flag: "🇺🇸", label: "EN" },
  { value: "pt", flag: "🇧🇷", label: "PT" },
  { value: "es", flag: "🇪🇸", label: "ES" },
];

interface Props {
  className?: string;
  /**
   * When true, renders inline (for headers). When false (default),
   * renders as a fixed floating pill at top-right.
   */
  inline?: boolean;
  /** Optional explicit text color (used when header has a custom textColor). */
  textColor?: string | null;
  /** When true, use white-ish styling for transparent headers over dark hero images. */
  onDark?: boolean;
}

/**
 * Language switcher for public-facing pages. Locale is auto-detected on first
 * load via LanguageContext (navigator.language); this lets visitors override it.
 * Defaults to a floating pill, but can be rendered inline inside a header.
 */
export default function PublicLanguageSwitcher({
  className = "",
  inline = false,
  textColor,
  onDark = false,
}: Props) {
  const { lang, setLang } = useLanguage();

  const containerCls = inline
    ? `inline-flex items-center gap-0.5 rounded-full border ${onDark ? "border-white/30 bg-white/10 backdrop-blur-md" : "border-border/60 bg-background/60 backdrop-blur-md"} px-1 py-1 ${className}`
    : `fixed top-3 right-3 z-[60] flex items-center gap-0.5 rounded-full border border-border/60 bg-background/80 backdrop-blur-md px-1 py-1 shadow-sm ${className}`;

  const inactiveCls = inline && onDark
    ? "text-white/70 hover:text-white hover:bg-white/10"
    : "text-muted-foreground hover:text-foreground hover:bg-muted";

  const activeCls = inline && onDark
    ? "bg-white text-black"
    : "bg-foreground text-background";

  return (
    <div className={containerCls}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setLang(opt.value)}
          aria-label={`Switch to ${opt.label}`}
          style={lang !== opt.value && textColor ? { color: textColor } : undefined}
          className={`h-6 px-2 text-[10px] tracking-wider uppercase font-light rounded-full transition-colors duration-200 ${
            lang === opt.value ? activeCls : inactiveCls
          }`}
        >
          <span className="mr-1">{opt.flag}</span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
