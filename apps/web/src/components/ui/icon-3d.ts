/** The founder's 3D icons (see Icon3D.tsx): names and their files. */
export const ICON_3D_NAMES = [
  "hotel",
  "shortlet",
  "restaurant",
  "local-talks",
  "buy",
  "rent",
  "pay",
  "list",
  // The second sheet (30 September): alerts, help, trust, search, places.
  "bell",
  "assistant",
  "calendar-booked",
  "calendar-pending",
  "shield",
  "search",
  "explore",
  "verified",
  "id-check",
  "card-secure",
  // Property types.
  "home-verified",
  "home-small",
  "villa",
  "city",
  "apartment",
  "land",
  "stay-rated",
  // Money and the move-in.
  "earnings",
  "coin",
  "handover",
  "keys",
] as const;
export type Icon3DName = (typeof ICON_3D_NAMES)[number];

export function icon3dSrc(name: Icon3DName): string {
  return `/brand/3d/${name}@2x.webp`;
}

/** The PNG for email clients (no webp there): 128 px, or 256 px at 2x. */
export function icon3dEmailSrc(name: Icon3DName, scale: 1 | 2 = 2): string {
  return `/brand/3d/email/${name}${scale === 2 ? "@2x" : ""}.png`;
}
