/**
 * Custom domain utilities.
 *
 * When a photographer points their domain (e.g. booking.theirstudio.com) at
 * this app via a CNAME / A record, the browser's hostname will not match any
 * of the known app hostnames below.  The store pages use this to look up the
 * correct photographer without relying on a `/store/:slug` URL segment.
 */

const APP_HOSTNAMES = [
  "localhost",
  "lovable.app",
  "lovable.dev",
  "lovableproject.com",
  "nevoxholding.com",
  "www.nevoxholding.com",
];

/** Returns true when the visitor is on a photographer's custom domain. */
export function isCustomDomain(hostname = window.location.hostname): boolean {
  return !APP_HOSTNAMES.some((h) => hostname === h || hostname.endsWith(`.${h}`));
}

/** The raw hostname that should be matched against `photographers.custom_domain`. */
export function getCurrentHostname(): string {
  return window.location.hostname;
}
