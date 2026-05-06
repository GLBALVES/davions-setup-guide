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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none w-auto max-w-[92vw] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2 rounded-full border border-white/10 bg-neutral-900/95 text-neutral-100 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-white/5">
          <Sparkles className="h-3 w-3 text-neutral-300" />
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[12px] font-medium leading-tight whitespace-nowrap">{labels.title}</p>
          <span className="hidden sm:inline text-[11px] text-neutral-400 leading-snug truncate">{labels.description}</span>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="shrink-0 inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase font-medium px-3 py-1.5 rounded-full bg-white text-neutral-900 hover:bg-neutral-200 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          {labels.action}
        </button>

        <button
          onClick={() => setDismissed(true)}
          aria-label={labels.dismiss}
          className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-100 hover:bg-white/5 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
