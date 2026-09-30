import { describe, expect, it } from "vitest";
import { isPublicPath } from "../../proxy";
import {
  alternateUrls,
  isLocalizablePath,
  LOCALIZABLE_SEGMENTS,
  localizedPath,
  preferredLocale,
  splitLocalePrefix,
} from "./public-locale";

describe("language addresses (A10)", () => {
  it("splits a prefix off, and only a language prefix", () => {
    expect(splitLocalePrefix("/ha/about")).toEqual({ locale: "ha", path: "/about" });
    expect(splitLocalePrefix("/yo")).toEqual({ locale: "yo", path: "/" });
    expect(splitLocalePrefix("/ig/")).toEqual({ locale: "ig", path: "/" });
    expect(splitLocalePrefix("/en/about")).toEqual({ locale: null, path: "/en/about" });
    expect(splitLocalePrefix("/help")).toEqual({ locale: null, path: "/help" });
    expect(splitLocalePrefix("/hausa")).toEqual({ locale: null, path: "/hausa" });
  });

  it("writes English at the bare address and the others under their prefix", () => {
    expect(localizedPath("/", "en")).toBe("/");
    expect(localizedPath("/", "ha")).toBe("/ha");
    expect(localizedPath("/about/", "yo")).toBe("/yo/about");
  });

  it("gives every localizable page a public bare address and public language addresses", () => {
    for (const segment of LOCALIZABLE_SEGMENTS) {
      expect(isPublicPath(`/${segment}`), `/${segment} must be public to have a language address`).toBe(true);
      expect(isPublicPath(`/ha/${segment}`)).toBe(true);
    }
    expect(isPublicPath("/yo")).toBe(true);
    expect(isPublicPath("/ha/home")).toBe(false);
    expect(isPublicPath("/ig/messages")).toBe(false);
  });

  it("keeps the signed-in app out of it", () => {
    for (const path of ["/home", "/settings", "/messages", "/api/support", "/auth/callback", "/offline"]) {
      expect(isLocalizablePath(path), path).toBe(false);
    }
    expect(isLocalizablePath("/")).toBe(true);
    expect(isLocalizablePath("/sign-in")).toBe(true);
  });

  it("prefers the stored choice, then the browser, then English", () => {
    expect(preferredLocale("yo", "ha")).toBe("yo");
    expect(preferredLocale(undefined, "ig-NG,en;q=0.5")).toBe("ig");
    expect(preferredLocale("xx", null)).toBe("en");
  });

  it("lists all four addresses and English as x-default", () => {
    expect(alternateUrls("https://vallospaces.com/", "/about")).toEqual({
      en: "https://vallospaces.com/about",
      ha: "https://vallospaces.com/ha/about",
      yo: "https://vallospaces.com/yo/about",
      ig: "https://vallospaces.com/ig/about",
      "x-default": "https://vallospaces.com/about",
    });
    expect(alternateUrls("https://vallospaces.com", "/").en).toBe("https://vallospaces.com/");
  });
});
