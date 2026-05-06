/**
 * useAppUpdateNotifier
 *
 * Polls the current origin's HTML shell for the `<meta name="build-id">` value
 * and shows a persistent sonner toast when a new version has been deployed,
 * inviting the user to reload the page.
 *
 * - Initial build-id comes from the document already loaded (the version the
 *   user is currently running).
 * - Subsequent fetches use a cache-buster so we don't get a stale CDN copy.
 * - Once a new build is detected, the toast stays visible until the user
 *   either reloads or dismisses it; polling stops to avoid duplicate toasts.
 */

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const POLL_INTERVAL_MS = 60_000;
const TOAST_ID = "app-update-available";

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

export function useAppUpdateNotifier() {
  const { t } = useLanguage();
  const currentBuildIdRef = useRef<string | null>(null);
  const notifiedRef = useRef(false);

  useEffect(() => {
    currentBuildIdRef.current = readCurrentBuildId();
    // If we don't have a baseline (dev/preview), don't poll.
    if (!currentBuildIdRef.current) return;

    let cancelled = false;

    const labels = (t as any).appUpdate ?? {
      title: "Nova versão disponível",
      description: "Recarregue a página para aplicar as últimas atualizações.",
      action: "Atualizar",
      dismiss: "Depois",
    };

    const showToast = () => {
      if (notifiedRef.current) return;
      notifiedRef.current = true;
      toast(labels.title, {
        id: TOAST_ID,
        description: labels.description,
        duration: Infinity,
        action: {
          label: labels.action,
          onClick: () => window.location.reload(),
        },
        cancel: {
          label: labels.dismiss,
          onClick: () => toast.dismiss(TOAST_ID),
        },
      });
    };

    const tick = async () => {
      if (cancelled || notifiedRef.current) return;
      const remote = await fetchRemoteBuildId();
      if (!remote) return;
      if (remote !== currentBuildIdRef.current) {
        showToast();
      }
    };

    // Check shortly after mount, then on interval, and whenever the tab
    // becomes visible again (users often leave the dashboard open).
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
  }, [t]);
}
