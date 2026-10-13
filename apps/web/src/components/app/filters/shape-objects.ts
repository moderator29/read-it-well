import type { BrandIconProp } from "@/design-system/icons/BrandIcon";
import type { UnitShape } from "@/lib/listings/unit-shape";

/*
 * THE REALISTIC 3D OBJECT FOR EACH UNIT SHAPE (the founder, 13 October 2026:
 * the Shape tiles of the Filters sheet drew thin line icons while the Property
 * type tiles drew the "Spaces for you" objects). Every name here is a Tier A
 * render under `public/brand/tier-a` and a key of `TIERED_OBJECTS`; the suite
 * holds that, and holds that every shape has one.
 *
 * Closest real object per shape. The tier A pack has no render of a single
 * room, so four are the nearest building rather than a literal match:
 * self-contain (a narrow block of rooms), mini flat (a serviced block),
 * maisonette (a two-storey house with columns) and boys' quarters (a small
 * house standing alone).
 */
export const SHAPE_OBJECT: Record<UnitShape, BrandIconProp> = {
  self_contain: "narrow-block",
  room_parlour: "house-hip-roof",
  mini_flat: "serviced-block",
  flat: "apartment-block",
  duplex: "modern-house-glass",
  terrace: "terrace-row",
  semi_detached: "townhouse-twin",
  detached: "family-house-gate",
  bungalow: "bungalow",
  maisonette: "mansion-columns",
  penthouse: "penthouse-terrace",
  boys_quarters: "small-house",
};

/** "Comes with a BQ": the same small house the boys' quarters tile draws. */
export const BQ_OBJECT: BrandIconProp = SHAPE_OBJECT.boys_quarters;
