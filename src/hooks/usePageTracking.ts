import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageview } from "@/lib/seo-api";

/**
 * Lightweight hook that records a pageview into analytics_pageviews
 * whenever the route changes. Requires a photographerId to associate
 * the view — typically resolved from the store/custom-domain context.
 */
export function usePageTracking(photographerId: string | null | undefined) {
  const location = useLocation();

  useEffect(() => {
    if (!photographerId) return;
    trackPageview(photographerId, location.pathname);
  }, [location.pathname, photographerId]);
}
