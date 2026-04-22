/**
 * useDeployStatus
 *
 * Compares the locally-running JS bundle's BUILD_ID (injected at Vite build
 * time) against the BUILD_ID currently served by the live custom domain
 * (read from <meta name="build-id"> in the live index.html).
 *
 * - "synced":   live domain is serving the same bundle the editor is running.
 * - "pending":  live domain is serving an older bundle — global "Update"
 *               deploy hasn't propagated yet.
 * - "error":    network/fetch failure or no live URL configured.
 * - "checking": fetch in flight.
 * - "idle":     never checked yet.
 *
 * Auto-polls for ~2min after a publish event (caller flips `pollKey`),
 * and exposes a manual `check()` for the user.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type DeployStatus = "idle" | "checking" | "synced" | "pending" | "error";

interface Options {
  /** Hostname only (e.g. "davions.giombelli.com.br"). Null disables checks. */
  liveHost: string | null;
  /** Bumping this number triggers a fresh polling cycle. */
  pollKey?: number;
  /**
   * Fired once per polling cycle the moment the live bundle matches the local
   * one. Use this to refresh the in-editor preview / open a fresh live tab.
   */
  onSynced?: () => void;
}

const LOCAL_BUILD_ID =
  (import.meta.env.VITE_BUILD_ID as string | undefined) ?? "dev";

async function fetchRemoteBuildId(host: string): Promise<string | null> {
  try {
    // Cache-buster so we don't hit a stale CDN copy of the HTML shell.
    const res = await fetch(`https://${host}/?_dc=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
      mode: "cors",
      credentials: "omit",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(
      /<meta[^>]+name=["']build-id["'][^>]+content=["']([^"']+)["']/i,
    );
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function useDeployStatus({ liveHost, pollKey = 0, onSynced }: Options) {
  const [status, setStatus] = useState<DeployStatus>("idle");
  const [remoteBuildId, setRemoteBuildId] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStopAtRef = useRef<number>(0);

  const check = useCallback(async (): Promise<DeployStatus> => {
    if (!liveHost) {
      setStatus("error");
      return "error";
    }
    setStatus("checking");
    const remote = await fetchRemoteBuildId(liveHost);
    setLastCheckedAt(Date.now());
    setRemoteBuildId(remote);
    if (!remote) {
      setStatus("error");
      return "error";
    }
    const next: DeployStatus = remote === LOCAL_BUILD_ID ? "synced" : "pending";
    setStatus(next);
    return next;
  }, [liveHost]);

  // Cleanup polling on unmount or host change
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  // Trigger a polling cycle whenever pollKey changes (e.g. after Publish)
  useEffect(() => {
    if (!liveHost || pollKey === 0) return;

    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollStopAtRef.current = Date.now() + 2 * 60 * 1000; // 2 minutes
    let firedSynced = false;

    const fireSynced = () => {
      if (firedSynced) return;
      firedSynced = true;
      // Tiny delay so the CDN edge for the live domain is ready to serve the
      // new bundle to the soon-to-be-refreshed preview / live tab.
      setTimeout(() => onSynced?.(), 1500);
    };

    const tick = async () => {
      const next = await check();
      if (next === "synced") {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        fireSynced();
      }
    };

    void tick();
    pollTimerRef.current = setInterval(() => {
      if (Date.now() > pollStopAtRef.current) {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        return;
      }
      void tick();
    }, 15000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollKey, liveHost]);

  return {
    status,
    localBuildId: LOCAL_BUILD_ID,
    remoteBuildId,
    lastCheckedAt,
    check,
  };
}
