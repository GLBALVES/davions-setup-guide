/**
 * Build the public booking URL for a session.
 * - If photographer has a custom domain → https://<custom_domain>/book/<sessionSlug>
 * - Otherwise → <origin>/vitrine/<storeSlug>/<sessionSlug>
 */
export function buildBookingUrl(opts: {
  customDomain?: string | null;
  storeSlug?: string | null;
  sessionSlugOrId: string;
}): string | null {
  const { customDomain, storeSlug, sessionSlugOrId } = opts;
  if (customDomain && customDomain.trim()) {
    const clean = customDomain.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return `https://${clean}/book/${sessionSlugOrId}`;
  }
  if (storeSlug) {
    return `${window.location.origin}/vitrine/${storeSlug}/${sessionSlugOrId}`;
  }
  return null;
}
