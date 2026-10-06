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
  // The wishlist sheet (30 September): listing and the move.
  "camera",
  "video",
  "checklist",
  "contract",
  // A "$" coin sits on this receipt: use it small, never beside a naira sum.
  "receipt",
  "boxes",
  "toolbox",
  "price-tag",
  // Workspaces.
  "analytics",
  "bank",
  "megaphone",
  "support",
  "team",
  "folder",
  "clock",
  "report-flag",
  // Everyday moments.
  "saved-heart",
  "envelope",
  "phone-code",
  "passcode-lock",
  "gift",
  "map",
  "power",
  "celebrate",
] as const;
export type Icon3DName = (typeof ICON_3D_NAMES)[number];

/**
 * THE TWO-TIER SWAP (D29, 6 October 2026). Where the founder's 6 October sheets
 * carry the same symbol, the name draws that accepted matte royal-blue object
 * from `public/brand/tier-b/` instead of the 30 September one, so a call site
 * that says `<Icon3D name="bell">` inherits it with no edit. Only a clear match is
 * listed; the rest stay on the 30 September files. `coin` moves to the
 * banknotes because tier B keeps the casino prohibitions in full: no coins.
 *
 * The EMAIL PNGs are not swapped (the new set ships webp only), so
 * `icon3dEmailSrc` still points at the 30 September artwork.
 */
export const ICON_3D_TIER_B: Partial<Record<Icon3DName, string>> = {
  bell: "bell",
  shield: "shield-tick",
  camera: "camera",
  gift: "gift-box",
  envelope: "envelope",
  analytics: "bars-chart",
  support: "headset",
  assistant: "robot",
  checklist: "clipboard-list",
  "passcode-lock": "padlock",
  keys: "key-ring",
  coin: "banknotes-stack",
};

export function icon3dSrc(name: Icon3DName): string {
  const matte = ICON_3D_TIER_B[name];
  return matte ? `/brand/tier-b/${matte}@2x.webp` : `/brand/3d/${name}@2x.webp`;
}

/** The PNG for email clients (no webp there): 128 px, or 256 px at 2x. */
export function icon3dEmailSrc(name: Icon3DName, scale: 1 | 2 = 2): string {
  return `/brand/3d/email/${name}${scale === 2 ? "@2x" : ""}.png`;
}
