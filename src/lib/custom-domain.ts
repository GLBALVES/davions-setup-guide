/**
 * Custom domain utilities.
 *
 * When a photographer points their domain (e.g. booking.theirstudio.com) at
 * this app via a CNAME / A record, the Caddy reverse proxy forwards the
 * original Host header to the Lovable CDN.  The browser's
 * window.location.hostname will therefore be the photographer's domain.
 * The store pages use this to look up the photographer without relying on a
 * /store/:slug URL segment.
 *
 * Two categories:
 * - PLATFORM_DOMAINS: every subdomain is also a platform instance.
 * - EXACT_APP_HOSTNAMES: only these exact hostnames belong to the platform;
 *   any other subdomain/domain is treated as a photographer custom domain.
 */

/** Platform domains where ALL subdomains are app instances. */
const PLATFORM_DOMAINS = [
  "localhost",
  "lovable.app",
  "lovable.dev",
  "lovableproject.com",
];

/**
 * Owned/published hostnames — only these exact values belong to the platform.
 * Subdomains of nevoxholding.com (e.g. davions.nevoxholding.com) are
 * photographer custom domains, not platform instances.
 */
const EXACT_APP_HOSTNAMES = [
  // Root domains
  "nevoxholding.com",
  "www.nevoxholding.com",
  "davions.com",
  "www.davions.com",
  // Published Lovable app URLs
  "davions-page-builder.lovable.app",
];

/** Returns true when the visitor is on a photographer's custom domain. */
export function isCustomDomain(hostname = window.location.hostname): boolean {
  if (EXACT_APP_HOSTNAMES.includes(hostname)) return false;
  if (PLATFORM_DOMAINS.some((h) => hostname === h || hostname.endsWith(`.${h}`))) return false;
  return true;
}

/** The raw hostname that should be matched against `photographers.custom_domain`. */
export function getCurrentHostname(): string {
  return window.location.hostname;
}
