import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";

const STORAGE_KEY = "cookie-consent";

type ConsentValue = "accepted" | "rejected" | null;

export function CookieBanner() {
  const [consent, setConsent] = useState<ConsentValue>(
    () => localStorage.getItem(STORAGE_KEY) as ConsentValue
  );
  const { t } = useLanguage();

  useEffect(() => {
    const handler = () => setConsent(localStorage.getItem(STORAGE_KEY) as ConsentValue);
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  if (consent) return null;

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setConsent("accepted");
  };

  const reject = () => {
    localStorage.setItem(STORAGE_KEY, "rejected");
    setConsent("rejected");
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-background border-t border-border px-4 py-4 sm:px-6 shadow-lg">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <p className="text-xs text-muted-foreground font-light leading-relaxed flex-1">
          {t.lgpd.cookieBannerText}{" "}
          <Link to="/privacy" className="underline underline-offset-2 text-foreground hover:text-primary">
            {t.lgpd.privacyPolicy}
          </Link>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={reject} className="text-xs tracking-wider uppercase font-light">
            {t.lgpd.reject}
          </Button>
          <Button size="sm" onClick={accept} className="text-xs tracking-wider uppercase font-light">
            {t.lgpd.accept}
          </Button>
        </div>
      </div>
    </div>
  );
}
