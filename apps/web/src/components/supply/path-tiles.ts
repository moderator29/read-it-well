import { icon3dSrc, type Icon3DName } from "@/components/ui/icon-3d";
import { TIERED_OBJECTS, solidSrc, tieredSrc, type TieredObjectName } from "@/design-system/icons/object-assets";

/**
 * THE 3D TILE ON EACH STEP OF A LEARNING PATH (reference 2).
 *
 * SOLID, NEVER GLASS (the founder, 7 October 2026: "Remove all glass icons on
 * the entire platform"). The tiles were the glass-on-navy role crops in
 * `public/brand/session-b/roles/`; they are now the solid renders the
 * Profile's Belongings rows draw: tier B symbols, tier A buildings, and the
 * founder's own 3D sheet (`public/brand/3d`), every one a 256px file because
 * a path tile is shown at 44px. Each tile says what its step asks for; where
 * no solid object says it honestly, the step has no entry and the card draws
 * its number instead. The role crops stay on disk, referenced by nothing.
 */
const tier = (name: TieredObjectName): string => tieredSrc(TIERED_OBJECTS[name]);
const three = (name: Icon3DName): string => icon3dSrc(name);

/** The listing wizard's eight steps (`ListingWizard` STEP_KEYS). */
export const LISTING_STEP_TILES: Readonly<Record<string, string>> = {
  basics: three("home-small"),
  photos: tier("camera"),
  location: tier("map-pin"),
  amenities: tier("estate-gate"),
  utilities: three("power"),
  pricing: three("price-tag"),
  guestView: three("search"),
  submit: tier("paper-plane"),
};

/** The host wizard's steps (`HostStepId`, `lib/host/onboarding.ts`). */
export const HOST_STEP_TILES: Readonly<Record<string, string>> = {
  "host-type": three("hotel"),
  business: tier("office-tower"),
  registration: tier("seal-plus"),
  representative: three("id-check"),
  hotel: three("hotel"),
  "room-types": three("stay-rated"),
  rates: three("price-tag"),
  place: three("shortlet"),
  "house-rules": three("checklist"),
  facilities: tier("villa-pool"),
  restaurant: three("restaurant"),
  tables: tier("cup-saucer"),
  payout: three("bank"),
  consent: three("contract"),
  review: tier("paper-plane"),
};

/**
 * The host wizard's first question, "What kind of host are you?": a short
 * let, a hotel, a restaurant.
 */
export const HOST_TYPE_TILES: Readonly<Record<string, string>> = {
  individual: three("shortlet"),
  business: three("hotel"),
  restaurant: three("restaurant"),
};

/**
 * The "what we will ask you for" overview (`GOVERNING-02` screen three),
 * keyed by the object each need line already names (`AddWorkspaceChooser`
 * NEED_OBJECTS), drawn as the same solid object `BrandIcon` draws for it.
 */
export const NEED_TILES: Readonly<Record<string, string>> = {
  "user-check": solidSrc("user-check"),
  "id-card-check": solidSrc("id-card-check"),
  "doc-shield": solidSrc("doc-shield"),
  wallet: solidSrc("wallet"),
  "pin-map": solidSrc("pin-map"),
  "tag-percent": solidSrc("tag-percent"),
  "tag-hash": solidSrc("tag-hash"),
  "hotel-room": solidSrc("hotel-room"),
  camera: solidSrc("camera"),
  "doc-home": solidSrc("doc-home"),
  "calendar-clock": solidSrc("calendar-clock"),
};
