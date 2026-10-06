/**
 * What is on each of the founder's 6 October 2026 sheets, and what it is called.
 *
 * This file is DATA, read by `scripts/slice-tiered-sheets.mjs` and by
 * `scripts/contact-tiered-assets.mjs`. It is kept apart from the slicer for the
 * reason `icon-manifest.mjs` is: renaming an object, or rejecting one, is an
 * edit here and a rerun, never an edit to pixels.
 *
 * TWO TIERS, DECIDED BY WHAT THE OBJECT IS (D29), NOT BY ITS SIZE.
 *
 *   A  real things: Nigerian infrastructure, buildings, land. Rich, realistic.
 *   B  symbols: shield, bell, wallet, tick. Simple, matte, royal blue.
 *
 * HOW EACH SHEET ARRIVED, MEASURED RATHER THAN ASSUMED.
 *
 *   Tier B sheets are RGB with NO alpha channel. The light checkerboard that a
 *   viewer draws behind a transparent image is BAKED INTO THE PIXELS: it is fake
 *   transparency, 100 percent opaque, so the sheets cannot be used as they are and
 *   the slicer has to key the ground out of the colour (`keying: "checker"`).
 *
 *   Tier A sheets are RGBA with a real, soft matte (`keying: "alpha"`). Viewed with
 *   alpha ignored they look ragged on black, because the pixels in the transparent
 *   area still hold the generator's navy glow. Composited properly they are clean.
 *   The slicer trusts the alpha and then checks the fringe.
 *
 * `reject` is a statement about the artwork, with the reason. A rejected object is
 * still sliced (so it can be looked at and so the regeneration is comparable) but is
 * written to `rejected/` and never wired into a component. `noFile` skips the cut
 * altogether (the receipt is so pale the ground key cannot separate it).
 */

export const RAW_DIR = "docs/design/assets-raw/2026-10-06";
export const OUT_DIR = "apps/web/public/brand";

/** Canvas edges. 2x is the master; 1x is a resize of it, so the pair never disagree. */
export const TIERS = {
  /*
   * Tier B objects are about 280px at source and land at 256, so the 2x file is
   * a mild reduction and never a stretch. Fit 80 percent: 10 percent of air each
   * side, which is what a ground plate (radius 14, 4 percent fill) wants around
   * an object so its contact shadow has room.
   */
  b: { dir: "tier-b", edge2x: 256, fit: 0.8, quality: 90 },
  /*
   * Tier A objects are real things with detail (windows, keypads, foliage). Most
   * of the buildings are only 200 to 260px wide at source, so 320 at 2x is a mild
   * upscale for the widest, and the infrastructure objects (about 400px) are
   * reductions. Sized by the geometric mean of the box (70 percent of the canvas) and
   * capped at 90 percent on the longer edge, so a wide villa and a tall tower carry the
   * same visual weight; see `cutObject` in the slicer.
   */
  a: { dir: "tier-a", edge2x: 320, fit: 0.9, weight: 0.7, quality: 86 },
};

/**
 * Sheets. `cols` and `rows` are the declared grid: components of artwork are
 * assigned to a cell by their centroid, so the declaration is a statement about
 * the artwork (the slicer throws if a cell comes back empty or double-filled).
 *
 * `cluster: true` is for a sheet whose rows are not evenly pitched (the buildings
 * sheet: a 19px top margin, rows 156px apart); see `assignCells`.
 *
 * `edge2x` overrides the tier's canvas for one sheet where its source resolution
 * differs (buildings are small at source, scenes are large). The weight and the
 * padding share stay the tier's, so the optical size is unchanged.
 *
 * `names` run row by row. An entry is a string, or `{ name, reject }`.
 */
export const SHEETS = [
  {
    file: "24C172B9-653F-42CC-A28F-5444FFB3DF8E.png",
    tier: "b",
    keying: "checker",
    group: "success and reward",
    cols: 4,
    rows: 3,
    names: [
      "tick-circle", "trophy", "gift-box", "ticket",
      "key-cushion", "rosette", "burst-rays", "flag-pole",
      "cards-stack", "cards-stack-orange", "cards-stack-navy", "book-closed",
    ],
  },
  {
    file: "5BB888BE-68E0-43C9-878C-5014398FF2A0.png",
    tier: "b",
    keying: "checker",
    group: "actions and states",
    cols: 4,
    rows: 4,
    names: [
      "search-pin", "paper-plane", "bell", "calendar-page",
      "chat-pair", "bars-chart", "clipboard-list", "map-pin",
      "camera", "house-heart", "warning-triangle", "info-disc",
      "hourglass", "calendar-bolt", "key-ring", "key-ring-top",
    ],
  },
  {
    file: "A2F7A374-9727-422B-8AF7-C092CB891F5F.png",
    tier: "b",
    keying: "checker",
    group: "analytics, people, places",
    cols: 4,
    rows: 4,
    names: [
      "line-chart", "donut-chart", "progress-ring", "stars-arc",
      "headset", "robot", "brain-chip", "people-group",
      "globe", "globe-pin", "palm-island", "suitcase",
      "refresh-arrows", "doc-plus", "doc-search", "seal-plus",
    ],
  },
  {
    file: "E349A7B1-F7B5-4D9E-8AAD-B2B66296C1FE.png",
    tier: "b",
    keying: "checker",
    group: "money and trust",
    cols: 4,
    rows: 4,
    names: [
      "banknotes-stack",
      {
        name: "receipt-roll",
        /* The ground key reads a pale object as ground, so it is not cut at all. */
        noFile: true,
        reject:
          "Pale lavender-white paper on a white ground: its edge contrast on #F4F4F1 is about 1.1:1, below the 3:1 floor for a graphic object, so it vanishes on paper (the failure D29 names). It is also the one object on the sheet that is not royal blue.",
      },
      "shield-tick", "passport-book",
      "padlock",
      {
        name: "bank-card",
        reject:
          "Carries two overlapping orange and blue discs bottom right, which is a card-network mark in everything but name. D13 forbids a card artefact that looks like a debit or credit card or implies a card product, and Vallo issues none.",
      },
      "safe-dial", "scales",
      "wallet-angled", "wallet-folded", "wallet-card", "wallet-out",
      "wallet-plus", "banknote-fold", "book-bookmark", "sync-arrows",
    ],
  },
  {
    file: "AA72DEB9-116F-4E72-A5A6-8D1A9B184440.png",
    tier: "b",
    keying: "checker",
    group: "empty states",
    cols: 4,
    rows: 3,
    names: [
      "box-open", "birdcage", "lantern", "shelf-hook",
      "envelope", "cards-fan", "frame-empty", "cup-saucer",
      "scroll-unrolled", "watering-can", "basket", "door-open",
    ],
  },
  {
    file: "07772D5D-818D-4F27-B9B1-000E7A61A3DE.png",
    tier: "a",
    keying: "alpha",
    group: "Nigerian infrastructure",
    cols: 4,
    rows: 2,
    names: [
      "prepaid-meter", "water-tank", "inverter-battery", "generator",
      "borehole-pump", "estate-gate", "ceiling-fan", "moving-box",
    ],
  },
  {
    file: "D49CFD13-35D5-41A5-A7F9-958A72E441D5.png",
    tier: "a",
    keying: "alpha",
    group: "property buildings",
    /* Source buildings are only 160 to 290px wide, so 256 at 2x keeps every one a reduction or a hair over 1:1. */
    edge2x: 256,
    cluster: true,
    cols: 4,
    rows: 8,
    names: [
      "apartment-block",
      "family-house-gate",
      { name: "hotel-canopy", reject: "The word HOTEL is baked into the sign board. D29: no text in any asset, and Vallo ships in four languages." },
      "modern-house-glass",
      "office-tower",
      "retail-shop",
      "land-plot",
      { name: "restaurant-awning", reject: "The word RESTAURANT is baked into the sign board. D29: no text in any asset." },
      "villa-pool",
      "estate-entrance-barrier",
      "bungalow",
      "townhouse-twin",
      "terrace-row",
      "narrow-block",
      "house-hip-roof",
      "penthouse-terrace",
      "mansion-columns",
      "serviced-block",
      "brick-hall",
      "small-house",
      "midrise-block",
      { name: "guest-house", reject: "Reception sign carries baked lettering (RECEPTION). D29: no text in any asset." },
      "stilt-beach-house",
      "lake-house",
      "mountain-cabin",
      "tree-house",
      "house-boat",
      "farm-house",
      { name: "coworking-space", reject: "The word COWORKING is baked into the fascia. D29: no text in any asset." },
      { name: "office-suite", reject: "The words OFFICE SUITE are baked into the fascia. D29: no text in any asset." },
      { name: "shop-parade", reject: "The word SHOP is baked into the fascia. D29: no text in any asset. The blank-sign shop on row 2 (`retail-shop`) is the clean one." },
      "warehouse",
    ],
  },
  {
    file: "FCF6666C-F640-4636-B553-3B0BB18FDBFA.png",
    tier: "a",
    keying: "alpha",
    scene: true,
    /* Each scene is about 790px at source; a hero is drawn large, so it gets a hero canvas. */
    edge2x: 768,
    group: "hotel and house scenes (text free)",
    cols: 2,
    rows: 1,
    names: ["scene-hotel-bell", "scene-house-keys"],
  },
];

/**
 * Sheets that are looked at and filed but never sliced into objects, with why.
 * The three onboarding mockups are direction for the onboarding agent (B3).
 */
export const NOT_ASSETS = [
  {
    file: "3721E63D-5AED-4961-B93D-E408A71E1D44.png",
    why: "The same hotel and house scenes as FCF6666C, but the hotel board reads HOTEL. Superseded by the text-free FCF6666C. D29: no text in any asset.",
  },
  {
    file: "10F375AD-E0BF-40D8-9DB7-1BD156589A52.png",
    why: "Onboarding slide mockups, four dark slides. Direction for B3, not an asset sheet.",
  },
  {
    file: "A3C181AB-2629-445C-8372-F6C9CD2B9652.png",
    why: "Onboarding slide mockups, two dark slides (Find your space, Know what you are getting) with a glass map plate and a keys-and-tag still life. Direction for B3, not an asset sheet.",
  },
  {
    file: "F1AE17D2-4C76-4E9F-B86D-54255E2FC388.png",
    why: "Onboarding slide mockups in LIGHT, four phones. Direction for B3. Do not copy its copy: slide 3 shows 'Funds Held in Escrow' and invented figures, and slide 2 an invented passport id.",
  },
];

export function entry(item) {
  return typeof item === "string" ? { name: item } : item;
}
