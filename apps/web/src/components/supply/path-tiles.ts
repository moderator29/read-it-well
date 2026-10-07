/**
 * THE 3D TILE ON EACH STEP OF A LEARNING PATH (reference 2).
 *
 * The tiles are the role renders in `public/brand/session-b/roles/`, the
 * glass-on-navy set drawn for the twelve governing role frames, used at their
 * 256px cut because a path tile is shown at 44px. Each tile says what its
 * step asks for; where the set has no honest object for a step, the step has
 * no entry and the card draws its number instead.
 */
const roleTile = (name: string): string => `/brand/session-b/roles/${name}-256.webp`;

/** The listing wizard's eight steps (`ListingWizard` STEP_KEYS). */
export const LISTING_STEP_TILES: Readonly<Record<string, string>> = {
  basics: roleTile("list-rent-house"),
  photos: roleTile("media-camera-plinth"),
  location: roleTile("owner-map-pin"),
  amenities: roleTile("amenity-gated-estate"),
  utilities: roleTile("light-bulb-plinth"),
  pricing: roleTile("price-total-coins"),
  guestView: roleTile("notify-viewed"),
  submit: roleTile("review-sent-house"),
};

/** The host wizard's steps (`HostStepId`, `lib/host/onboarding.ts`). */
export const HOST_STEP_TILES: Readonly<Record<string, string>> = {
  "host-type": roleTile("stays-switch-hotel-orb"),
  business: roleTile("firm-building-plinth"),
  registration: roleTile("firm-stamp"),
  representative: roleTile("ask-person-tile"),
  hotel: roleTile("stays-door-hotel"),
  "room-types": roleTile("room-bedrooms"),
  rates: roleTile("price-total-coins"),
  place: roleTile("shortlet-entire-flat"),
  "house-rules": roleTile("firm-letter"),
  facilities: roleTile("facility-pool"),
  restaurant: roleTile("stays-door-restaurant"),
  tables: roleTile("restaurant-plate-orb"),
  payout: roleTile("home-invest-tile"),
  consent: roleTile("doc-consent-orb"),
  review: roleTile("review-sent-house"),
};

/**
 * The host wizard's first question, "What kind of host are you?", drawn as
 * the three stays doors of `GOVERNING-09` screen three.
 */
export const HOST_TYPE_TILES: Readonly<Record<string, string>> = {
  individual: roleTile("stays-door-shortlet"),
  business: roleTile("stays-door-hotel"),
  restaurant: roleTile("stays-door-restaurant"),
};

/**
 * The "what we will ask you for" overview (`GOVERNING-02` screen three),
 * keyed by the glass object each need line already names
 * (`AddWorkspaceChooser` NEED_OBJECTS). The image draws a person for who you
 * are, a pin for where, and a document with a shield for what proves it.
 */
export const NEED_TILES: Readonly<Record<string, string>> = {
  "user-check": roleTile("ask-person-tile"),
  "id-card-check": roleTile("agent-id-card"),
  "doc-shield": roleTile("ask-doc-shield-tile"),
  wallet: roleTile("price-total-coins"),
  "pin-map": roleTile("ask-pin-tile"),
  "tag-percent": roleTile("price-agency-person"),
  "tag-hash": roleTile("firm-stamp"),
  "hotel-room": roleTile("stays-hotels-bed"),
  camera: roleTile("media-camera-plinth"),
  "doc-home": roleTile("ownership-proof-orb"),
  "calendar-clock": roleTile("ask-clock-tile"),
};
