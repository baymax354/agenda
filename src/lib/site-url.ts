// Public address of the site published on Lovable. The backend only accepts email links
// (confirmation, password reset) that point here, so every link lands on this site first and
// /auth/retorno forwards the customer to the site they signed up on.
export const PUBLIC_SITE_URL = "https://agenda-amiga-booking-hub.lovable.app";

// Other addresses where this same app is hosted. Only these may receive a login session from
// /auth/retorno — never accept an arbitrary address, or a crafted email link could leak a session.
export const EXTRA_APP_ORIGINS = ["https://agenda-five-beige.vercel.app"];

export const RETURN_PATH = "/auth/retorno";

function isEditorPreview(hostname: string): boolean {
  return hostname.startsWith("id-preview--") || hostname.endsWith(".lovableproject.com") || hostname === "localhost";
}

export function isAllowedAppOrigin(origin: string): boolean {
  return origin === PUBLIC_SITE_URL || EXTRA_APP_ORIGINS.includes(origin);
}

/** Address put in confirmation / reset emails for a page `path` on the current site. */
export function authRedirectUrl(path: string, location?: { hostname: string; origin: string }): string {
  const loc = location ?? (typeof window === "undefined" ? undefined : window.location);
  if (!loc || isEditorPreview(loc.hostname) || loc.origin === PUBLIC_SITE_URL) return PUBLIC_SITE_URL + path;
  return `${PUBLIC_SITE_URL}${RETURN_PATH}?para=${encodeURIComponent(loc.origin + path)}`;
}

/** The forward target from /auth/retorno, or null when it is not one of our own sites. */
export function safeForwardTarget(para: string | null | undefined): URL | null {
  if (!para) return null;
  try {
    const url = new URL(para);
    return isAllowedAppOrigin(url.origin) ? url : null;
  } catch {
    return null;
  }
}

/**
 * Built-in photos live on the Lovable-published site under /__l5e/. Other hosts (e.g. Vercel)
 * don't serve that path, so turn those relative links into full links to the published site.
 */
export function photoSrc(url: string): string;
export function photoSrc(url: string | null | undefined): string | undefined;
export function photoSrc(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith("/__l5e/") ? `${PUBLIC_SITE_URL}${url}` : url;
}
