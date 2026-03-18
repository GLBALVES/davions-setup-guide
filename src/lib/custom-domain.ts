/**
 * Custom domain utilities.
 *
 * When a photographer points their domain (e.g. booking.theirstudio.com) at
 * this app via a CNAME / A record, the browser's hostname will not match any
 * of the known app hostnames below.  The store pages use this to look up the
 * correct photographer without relying on a `/store/:slug` URL segment.
 *
 * Two categories:
 * - PLATFORM_DOMAINS: every subdomain is also a platform instance (lovable.app, etc.)
 * - EXACT_APP_HOSTNAMES: only the exact root/www belong to the platform;
 *   arbitrary subdomains (e.g. davions.nevoxholding.com) are photographer custom domains.
 */

/** Platform domains where ALL subdomains are app instances. */
const PLATFORM_DOMAINS = [
  "localhost",
  "lovable.app",
  "lovable.dev",
  "lovableproject.com",
];

/** Owned domains — only the exact hostname (and www.) belongs to the platform. */
const EXACT_APP_HOSTNAMES = [
  "nevoxholding.com",
  "www.nevoxholding.com",
  "davions.com",
  "www.davions.com",
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
