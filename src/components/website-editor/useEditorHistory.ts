import { useCallback, useEffect, useRef, useState } from "react";
import type { PageSection } from "./page-templates";
import type { PreviewSiteConfig } from "./PreviewRenderer";

/**
 * Snapshot-based Undo/Redo history for the website editor.
 *
 * Captures the current { site, sections, pageId } after a debounce window
 * so rapid edits (typing, dragging color picker) collapse into a single
 * history entry. The parent provides an onApply callback that re-applies
 * a snapshot to live state (and persists it via the existing auto-save).
 *
 * History is reset whenever the active page changes — undo/redo only operates
 * on edits made on the currently-viewed page.
 */

export interface EditorSnapshot {
  site: PreviewSiteConfig | null;
  sections: PageSection[];
  pageId: string | null;
}

const MAX_HISTORY = 50;
const DEBOUNCE_MS = 500;

interface Options {
  /** Live snapshot rebuilt on every render. */
  current: EditorSnapshot;
  /** Wait until parent has loaded site + sections before recording baseline. */
  enabled: boolean;
  /** Re-apply a previous snapshot to live state. */
  onApply: (snap: EditorSnapshot) => void;
}

const clone = <T,>(v: T): T => (v == null ? v : (JSON.parse(JSON.stringify(v)) as T));
const isEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function useEditorHistory({ current, enabled, onApply }: Options) {
  const pastRef = useRef<EditorSnapshot[]>([]);
  const futureRef = useRef<EditorSnapshot[]>([]);
  const lastSnapshotRef = useRef<EditorSnapshot | null>(null);
  const applyingRef = useRef(false);
  const applyingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, force] = useState(0);
  const rerender = useCallback(() => force((v) => (v + 1) | 0), []);

  // Reset history when switching pages (different page = different timeline).
  useEffect(() => {
    pastRef.current = [];
    futureRef.current = [];
    lastSnapshotRef.current = null;
    rerender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.pageId]);

  // Track changes and push debounced snapshots into the past stack.
  useEffect(() => {
    if (!enabled) return;
    // Initialize baseline lazily on the first enabled render.
    if (!lastSnapshotRef.current) {
      lastSnapshotRef.current = clone(current);
      return;
    }
    if (applyingRef.current) {
      // We're re-applying a snapshot — keep baseline in sync, don't record.
      lastSnapshotRef.current = clone(current);
      if (applyingTimerRef.current) clearTimeout(applyingTimerRef.current);
      applyingTimerRef.current = setTimeout(() => {
        applyingRef.current = false;
      }, DEBOUNCE_MS + 100);
      return;
    }
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      const prev = lastSnapshotRef.current;
      const next = clone(current);
      if (!prev || isEqual(prev, next)) return;
      pastRef.current.push(prev);
      if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
      futureRef.current = [];
      lastSnapshotRef.current = next;
      rerender();
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [enabled, current, rerender]);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return false;
    const prev = pastRef.current.pop()!;
    const cur = lastSnapshotRef.current ?? clone(current);
    futureRef.current.push(cur);
    applyingRef.current = true;
    lastSnapshotRef.current = prev;
    onApply(prev);
    rerender();
    return true;
  }, [current, onApply, rerender]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return false;
    const next = futureRef.current.pop()!;
    const cur = lastSnapshotRef.current ?? clone(current);
    pastRef.current.push(cur);
    applyingRef.current = true;
    lastSnapshotRef.current = next;
    onApply(next);
    rerender();
    return true;
  }, [current, onApply, rerender]);

  return {
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}

/**
 * Compute a snake_case patch (DB column names) of fields that differ between
 * two site snapshots. Used to feed the editor's existing updateSite(patch)
 * helper so undo/redo flows through the standard auto-save pipeline.
 */
export function diffSitePatch(
  prev: Record<string, unknown> | null | undefined,
  next: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const keys = new Set<string>();
  Object.keys(prev || {}).forEach((k) => keys.add(k));
  Object.keys(next || {}).forEach((k) => keys.add(k));
  for (const k of keys) {
    // Only diff DB columns (snake_case). camelCase mirrors are derived inside
    // updateSite() from these snake_case keys, so they update automatically.
    if (!k.includes("_") || k.startsWith("_")) continue;
    const a = prev?.[k];
    const b = next?.[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      patch[k] = b === undefined ? null : b;
    }
  }
  return patch;
}
