import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToPush } from "@/lib/notifications-api";

const DISMISSED_KEY = "push-banner-dismissed";

export function PushBanner() {
  const { t } = useLanguage();
  const { photographerId } = useAuth();
  const [visible, setVisible] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("PushManager" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  const handleEnable = async () => {
    setEnabling(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted" && photographerId) {
        await subscribeToPush(photographerId);
      }
    } finally {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="border border-border p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="shrink-0 h-8 w-8 flex items-center justify-center border border-border">
        <Bell className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-light tracking-wide">{t.dashboard.pushBannerTitle}</p>
        <p className="text-[10px] text-muted-foreground">{t.dashboard.pushBannerDesc}</p>
      </div>

      <button
        onClick={handleEnable}
        disabled={enabling}
        className="shrink-0 text-[10px] tracking-[0.15em] uppercase border border-foreground px-3 py-1.5 hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
      >
        {t.dashboard.pushBannerEnable}
      </button>

      <button
        onClick={handleDismiss}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
