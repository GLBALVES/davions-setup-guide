import { useEffect, useMemo, useState } from "react";
import type { ExternalFontEntry } from "@/components/website-editor/site-fonts";

/**
 * Auto-derives the list of font families available via the user's "Custom Font CSS"
 * field. Inspects inline @font-face declarations AND fetches the CSS pointed at by
 * <link rel="stylesheet" href="…"> tags and @import url(…) declarations
 * (Typekit/Adobe Fonts, Google Fonts, etc.) so their family names show up in
 * the per-element Font Family dropdown automatically.
 */

function parseFamiliesFromCss(css: string): string[] {
  if (!css) return [];
  const found = new Set<string>();
  // @font-face { ... font-family: "…" / '…' / bare … ; … }
  const re = /@font-face\s*\{[^}]*?font-family\s*:\s*(?:"([^"]+)"|'([^']+)'|([^;'"}\s][^;}]*?))\s*[;}]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const name = (m[1] || m[2] || m[3] || "").trim().replace(/^["']|["']$/g, "");
    if (name) found.add(name);
  }
  return Array.from(found);
}

function extractStylesheetUrls(css: string): string[] {
  if (!css) return [];
  const urls = new Set<string>();
  // <link href="…">
  const linkRe = /<link\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(css))) urls.add(m[1]);
  // @import url("…") | @import "…"
  const importRe = /@import\s+(?:url\(\s*)?["']([^"']+)["']\s*\)?\s*;?/gi;
  while ((m = importRe.exec(css))) urls.add(m[1]);
  return Array.from(urls).filter((u) => /^https?:\/\//i.test(u));
}

const fetchCache = new Map<string, Promise<string[]>>();

async function fetchFamiliesFromUrl(url: string): Promise<string[]> {
  if (fetchCache.has(url)) return fetchCache.get(url)!;
  const p = (async () => {
    try {
      const res = await fetch(url, { credentials: "omit" });
      if (!res.ok) return [];
      const text = await res.text();
      return parseFamiliesFromCss(text);
    } catch {
      return [];
    }
  })();
  fetchCache.set(url, p);
  return p;
}

export function useExternalFonts(customFontCss: string | null | undefined): ExternalFontEntry[] {
  const css = customFontCss ?? "";
  const directFamilies = useMemo(() => parseFamiliesFromCss(css), [css]);
  const urls = useMemo(() => extractStylesheetUrls(css), [css]);
  const [remote, setRemote] = useState<string[]>([]);

  useEffect(() => {
    if (urls.length === 0) {
      setRemote([]);
      return;
    }
    let cancelled = false;
    Promise.all(urls.map(fetchFamiliesFromUrl)).then((arrays) => {
      if (cancelled) return;
      const flat = Array.from(new Set(arrays.flat()));
      setRemote(flat);
    });
    return () => {
      cancelled = true;
    };
  }, [urls]);

  return useMemo(() => {
    const all = Array.from(new Set([...directFamilies, ...remote]));
    // id = family name → stable across reloads.
    return all.map((family) => ({ id: family, label: family, family }));
  }, [directFamilies, remote]);
}
