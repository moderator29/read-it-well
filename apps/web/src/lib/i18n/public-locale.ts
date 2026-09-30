import { DEFAULT_LOCALE, isLocale, localeFromAcceptLanguage, type Locale } from "@vallo/i18n/core";

/**
 * LANGUAGES YOU CAN LINK TO (recommendation A10, 30 September 2026).
 *
 * The public site answers at `/ha`, `/yo` and `/ig` as well as at its English
 * address, so a Yoruba landing page can be shared on WhatsApp, printed on a
 * flyer and found by a search engine. English stays at the bare address.
 *
 * Only the public pages are localizable: the landing page, the `(site)` pages
 * and the `(auth)` doors. The signed-in app keeps the language the member
 * chose in Settings (the `nf_locale` cookie), exactly as before; a prefixed
 * address that is not public (`/ha/home`) is sent to the bare address.
 *
 * `proxy.ts` does the routing and this module holds the rules, pure, so
 * `public-locale.test.ts` can check them without a request.
 */

/** The locales that carry a prefix. English is the bare address. */
export const PREFIXED_LOCALES = ["ha", "yo", "ig"] as const satisfies readonly Locale[];
export type PrefixedLocale = (typeof PREFIXED_LOCALES)[number];

/** Set by the proxy on a prefixed request: the locale the address asked for. */
export const URL_LOCALE_HEADER = "x-vallo-url-locale";
/** Set by the proxy on a prefixed request: the address as the visitor typed it. */
export const URL_PATH_HEADER = "x-vallo-url-path";

/**
 * The first path segments whose pages are public AND worth reading in another
 * language. A subset of `PUBLIC_SEGMENTS` in `proxy.ts` (the test holds that);
 * left out on purpose: `auth` (the callback, a redirect), `start` (a
 * redirect), `offline`, `home-or-landing` and `open` (routing, not pages),
 * and the development harnesses.
 */
export const LOCALIZABLE_SEGMENTS: ReadonlySet<string> = new Set([
  "about",
  "areas",
  "careers",
  "contact",
  "docs",
  "help",
  "cancellations",
  "disclaimer",
  "eula",
  "privacy",
  "safety",
  "standards",
  "terms",
  "delete-account",
  "r",
  "forgot-password",
  "reset-password",
  "sign-in",
  "sign-up",
  "welcome",
  "s",
  "landlord",
  "check",
  "safe",
  "for-agents",
  "for-hosts",
  "for-landlords",
  "move-in-cost",
  "guides",
  "email",
  "join",
]);

export function isPrefixedLocale(value: string | undefined | null): value is PrefixedLocale {
  return !!value && (PREFIXED_LOCALES as readonly string[]).includes(value);
}

/** `/ha/about` is `{ locale: "ha", path: "/about" }`; `/about` has no locale. */
export function splitLocalePrefix(pathname: string): { locale: PrefixedLocale | null; path: string } {
  const match = /^\/([a-z]{2})(\/.*)?$/.exec(pathname);
  if (!match || !isPrefixedLocale(match[1])) return { locale: null, path: pathname };
  return { locale: match[1], path: match[2] && match[2] !== "/" ? match[2] : "/" };
}

/** Whether a bare path (no prefix) has a page in every language. */
export function isLocalizablePath(path: string): boolean {
  const clean = path.replace(/\/+$/, "") || "/";
  if (clean === "/") return true;
  const [, first = ""] = clean.split("/");
  return LOCALIZABLE_SEGMENTS.has(first);
}

/** The address of a bare path in a locale: English is the bare path. */
export function localizedPath(path: string, locale: Locale): string {
  const clean = path.replace(/\/+$/, "") || "/";
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

/**
 * The language a visitor prefers for a public page with no prefix: the
 * stored choice first, then the browser, then English. The same order
 * `lib/locale.ts` uses, so the redirect and the render agree.
 */
export function preferredLocale(cookieValue: string | undefined | null, acceptLanguage: string | null): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  return localeFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
}

/** Every language's address for one bare path, as an absolute URL. */
export function alternateUrls(origin: string, path: string): Record<Locale | "x-default", string> {
  const base = origin.replace(/\/+$/, "");
  const at = (locale: Locale) => {
    const localized = localizedPath(path, locale);
    return localized === "/" ? `${base}/` : `${base}${localized}`;
  };
  return { en: at("en"), ha: at("ha"), yo: at("yo"), ig: at("ig"), "x-default": at("en") };
}

/**
 * The hreflang set as an HTTP `Link` header, which search engines read the
 * same as `<link rel="alternate" hreflang>` in the page. Sent by the proxy on
 * every localizable page, so no page can forget it and none has to repeat it.
 */
export function hreflangLinkHeader(origin: string, path: string): string {
  return Object.entries(alternateUrls(origin, path))
    .map(([lang, url]) => `<${url}>; rel="alternate"; hreflang="${lang}"`)
    .join(", ");
}

/** The Open Graph locale for each language. */
export const OG_LOCALE: Record<Locale, string> = {
  en: "en_NG",
  ha: "ha_NG",
  yo: "yo_NG",
  ig: "ig_NG",
};
