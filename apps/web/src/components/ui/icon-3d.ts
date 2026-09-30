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
] as const;
export type Icon3DName = (typeof ICON_3D_NAMES)[number];

export function icon3dSrc(name: Icon3DName): string {
  return `/brand/3d/${name}@2x.webp`;
}
