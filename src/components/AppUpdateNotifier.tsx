/**
 * AppUpdateNotifier
 *
 * Polls the current origin's HTML shell for the `<meta name="build-id">` value
 * and renders a prominent fixed banner at the top of the viewport when a new
 * version has been deployed, inviting the user to reload the page.
 */

import { useEffect, useRef, useState } from "react";
import { Sparkles, RefreshCw, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const POLL_INTERVAL_MS = 60_000;

function readCurrentBuildId(): string | null {
  const meta = document.querySelector('meta[name="build-id"]');
  const content = meta?.getAttribute("content")?.trim();
  if (!content || content === "%BUILD_ID%") return null;
  return content;
}

async function fetchRemoteBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`/?_v=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(
      /<meta[^>]+name=["']build-id["'][^>]+content=["']([^"']+)["']/i,
    );
    const id = match?.[1]?.trim();
    if (!id || id === "%BUILD_ID%") return null;
    return id;
  } catch {
    return null;
  }
}

export function AppUpdateNotifier() {
  const { t } = useLanguage();
  const currentBuildIdRef = useRef<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    currentBuildIdRef.current = readCurrentBuildId();
    if (!currentBuildIdRef.current) return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      const remote = await fetchRemoteBuildId();
      if (!remote) return;
      if (remote !== currentBuildIdRef.current) {
        setUpdateAvailable(true);
      }
    };

    const initialTimer = setTimeout(() => void tick(), 5_000);
    const interval = setInterval(() => void tick(), POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (!updateAvailable || dismissed) return null;

  const labels = (t as any).appUpdate ?? {
    title: "Nova versão disponível",
    description: "Recarregue a página para aplicar as últimas atualizações.",
    action: "Atualizar",
    dismiss: "Depois",
  };

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] pointer-events-none w-full max-w-[640px] px-3 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-md border border-rose-500/40 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 shadow-[0_8px_30px_rgba(225,29,72,0.18)] backdrop-blur">
        <div className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md bg-rose-500/15 border border-rose-500/30">
          <Sparkles className="h-4 w-4 text-rose-600 dark:text-rose-300" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium tracking-wide leading-tight">{labels.title}</p>
          <p className="text-[11px] opacity-75 leading-snug truncate">{labels.description}</p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="shrink-0 inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase font-medium px-3 py-2 rounded-sm bg-rose-600 text-white hover:bg-rose-700 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          {labels.action}
        </button>

        <button
          onClick={() => setDismissed(true)}
          aria-label={labels.dismiss}
          className="shrink-0 h-7 w-7 flex items-center justify-center rounded-sm text-rose-700/70 dark:text-rose-200/70 hover:bg-rose-500/10 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
