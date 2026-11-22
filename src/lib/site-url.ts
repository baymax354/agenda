// Public address of the published site. Email links (confirmation, password reset)
// must open somewhere customers can reach; the editor preview needs a Lovable login.
export const PUBLIC_SITE_URL = "https://agenda-amiga-booking-hub.lovable.app";

export function authRedirectOrigin(): string {
  if (typeof window === "undefined") return PUBLIC_SITE_URL;
  const { hostname, origin } = window.location;
  const isEditorPreview =
    hostname.startsWith("id-preview--") || hostname.endsWith(".lovableproject.com") || hostname === "localhost";
  return isEditorPreview ? PUBLIC_SITE_URL : origin;
}
