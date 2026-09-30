/**
 * STORE-06 / UI-07 / UX-26, revised 30 September (the apps launch this week).
 *
 * Both official badges always show on the web, so the band says plainly that
 * Vallo is on both stores. A badge is a LINK only when its URL is that
 * store's own listing; until then `href` is null and the badge is drawn with
 * "Coming soon" beneath it, never a link to a listing that is not there and
 * never a fallback page dressed as a store. None show inside a native shell.
 */
export type StoreBadge = { store: "ios" | "android"; href: string | null };

/** The badges to draw, from the two store URLs and the surface. */
export function storeBadges(input: {
  appStoreUrl: string | undefined;
  playStoreUrl: string | undefined;
  native: boolean;
}): StoreBadge[] {
  if (input.native) return [];
  const ios = (input.appStoreUrl ?? "").trim();
  const android = (input.playStoreUrl ?? "").trim();
  return [
    { store: "ios", href: /^https:\/\/apps\.apple\.com\/\S+$/.test(ios) ? ios : null },
    {
      store: "android",
      href: /^https:\/\/play\.google\.com\/store\/apps\/details\?id=\S+$/.test(android) ? android : null,
    },
  ];
}
