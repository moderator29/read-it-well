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
 * stays `shield-check`. That is the whole point: most of the 87 objects the
 * platform draws today can be replaced by dropping a file in, with no call site
 * touched. The names that are new are new because the object is new.
 *
 * One name is stretched rather than invented, and it is worth saying which.
 * `2676C1FC` index 14 is a bare headset. The object it replaces, `support-chat`,
 * is a headset with a speech bubble. Calling the headset `support-chat` keeps
 * four live call sites working with no edit, and a headset alone is a fair
 * drawing of support. A bubble-and-headset object would be better and is a line
 * in the commission list in docs/archive/FRONTEND_REVAMP.md, not a reason to leave four
 * screens on the old artwork in the meantime.
 *
 * WHAT IS RECORDED AND NOT FIXED. `9795AD6E` index 23 is a hotel with the word
 * HOTEL rendered into the artwork as pixels. This platform ships `packages/i18n`
 * and text baked into an image cannot be translated, so that object is named
 * `hotel-sign` and is NOT canonical for anything. It is a recommendation in
 * docs/archive/FRONTEND_REVAMP.md, not a file to quietly use.
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
    "shield-check", "shield-home", "shield-lock", "support-chat", "doc-shield",
    "doc-lock", "user-check", "home-check", "reviews", "clock-check",
    "gift-star", "chart-growth", "report-stats", "calendar-check", "calendar-clock",
  ],

  /*
   * The transaction and status set. THIS IS THE ONE THAT IS GENUINELY NEW, and
   * the names on it are not invented here.
   *
   * `docs/BRAND_MARKS.md` section 3 is a standing commission: twenty four marks,
   * each with a name, the state it serves and a description of the object to
   * build. It exists because nothing in the 87 objects the platform draws
   * covers a payout, a refund, a receipt, a signed contract or a handover of
   * keys. THIS SHEET IS THAT COMMISSION, DELIVERED. Twenty three of the twenty
   * four are on it, and several match the written description object for
   * object: number nine is specified as "blue-banded strongbox with a naira
   * note half inside", and index 09 is a blue-banded strongbox with a naira
   * note half inside.
   *
   * So the names below are BRAND_MARKS' names rather than new ones. A document
   * that already specifies a name is the authority, and renaming a delivered
   * commission would strand the document that ordered it. Three deviations,
   * each deliberate:
   *
   *   `hourglass-blue` becomes `hourglass`. A colour does not belong in an
   *   object's name. The light twin of this object is not blue, and a name that
   *   asserts a colour goes stale the first time a theme changes.
   *
   *   `info-round` becomes `info`. The roundness is not the meaning.
   *
   *   `payment-pending`, number 3 on the list, is NOT on this sheet. Index 03
   *   is a plain naira coin, which is not a pending state, so it is named
   *   `coin-naira` rather than pressed into a role it does not play. Pending is
   *   covered twice over by `seal-pending` and `hourglass`, so this is a gap
   *   that needs no commission.
   *
   * ONE OF THESE MUST NOT BE USED. `escrow-hold` is index 09, and BRAND_MARKS
   * says of it: build it, do not ship it until escrow exists. Escrow does not
   * exist. `apps/web/src/lib/legal/terms.tsx` now says in as many words that
   * Vallo does not hold your money in escrow, so an escrow mark on a screen
   * would be the artwork contradicting the contract. It is cut and named so the
   * slice is accounted for, and it is in WITHHELD below so that nothing can
   * reach for it by accident.
   */
  "cf5a4150": [
    "payment-sent", "payment-received", "coin-naira", "payment-failed", "transfer-arrow",
    "wallet-plus", "wallet-out", "receipt-check", "escrow-hold", "savings-pot",
    "ledger-book", "seal-check", "seal-pending", "seal-cross", "hourglass",
    "progress-ring", "alert-triangle", "info", "clock-expired", "id-card-check",
    "doc-review", "doc-cross", "keys-handover", "contract-sign",
  ],

  /*
   * The light twin of the set above: the same 24 objects, under the same names,
   * in the same reading order, as frosted white glass on white. The two sheets wrap differently
   * (5,5,5,5,4 against 5,5,5,4,5), which is handled in the slicer, but index
   * for index they are the same object, so `cf5a4150[n]` and `c0f67033[n]`
   * are a pair.
   */
  "c0f67033": [
    "payment-sent", "payment-received", "coin-naira", "payment-failed", "transfer-arrow",
    "wallet-plus", "wallet-out", "receipt-check", "escrow-hold", "savings-pot",
    "ledger-book", "seal-check", "seal-pending", "seal-cross", "hourglass",
    "progress-ring", "alert-triangle", "info", "clock-expired", "id-card-check",
    "doc-review", "doc-cross", "keys-handover", "contract-sign",
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
 *
 * `escrow-hold` is a picture of money being held. Vallo holds nobody's money and
 * the terms now say so plainly, so shipping this object would be the artwork
 * contradicting the contract. See the long note on CF5A4150 above.
 *
 * `shield-lock-alt` and `map-spot-alt` are second drawings of an object that is
 * already canonical elsewhere on the same sheet; they are named so the slice is
 * accounted for, not so anything uses them.
 */
export const WITHHELD = new Set(["hotel-sign", "escrow-hold", "shield-lock-alt", "map-spot-alt"]);

/**
 * Objects cropped from the reference renders rather than sliced from a sheet.
 *
 * WHY A SECOND SOURCE EXISTS. `docs/DESIGN_DIRECTION.md` section 3.5 rules that
 * where a governing render uses a glass object the ten sheets do not carry, the
 * object is cropped from the render, keyed through this pipeline and filed here
 * under a lowercase-hyphen name, provided it carries no baked text. This map is
 * that filing. Each entry is the render's filename under
 * `docs/design/references/`, the region in that render's own pixels, and what
 * the object is, so the crop is reproducible by anyone with the render and
 * nobody has to eyeball a rectangle twice.
 *
 * THE REGIONS ARE THE LARGEST CLEAN BOX THE RENDER OFFERS. Every box stops
 * short of the nearest label, rim or neighbouring control. Where an object sits
 * above its own caption (the stays category tiles) the box is the glyph alone.
 * Nothing here contains a letter or a digit; the HOTEL-lettered building on
 * `2A49E2F7` and the Verve card on `7F96BE6C` are deliberately absent, as is the
 * onboarding coin whose motion rings run off the edge of both flanking cards.
 *
 * THESE ARE NOT ALL THE SAME SIZE, AND THE SIZE IS RECORDED HONESTLY. The wallet
 * and the hotel are around 190 and 250 pixels at source and survive 256 with
 * nothing lost. The profile tiles are about 84, the settings tiles about 56, the
 * landing rings and chips 36 to 48. Those are upsampled to the pack's 256 edge
 * by `name-icon-objects.mjs` and are soft at 96px on a 3x display. `native`
 * says the longer edge of the object at source so a call site can choose: a
 * ring drawn at 44 pixels belongs in a 24 to 48 slot, not in an empty state.
 *
 * THE RENDER GROUND IS NOT BLACK, which is why `cut-icon-ground.mjs` treats this
 * set differently from the sheets. See the note there.
 *
 * Order matters: `SHEETS.renders` below is derived from the key order, and the
 * slicer writes `01.png`, `02.png` in that order. Append, never reorder.
 */
export const RENDER_CROPS = {
  /* 6AF37222: the wallet home. */
  "wallet-naira": {
    render: "6AF37222-1D2E-4200-AB23-E55A24AE5E4F.png",
    box: { left: 614, top: 226, width: 182, height: 180 },
    native: 186,
    what: "The 3D glass wallet with the naira sign, from the balance card",
  },
  "send-plane-tile": {
    render: "6AF37222-1D2E-4200-AB23-E55A24AE5E4F.png",
    box: { left: 209, top: 606, width: 64, height: 64 },
    native: 52,
    what: "Paper plane on a rounded glass tile, the Send Money quick action",
  },
  "phone-tile": {
    render: "6AF37222-1D2E-4200-AB23-E55A24AE5E4F.png",
    box: { left: 371, top: 606, width: 64, height: 64 },
    native: 52,
    what: "Handset on a rounded glass tile, the airtime quick action",
  },
  "bill-tile": {
    render: "6AF37222-1D2E-4200-AB23-E55A24AE5E4F.png",
    box: { left: 527, top: 606, width: 64, height: 64 },
    native: 52,
    what: "Lined document on a rounded glass tile, the bills quick action",
  },

  /* FD3DFE84: the stays home. */
  "stays-hotel-palms": {
    render: "FD3DFE84-0D2F-4CC9-AEC7-5D438F97CD53.png",
    box: { left: 568, top: 198, width: 252, height: 180 },
    native: 252,
    what: "The hotel block between two palms on a glass slab, the Stays side's mark",
  },
  "hotel-bed": {
    render: "FD3DFE84-0D2F-4CC9-AEC7-5D438F97CD53.png",
    box: { left: 241, top: 481, width: 54, height: 54 },
    native: 42,
    what: "Double bed glyph, from the lit Hotels category tile (glyph only, above its caption)",
  },
  "apartment-block": {
    render: "FD3DFE84-0D2F-4CC9-AEC7-5D438F97CD53.png",
    box: { left: 366, top: 479, width: 56, height: 56 },
    native: 40,
    what: "Apartment block glyph, from the Apartments category tile",
  },
  "palm-tree": {
    render: "FD3DFE84-0D2F-4CC9-AEC7-5D438F97CD53.png",
    box: { left: 489, top: 479, width: 56, height: 56 },
    native: 38,
    what: "Palm glyph, from the Resorts category tile",
  },
  "guest-house": {
    render: "FD3DFE84-0D2F-4CC9-AEC7-5D438F97CD53.png",
    box: { left: 612, top: 479, width: 56, height: 56 },
    native: 38,
    what: "House with door glyph, from the Guest Houses category tile",
  },
  "serviced-block": {
    render: "FD3DFE84-0D2F-4CC9-AEC7-5D438F97CD53.png",
    box: { left: 736, top: 479, width: 56, height: 56 },
    native: 40,
    what: "Tower with wings glyph, from the Serviced Apartments category tile",
  },

  /* BCD39CA8: the side drawer. */
  "flip-coin": {
    render: "BCD39CA8-E92F-4E72-B4BA-7203AA2F93E7.png",
    box: { left: 222, top: 1132, width: 98, height: 98 },
    native: 86,
    what: "The two-faced glass coin with the bars mark, from the drawer's Flip Coin card",
  },

  /* 50E032EA: the profile. */
  "calendar-grid": {
    render: "50E032EA-4141-4237-88D5-01B3720D87B6.png",
    box: { left: 231, top: 657, width: 96, height: 96 },
    native: 84,
    what: "Calendar with a six-dot grid on a glass tile, the My Bookings row",
  },
  "bookmark-ribbon": {
    render: "50E032EA-4141-4237-88D5-01B3720D87B6.png",
    box: { left: 231, top: 781, width: 96, height: 96 },
    native: 84,
    what: "Bookmark ribbon on a glass tile, the Saved row",
  },
  "wallet-tile": {
    render: "50E032EA-4141-4237-88D5-01B3720D87B6.png",
    box: { left: 231, top: 906, width: 96, height: 96 },
    native: 84,
    what: "Outline wallet on a glass tile, the Wallet row",
  },
  "shield-check-tile": {
    render: "50E032EA-4141-4237-88D5-01B3720D87B6.png",
    box: { left: 231, top: 1031, width: 96, height: 96 },
    native: 84,
    what: "Shield with a tick on a glass tile, the Inspections row",
  },
  "role-switch-tile": {
    render: "50E032EA-4141-4237-88D5-01B3720D87B6.png",
    box: { left: 229, top: 1174, width: 84, height: 84 },
    native: 70,
    what: "Person with a swap arrow on a glass tile, the Switch role row",
  },

  /* 7F96BE6C: settings. */
  "person-card": {
    render: "7F96BE6C-BF8C-4413-BD58-25531B27D549.png",
    box: { left: 226, top: 433, width: 68, height: 68 },
    native: 56,
    what: "Person glyph on a glass tile, the Account Information row",
  },
  "bell-tile": {
    render: "7F96BE6C-BF8C-4413-BD58-25531B27D549.png",
    box: { left: 226, top: 513, width: 68, height: 68 },
    native: 56,
    what: "Bell glyph on a glass tile, the Notifications row",
  },
  "palette": {
    render: "7F96BE6C-BF8C-4413-BD58-25531B27D549.png",
    box: { left: 226, top: 672, width: 68, height: 68 },
    native: 56,
    what: "Painter's palette on a glass tile, the Appearance row",
  },
  "globe": {
    render: "7F96BE6C-BF8C-4413-BD58-25531B27D549.png",
    box: { left: 226, top: 752, width: 68, height: 68 },
    native: 56,
    what: "Globe on a glass tile, the Language row",
  },
  "headset": {
    render: "7F96BE6C-BF8C-4413-BD58-25531B27D549.png",
    box: { left: 226, top: 832, width: 68, height: 68 },
    native: 56,
    what: "Headset on a glass tile, the Help and Support row",
  },
  "card-tile": {
    render: "7F96BE6C-BF8C-4413-BD58-25531B27D549.png",
    box: { left: 226, top: 926, width: 68, height: 68 },
    native: 56,
    what: "Payment card on a glass tile, the Payment Methods header",
  },
  "bank-column": {
    render: "7F96BE6C-BF8C-4413-BD58-25531B27D549.png",
    box: { left: 241, top: 1126, width: 64, height: 64 },
    native: 52,
    what: "Bank portico on a glass tile, the bank account row",
  },

  /* GOVERNING-landing-desktop-hero: the four stats rings and the feature grid. */
  "home-ring": {
    render: "GOVERNING-landing-desktop-hero.png",
    box: { left: 496, top: 689, width: 60, height: 60 },
    native: 46,
    what: "House outline in a glowing ring, the Properties stat (also the grid's Buy)",
  },
  "people-ring": {
    render: "GOVERNING-landing-desktop-hero.png",
    box: { left: 711, top: 689, width: 60, height: 60 },
    native: 46,
    what: "Two people in a glowing ring, the Agents stat",
  },
  "city-ring": {
    render: "GOVERNING-landing-desktop-hero.png",
    box: { left: 929, top: 689, width: 60, height: 60 },
    native: 46,
    what: "Three towers in a glowing ring, the Cities stat",
  },
  "shield-ring": {
    render: "GOVERNING-landing-desktop-hero.png",
    box: { left: 1169, top: 689, width: 60, height: 60 },
    native: 46,
    what: "Shield with a tick in a glowing ring, the Verified stat",
  },
  "key-ring": {
    render: "GOVERNING-landing-desktop-hero.png",
    box: { left: 721, top: 811, width: 48, height: 48 },
    native: 36,
    what: "Key in a glowing ring, the grid's Rent",
  },
  "bed-ring": {
    render: "GOVERNING-landing-desktop-hero.png",
    box: { left: 890, top: 811, width: 48, height: 48 },
    native: 36,
    what: "Bed in a glowing ring, the grid's Stays",
  },
  "chart-ring": {
    render: "GOVERNING-landing-desktop-hero.png",
    box: { left: 1061, top: 811, width: 48, height: 48 },
    native: 36,
    what: "Rising line chart in a glowing ring, the grid's Invest",
  },
  "brain-ring": {
    render: "GOVERNING-landing-desktop-hero.png",
    box: { left: 1235, top: 811, width: 48, height: 48 },
    native: 36,
    what: "Brain in a glowing ring, the grid's AI Assistant",
  },
  "wallet-ring": {
    render: "GOVERNING-landing-desktop-hero.png",
    box: { left: 550, top: 911, width: 48, height: 48 },
    native: 36,
    what: "Wallet in a glowing ring, the grid's Wallet",
  },
  "calendar-ring": {
    render: "GOVERNING-landing-desktop-hero.png",
    box: { left: 721, top: 911, width: 48, height: 48 },
    native: 36,
    what: "Calendar with a tick in a glowing ring, the grid's Bookings",
  },
  "chat-ring": {
    render: "GOVERNING-landing-desktop-hero.png",
    box: { left: 890, top: 911, width: 48, height: 48 },
    native: 36,
    what: "Speech bubble in a glowing ring, the grid's Messaging",
  },
  "inspect-ring": {
    render: "GOVERNING-landing-desktop-hero.png",
    box: { left: 1061, top: 911, width: 48, height: 48 },
    native: 36,
    what: "Shield-framed lens in a glowing ring, the grid's Inspections",
  },
  "manage-ring": {
    render: "GOVERNING-landing-desktop-hero.png",
    box: { left: 1240, top: 911, width: 48, height: 48 },
    native: 36,
    what: "Gear cluster in a glowing ring, the grid's Management",
  },

  /* GOVERNING-landing-desktop-fullpage: the feature chips and the Discover step. */
  "brain-chip": {
    render: "GOVERNING-landing-desktop-fullpage.png",
    box: { left: 193, top: 473, width: 64, height: 60 },
    native: 40,
    what: "Brain on a soft glass chip, the AI Powered feature",
  },
  "wallet-chip": {
    render: "GOVERNING-landing-desktop-fullpage.png",
    box: { left: 308, top: 473, width: 64, height: 60 },
    native: 40,
    what: "Wallet on a soft glass chip, the Secure Wallet feature",
  },
  "globe-chip": {
    render: "GOVERNING-landing-desktop-fullpage.png",
    box: { left: 419, top: 473, width: 64, height: 60 },
    native: 40,
    what: "Globe on a soft glass chip, the One Platform feature",
  },
  "building-chip": {
    render: "GOVERNING-landing-desktop-fullpage.png",
    box: { left: 641, top: 473, width: 64, height: 60 },
    native: 40,
    what: "Building on a soft glass chip, the Property Management feature",
  },
  "search-ring": {
    render: "GOVERNING-landing-desktop-fullpage.png",
    box: { left: 38, top: 1033, width: 48, height: 48 },
    native: 36,
    what: "Magnifier in a glowing ring, the Discover step",
  },
};

/** The pseudo-sheet the render crops are filed under, in the slicer and the cutter. */
export const RENDER_SET = "renders";

/** Where the reference renders live, relative to the repository root. */
export const RENDER_DIR = "docs/design/references";

SHEETS[RENDER_SET] = Object.keys(RENDER_CROPS);

/** Sheets whose objects carry the light-theme artwork rather than the dark. */
export const LIGHT_SHEET = "c0f67033";

/** Sheets of wide hero scenes, written at source resolution and not squared. */
export const HERO_SHEETS = new Set(["7ee388e5", "8dbe517e"]);
