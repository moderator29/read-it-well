import { BRAND_ICONS, type BrandIconName } from "@/design-system/icons/BrandIcon";

const KNOWN = new Set<string>(BRAND_ICONS);

/**
 * The object a badge is drawn with. A badge names its own object in
 * `badges.object_name` and the commissioned pack is a fixed set, so a code
 * that is not in it falls back to the matte shield rather than render a broken
 * tile (the failure a percentage-padded icon once produced here, which only a
 * screenshot caught). `BrandIcon` itself resolves the name onto the accepted
 * matte object where one exists (D29), so a badge is clay on paper and on
 * night alike.
 */
export function badgeObject(name: string): BrandIconName {
  return (KNOWN.has(name) ? name : "shield-check") as BrandIconName;
}
