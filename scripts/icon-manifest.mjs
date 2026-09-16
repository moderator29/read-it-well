/**
 * What every object on every supplied icon sheet is, and which one wins.
 *
 * This file is DATA, read by `scripts/name-icon-objects.mjs`. It is kept apart
 * from that script because it is the part a person disagrees with. Renaming an
 * object or changing which sheet a name is taken from is an edit here and a
 * rerun; it is never an edit to the pixels.
 *
 * WHY THE SAME NAME APPEARS ON SEVERAL SHEETS.
 *
 * The ten sheets are not ten different sets. They are roughly three passes over
 * the same vocabulary at different densities, plus one set that is genuinely new
 * and one pair of hero sheets. `shield-check` is drawn four times. That is a
 * gift rather than a problem, because it means almost every name the platform
 * already uses has a glass object waiting for it, and the swap is a file change
 * rather than a code change.
 *
 * It does mean a choice has to be made, so `CANONICAL` below names the sheet
 * each final file is cut from, and every other drawing of that object stays in
 * `assets/brand-cut` as an alternate. Nothing is thrown away.
 *
 * THE RULE USED FOR CHOOSING, AND IT IS ABOUT SIZE RATHER THAN TASTE.
 *
 * These are rendered at 20 to 56 pixels on almost every surface in the product
 * and only reach 96 or more in an empty state or a category tile. A detailed
 * scene, the villa with its pool and its four palms, is the better picture and
 * the worse icon: at 24px it is a blue smudge. The simpler sheets, `ECFA9C34`
 * for places and `B04429B0` and `2676C1FC` for actions, hold one subject each
 * and survive the sizes this product actually uses. So the simple pass wins by
 * default, and the detailed pass is preferred only where the simple sheet does
 * not carry the object at all.
 *
 * NAMES ARE THE EXISTING NAMES WHEREVER AN EQUIVALENT EXISTS. `shield-check`
 * stays `shield-check`. That is the whole point: 73 of the 87 objects the
 * platform draws today can be replaced by dropping a file in, with no call site
 * touched. The names that are new are new because the object is new.
 *
 * WHAT IS RECORDED AND NOT FIXED. `9795AD6E` index 23 is a hotel with the word
 * HOTEL rendered into the artwork as pixels. This platform ships `packages/i18n`
 * and text baked into an image cannot be translated, so that object is named
 * `hotel-sign` and is NOT canonical for anything. It is a recommendation in
 * docs/FRONTEND_REVAMP.md, not a file to quietly use.
 */

/**
 * Every object, in the order it is sliced, sheet by sheet.
 *
 * The index in each array is the object's number minus one, so entry 0 is
 * `01.png`. A null would mean an object nobody could identify; there are none.
 */
export const SHEETS = {
  /* Actions and concepts, drawn in detail. The richest pass over the vocabulary. */
  "0b2e4d21": [
    "naira-hand", "wallet-secure", "card-lock", "tag-percent", "tag-hash",
    "gift", "gift-star", "chart-growth", "report-stats", "booking-instant",
    "calendar-check", "calendar-clock", "calendar-home", "calendar-time", "luggage-check",
    "luggage-plane", "keys-home", "keys-tag", "key-cycle", "search-home",
    "listing-search", "home-search", "map-route", "globe-pin", "tour-360",
  ],

  /* Places, drawn as scenes: the villa has a pool, the farm has a field. */
  "9795ad6e": [
    "beach-house", "bungalow", "modern-house", "container-home", "duplex",
    "farm-house", "house-boat", "mountain-cabin", "land-plot", "loft",
    "mansion", "penthouse", "hotel", "shared-apartment", "studio-apartment",
    "terrace-house", "tree-house", "twin-house", "villa", "warehouse",
    "coworking-space", "shop-retail", "hotel-sign", "hotel-room", "shield-check",
  ],

  /* The same places, drawn as single objects. This is the pass that survives 24px. */
  "ecfa9c34": [
    "beach-house", "bungalow", "cluster-home", "container-home", "twin-house",
    "farm-house", "house-boat", "lake-house", "land-plot", "loft",
    "mansion", "mini-flat", "modern-house", "mountain-cabin", "penthouse",
    "hotel", "shared-apartment", "studio-apartment", "terrace-house", "townhouse",
    "tree-house", "duplex", "villa", "warehouse", "office-space",
  ],

  /* Actions, drawn as single objects. The action counterpart of ECFA9C34. */
  "b04429b0": [
    "home-search", "shield-home", "wallet", "naira-coins", "tag-percent",
    "map-spot", "calendar-check", "shield-lock", "doc-shield", "bot",
    "beach-house", "chart-growth", "heart-home", "keys-home", "bell-badge",
    "chat-duo", "user-verified", "shield-lock-alt", "doc-home", "gift-star",
    "hotel-star", "camera", "tour-360", "luggage-plane", "map-spot-alt",
  ],

  /* Trust and money, drawn in detail. Carries the objects the simple sheets omit. */
  "fda04dd1": [
    "villa", "modern-house", "mountain-cabin", "hotel-star", "concierge-bell",
    "shield-check", "home-lock", "shield-home", "support-shield", "doc-shield",
    "doc-lock", "user-check", "home-check", "listing-search", "reviews",
    "naira-hand", "wallet-secure", "card-lock", "tag-percent", "tag-hash",
    "gift", "gift-star", "chart-growth", "report-stats", "pin-map",
  ],

  /* Stays and trust, drawn as single objects. */
  "2676c1fc": [
    "hotel", "hotel-room", "shortlet", "serviced-apartment", "lake-house",
    "house-boat", "land-plot", "warehouse", "coworking-space", "shop-retail",
    "shield-check", "shield-home", "shield-lock", "headset", "doc-shield",
    "doc-lock", "user-check", "home-check", "reviews", "clock-check",
    "gift-star", "chart-growth", "report-stats", "calendar-check", "calendar-clock",
  ],

  /*
   * The transaction and status set. THIS IS THE ONE THAT IS GENUINELY NEW.
   *
   * Nothing in the 87 objects the platform draws today covers a payout, a
   * refund, a failed payment, a receipt, a signed contract or a handover of
   * keys, and nothing covers the three outcomes a confirmation screen has to
   * show. Twelve, thirteen and fourteen are success, pending and failed drawn
   * as the same rosette, which is exactly what the confirmation system in
   * docs/HANDOFF_03_FRONTEND.md section 5 needs and does not have.
   */
  "cf5a4150": [
    "payout-hand", "deposit", "coin-naira", "payment-failed", "refund",
    "wallet-add", "wallet-send", "receipt-check", "cash-box", "savings-pot",
    "ledger-check", "badge-success", "badge-pending", "badge-failed", "hourglass",
    "chart-donut", "alert-warning", "info", "clock-expired", "id-check",
    "doc-search", "doc-failed", "key-handover", "contract-sign",
  ],

  /*
   * The light twin of the set above: the same 24 objects, in the same reading
   * order, as frosted white glass on white. The two sheets wrap differently
   * (5,5,5,5,4 against 5,5,5,4,5), which is handled in the slicer, but index
   * for index they are the same object, so `cf5a4150[n]` and `c0f67033[n]`
   * are a pair.
   */
  "c0f67033": [
    "payout-hand", "deposit", "coin-naira", "payment-failed", "refund",
    "wallet-add", "wallet-send", "receipt-check", "cash-box", "savings-pot",
    "ledger-check", "badge-success", "badge-pending", "badge-failed", "hourglass",
    "chart-donut", "alert-warning", "info", "clock-expired", "id-check",
    "doc-search", "doc-failed", "key-handover", "contract-sign",
  ],

  /*
   * The two hero sheets. Six wide scenes each, every one standing on a lit
   * glass plinth, at roughly five times the pixel area of a small object.
   *
   * These are NOT icons and must never be given an icon's name. A hero scene at
   * 24px is a blue blur; a small object blown up to fill a landing page panel
   * is a small object blown up. They are prefixed `hero-` so that the two can
   * never be confused at a call site.
   */
  "7ee388e5": [
    "hero-assistant", "hero-assistant-chat", "hero-assistant-home",
    "hero-trip", "hero-map-stay", "hero-schedule",
  ],
  "8dbe517e": [
    "hero-property", "hero-globe", "hero-growth",
    "hero-protected", "hero-app", "hero-support",
  ],
};

/**
 * Which sheet each final file is cut from, for every name drawn more than once.
 *
 * A name absent from this map is drawn once, so there is nothing to choose.
 */
export const CANONICAL = {
  "beach-house": "ecfa9c34",
  "bungalow": "ecfa9c34",
  "calendar-check": "2676c1fc",
  "calendar-clock": "2676c1fc",
  "card-lock": "0b2e4d21",
  "chart-growth": "2676c1fc",
  "container-home": "ecfa9c34",
  "coworking-space": "2676c1fc",
  "doc-lock": "2676c1fc",
  "doc-shield": "2676c1fc",
  "duplex": "ecfa9c34",
  "farm-house": "ecfa9c34",
  "gift": "0b2e4d21",
  "gift-star": "2676c1fc",
  "home-check": "2676c1fc",
  "home-search": "b04429b0",
  "hotel": "ecfa9c34",
  "hotel-room": "2676c1fc",
  "hotel-star": "b04429b0",
  "house-boat": "ecfa9c34",
  "keys-home": "b04429b0",
  "lake-house": "ecfa9c34",
  "land-plot": "2676c1fc",
  "listing-search": "fda04dd1",
  "loft": "ecfa9c34",
  "luggage-plane": "b04429b0",
  "mansion": "ecfa9c34",
  "map-spot": "b04429b0",
  "modern-house": "ecfa9c34",
  "mountain-cabin": "ecfa9c34",
  "naira-hand": "fda04dd1",
  "penthouse": "ecfa9c34",
  "report-stats": "2676c1fc",
  "reviews": "2676c1fc",
  "shared-apartment": "ecfa9c34",
  "shield-check": "2676c1fc",
  "shield-home": "2676c1fc",
  "shield-lock": "2676c1fc",
  "shop-retail": "2676c1fc",
  "studio-apartment": "ecfa9c34",
  "tag-hash": "0b2e4d21",
  "tag-percent": "b04429b0",
  "terrace-house": "ecfa9c34",
  "tour-360": "b04429b0",
  "tree-house": "ecfa9c34",
  "twin-house": "ecfa9c34",
  "user-check": "2676c1fc",
  "villa": "ecfa9c34",
  "warehouse": "ecfa9c34",
  "wallet-secure": "0b2e4d21",
};

/**
 * Objects that exist but must not become a canonical file, and why.
 *
 * `hotel-sign` carries the word HOTEL as pixels and cannot be translated.
 * `shield-lock-alt` and `map-spot-alt` are second drawings of an object that is
 * already canonical elsewhere on the same sheet; they are named so the slice is
 * accounted for, not so anything uses them.
 */
export const WITHHELD = new Set(["hotel-sign", "shield-lock-alt", "map-spot-alt"]);

/** Sheets whose objects carry the light-theme artwork rather than the dark. */
export const LIGHT_SHEET = "c0f67033";

/** Sheets of wide hero scenes, written at source resolution and not squared. */
export const HERO_SHEETS = new Set(["7ee388e5", "8dbe517e"]);
