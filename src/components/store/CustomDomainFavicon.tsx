import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentHostname, isCustomDomain } from "@/lib/custom-domain";

/**
 * Mounted globally on custom-domain routes. Fetches the photographer's
 * configured favicon_url (from photographer_site) by matching custom_domain
 * with the current hostname, and injects it into <head> so EVERY page
 * (booking, gallery, blog, shop, etc.) shows the studio's own favicon
 * instead of the Davions default.
 */
const CustomDomainFavicon = () => {
  useEffect(() => {
    if (!isCustomDomain()) return;
    let cancelled = false;

    (async () => {
      const hostname = getCurrentHostname();
      const { data: photo } = await supabase
        .from("photographers")
        .select("id")
        .eq("custom_domain", hostname)
        .maybeSingle();
      if (!photo || cancelled) return;

      const { data: site } = await supabase
        .from("photographer_site")
        .select("favicon_url")
        .eq("photographer_id", photo.id)
        .maybeSingle();

      const faviconUrl = (site as any)?.favicon_url as string | null | undefined;
      if (!faviconUrl || cancelled) return;

      const setLink = (rel: string) => {
        let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
        if (!el) {
          el = document.createElement("link");
          el.rel = rel;
          document.head.appendChild(el);
        }
        el.type = "image/png";
        el.href = faviconUrl;
      };
      setLink("icon");
      setLink("apple-touch-icon");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
};

export default CustomDomainFavicon;
