import { createContext, useContext } from "react";

/**
 * When a session detail page is reached via a custom domain route (/book/:id),
 * this context carries the resolved store_slug so the page can navigate back
 * correctly (back to "/" instead of "/store/:slug").
 */
export const CustomDomainSlugContext = createContext<string | null>(null);

export const useCustomDomainSlug = () => useContext(CustomDomainSlugContext);
