/**
 * useDeployStatus
 *
 * Tracks whether a fresh production bundle has been deployed to the
 * photographer's custom domain after a publish.
 *
 * Strategy:
 *   - The editor itself runs from a different build (preview/dev) than the
 *     production live domain, so we can NOT compare local vs remote build-id
 *     directly — they would never match.
 *   - Instead, we capture a "baseline" build-id from the live domain at the
 *     start of each polling cycle. The deploy is considered "synced" the
 *     moment the live domain starts serving a DIFFERENT build-id than the
 *     baseline (i.e. Lovable's global "Update" deploy has propagated).
 *
 * States:
 *   - "idle":     never checked yet.
 *   - "checking": fetch in flight.
 *   - "synced":   live bundle changed since the publish was triggered.
 *   - "pending":  live bundle is still the pre-publish baseline.
 *   - "error":    network/fetch failure or no live URL configured.
 *
 * Polls for ~5min after a publish event (caller bumps `pollKey`), and exposes
 * a manual `check()` for the user.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type DeployStatus = "idle" | "checking" | "synced" | "pending" | "error";

interface Options {
  /** Hostname only (e.g. "davions.giombelli.com.br"). Null disables checks. */
  liveHost: string | null;
  /** Bumping this number triggers a fresh polling cycle. */
  pollKey?: number;
  /**
   * Fired once per polling cycle the moment the live bundle changes from the
   * pre-publish baseline. Use this to refresh the in-editor preview / open a
   * fresh live tab.
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
  /** Build-id served by live BEFORE the most recent publish was triggered. */
  const baselineBuildIdRef = useRef<string | null>(null);

  /** Manual one-shot check — does NOT depend on a baseline. */
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
    // For a manual check (no active publish cycle), we have no baseline —
    // treat any successful fetch as "synced" (the live site is reachable and
    // serving a build). The pending vs synced distinction only matters during
    // an active publish cycle, which is handled by the polling effect below.
    const baseline = baselineBuildIdRef.current;
    const next: DeployStatus =
      baseline && remote === baseline ? "pending" : "synced";
    setStatus(next);
    return next;
  }, [liveHost]);

  // Trigger a polling cycle whenever pollKey changes (e.g. after Publish)
  useEffect(() => {
    if (!liveHost || pollKey === 0) return;

    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollStopAtRef.current = Date.now() + 5 * 60 * 1000; // 5 minutes
    let firedSynced = false;
    let cancelled = false;

    const fireSynced = () => {
      if (firedSynced) return;
      firedSynced = true;
      // Tiny delay so the CDN edge for the live domain is ready to serve the
      // new bundle to the soon-to-be-refreshed preview / live tab.
      setTimeout(() => onSynced?.(), 1500);
    };

    const tick = async () => {
      if (cancelled) return;
      setStatus("checking");
      const remote = await fetchRemoteBuildId(liveHost);
      setLastCheckedAt(Date.now());
      setRemoteBuildId(remote);
      if (!remote) {
        // Transient fetch failure during polling — keep the cycle alive,
        // surface as pending so the banner stays visible.
        setStatus("pending");
        return;
      }
      const baseline = baselineBuildIdRef.current;
      if (!baseline) {
        // First successful fetch in this cycle becomes the baseline.
        baselineBuildIdRef.current = remote;
        setStatus("pending");
        return;
      }
      if (remote !== baseline) {
        setStatus("synced");
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        fireSynced();
      } else {
        setStatus("pending");
      }
    };

    // Reset baseline at the start of each new publish cycle.
    baselineBuildIdRef.current = null;
    void tick();
    pollTimerRef.current = setInterval(() => {
      if (Date.now() > pollStopAtRef.current) {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        // Timed out without detecting a new build — surface as error so the
        // user can retry manually.
        setStatus("error");
        return;
      }
      void tick();
    }, 15000);

    return () => {
      cancelled = true;
    };
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
