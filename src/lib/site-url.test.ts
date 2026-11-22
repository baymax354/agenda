import { describe, expect, it } from "vitest";
import { PUBLIC_SITE_URL, authRedirectUrl, safeForwardTarget } from "./site-url";

const vercel = { hostname: "agenda-five-beige.vercel.app", origin: "https://agenda-five-beige.vercel.app" };

describe("email link addresses", () => {
  it("sends Vercel customers through the Lovable site and back to Vercel", () => {
    expect(authRedirectUrl("/confirmar", vercel)).toBe(
      `${PUBLIC_SITE_URL}/auth/retorno?para=${encodeURIComponent("https://agenda-five-beige.vercel.app/confirmar")}`,
    );
  });

  it("links straight to the Lovable site when the customer is already there", () => {
    expect(authRedirectUrl("/", { hostname: "agenda-amiga-booking-hub.lovable.app", origin: PUBLIC_SITE_URL })).toBe(
      `${PUBLIC_SITE_URL}/`,
    );
  });

  it("forwards only to our own sites", () => {
    expect(safeForwardTarget("https://agenda-five-beige.vercel.app/perfil")?.pathname).toBe("/perfil");
    expect(safeForwardTarget("https://evil.vercel.app/")).toBeNull();
    expect(safeForwardTarget("https://agenda-five-beige.vercel.app.evil.com/")).toBeNull();
    expect(safeForwardTarget("javascript:alert(1)")).toBeNull();
  });
});
