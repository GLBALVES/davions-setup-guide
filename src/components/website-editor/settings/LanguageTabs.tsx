import { cn } from "@/lib/utils";
import { SITE_I18N_LANGS, SITE_I18N_LANG_LABELS, type SiteI18nLang } from "@/lib/site-i18n";

/**
 * Compact PT / EN / ES tab strip used inside the Vitrine settings sub-panels
 * to switch which language a field is being edited for.
 */
export default function LanguageTabs({
  value,
  onChange,
  className,
}: {
  value: SiteI18nLang;
  onChange: (lang: SiteI18nLang) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5",
        className,
      )}
      role="tablist"
      aria-label="Language"
    >
      {SITE_I18N_LANGS.map((l) => {
        const active = l === value;
        return (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(l)}
            className={cn(
              "px-2 py-0.5 text-[10px] font-medium tracking-wider rounded-sm transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {SITE_I18N_LANG_LABELS[l]}
          </button>
        );
      })}
    </div>
  );
}
