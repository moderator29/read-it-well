/**
 * STORE-06 / UI-07 / UX-26. Which store badges may render: only a badge whose
 * link is that store's own listing, and none inside a native shell.
 */
export type StoreBadge = { store: "ios" | "android"; href: string };

/** The badges that may render, from the two store URLs and the surface. */
export function storeBadges(input: {
  appStoreUrl: string | undefined;
  playStoreUrl: string | undefined;
  native: boolean;
}): StoreBadge[] {
  if (input.native) return [];
  const badges: StoreBadge[] = [];
  const ios = (input.appStoreUrl ?? "").trim();
  const android = (input.playStoreUrl ?? "").trim();
  if (/^https:\/\/apps\.apple\.com\/\S+$/.test(ios)) badges.push({ store: "ios", href: ios });
  if (/^https:\/\/play\.google\.com\/store\/apps\/details\?id=\S+$/.test(android)) {
    badges.push({ store: "android", href: android });
  }
  return badges;
}
