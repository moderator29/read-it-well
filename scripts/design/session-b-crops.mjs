/**
 * SESSION B'S CROPS FROM THE GOVERNING RENDERS, and the only script that cuts them.
 *
 * Run from the repository root:
 *
 *   node scripts/design/session-b-crops.mjs                 every surface
 *   node scripts/design/session-b-crops.mjs --surface inspection
 *
 * The founder's instruction of 22 September: where our own art does not look
 * exactly like the render, crop it from the render and use the crop, cleaned.
 * Output goes to apps/web/public/brand/session-b/<surface>/, and each surface
 * folder carries a SOURCES.md (render, box, treatment, display size).
 *
 * THE KEY. Objects are keyed to alpha with the method `scripts/cut-icon-ground.mjs`
 * documents for render crops (docs/ICON_SYSTEM.md, "Tier 1, continued"): fit a
 * plane per channel to a thin ring at the box edge (twice, dropping ring pixels
 * the first fit shows to be object), take how much of each pixel's BRIGHTEST
 * channel stands above that ground, scale all three channels by that one
 * fraction so the hue stays the render's, then key brightness to alpha between
 * a floor and a ceiling and unpremultiply. That file runs its whole pipeline on
 * import and exports nothing, so the few functions are restated here with the
 * same constants rather than imported; nothing in it is edited.
 *
 * ONE BLOCK PER SURFACE. Add your entries in your own block below, and keep
 * edits to your block (pull --rebase before touching the file).
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "apps/web/public/brand/session-b");

/* --------------------------------------------------- shared keying (restated) */

const CEIL = 210;
const RENDER_FLOOR = 12;
const RENDER_RING = 0.06;
const RENDER_RING_REJECT = 8;

function solvePlane(pts) {
  let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  const sv = [0, 0, 0], svx = [0, 0, 0], svy = [0, 0, 0];
  for (const { x, y, v } of pts) {
    n += 1; sx += x; sy += y; sxx += x * x; sxy += x * y; syy += y * y;
    for (let k = 0; k < 3; k += 1) {
      sv[k] += v[k]; svx[k] += v[k] * x; svy[k] += v[k] * y;
    }
  }
  const det =
    n * (sxx * syy - sxy * sxy) - sx * (sx * syy - sxy * sy) + sy * (sx * sxy - sxx * sy);
  const planes = [];
  for (let k = 0; k < 3; k += 1) {
    if (n === 0) { planes.push([0, 0, 0]); continue; }
    if (Math.abs(det) < 1e-9) { planes.push([sv[k] / n, 0, 0]); continue; }
    const a = (sv[k] * (sxx * syy - sxy * sxy) - sx * (svx[k] * syy - sxy * svy[k]) + sy * (svx[k] * sxy - sxx * svy[k])) / det;
    const b = (n * (svx[k] * syy - sxy * svy[k]) - sv[k] * (sx * syy - sxy * sy) + sy * (sx * svy[k] - svx[k] * sy)) / det;
    const cc = (n * (sxx * svy[k] - svx[k] * sxy) - sx * (sx * svy[k] - svx[k] * sy) + sv[k] * (sx * sxy - sxx * sy)) / det;
    planes.push([a, b, cc]);
  }
  return planes;
}

const planeAt = (planes, x, y) => planes.map(([a, b, cc]) => a + b * x + cc * y);

function fitGroundPlane(data, w, h, c) {
  const ring = Math.max(2, Math.round(Math.min(w, h) * RENDER_RING));
  const pts = [];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (x >= ring && x < w - ring && y >= ring && y < h - ring) continue;
      const p = (y * w + x) * c;
      pts.push({ x, y, v: [data[p], data[p + 1], data[p + 2]] });
    }
  }
  const first = solvePlane(pts);
  const kept = pts.filter(({ x, y, v }) => {
    const g = planeAt(first, x, y);
    return Math.max(v[0] - g[0], v[1] - g[1], v[2] - g[2]) <= RENDER_RING_REJECT;
  });
  return kept.length >= pts.length * 0.25 ? solvePlane(kept) : first;
}

/** Plane-fit ground subtraction, brightest-channel key, unpremultiplied. */
export function keyRender(data, w, h, c, floor = RENDER_FLOOR) {
  const planes = fitGroundPlane(data, w, h, c);
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const p = (y * w + x) * c;
      const q = (y * w + x) * 4;
      const r = data[p], g = data[p + 1], b = data[p + 2];
      const ground = planeAt(planes, x, y);
      const brightestIn = Math.max(r, g, b);
      const brightestFlat = Math.max(0, r - ground[0], g - ground[1], b - ground[2]);
      const scale = brightestIn > 0 ? Math.min(1, brightestFlat / brightestIn) : 0;
      const brightest = brightestIn * scale;
      let a = (brightest - floor) / (CEIL - floor);
      a = a <= 0 ? 0 : a >= 1 ? 1 : a;
      if (a === 0) { out[q] = 0; out[q + 1] = 0; out[q + 2] = 0; out[q + 3] = 0; continue; }
      const aOut = Math.max(a, brightest / 255);
      out[q] = Math.round((r * scale) / aOut);
      out[q + 1] = Math.round((g * scale) / aOut);
      out[q + 2] = Math.round((b * scale) / aOut);
      out[q + 3] = Math.round(aOut * 255);
    }
  }
  return out;
}

/**
 * Feather the alpha to zero over the outer `band` fraction of the box, so a
 * crop that had to sit close to its neighbours never shows the box's edge.
 */
export function featherEdges(rgba, w, h, band = 0.08) {
  const bx = Math.max(1, Math.round(w * band));
  const by = Math.max(1, Math.round(h * band));
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const d = Math.min(x / bx, (w - 1 - x) / bx, y / by, (h - 1 - y) / by, 1);
      const q = (y * w + x) * 4 + 3;
      rgba[q] = Math.round(rgba[q] * Math.max(0, d));
    }
  }
  return rgba;
}

/**
 * Cut one object: extract the box, key it, feather it, and write a WebP
 * with alpha at the source's own size. Never upscaled: a crop is only as
 * sharp as its box, and the script is the master, so no PNG is kept.
 */
async function cutObject(render, box, dest, { feather = 0.08, dayFloor = null } = {}) {
  const { data, info } = await sharp(render)
    .extract({ left: box[0], top: box[1], width: box[2], height: box[3] })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const write = async (floor, file) => {
    const keyed = featherEdges(
      keyRender(data, info.width, info.height, info.channels, floor),
      info.width,
      info.height,
      feather,
    );
    const img = sharp(keyed, { raw: { width: info.width, height: info.height, channels: 4 } });
    await img.webp({ quality: 90, alphaQuality: 100 }).toFile(`${file}.webp`);
  };
  await write(RENDER_FLOOR, dest);
  /* THE DAYLIGHT CUT. On paper the faint bloom a night key keeps reads as a
     smudge, not as light, so the day file lifts the floor until only the
     object and its near glow survive. Same box, same hue, no dark plate. */
  if (dayFloor !== null) await write(dayFloor, `${dest}-day`);
}

/* ============================================================ SURFACES */

const SURFACES = {};

/* ------------------------------------------------------------ inspection */
/*
 * Render: F6A8A482-657B-4836-B30A-1A0578BC3FBA.png (repo root), 1024x1536,
 * phone screen 668 image px wide. Boxes are [left, top, width, height] in
 * render px. See apps/web/public/brand/session-b/inspection/SOURCES.md.
 */
SURFACES.inspection = async () => {
  const render = path.join(ROOT, "F6A8A482-657B-4836-B30A-1A0578BC3FBA.png");
  const dir = path.join(OUT, "inspection");
  await mkdir(dir, { recursive: true });
  /* The glass house with the tick, beside the title. The box stops above the
     listing card's lit top edge, which runs under the house's foot. */
  await cutObject(render, [622, 196, 186, 140], path.join(dir, "house-check"), { feather: 0.03, dayFloor: 70 });
  /* The checklist's round plates are no longer cropped: keyed at 48 render
     px they came out dim against the panel, where the render draws lit
     discs. They are drawn in CSS to the render's measured size and light
     (inspection.css, .nf-ix-step__plate). */
};

/* ------------------------------------------------------------------ send */
/*
 * Render: 77A54EA3-BBB5-4BF4-B3A5-144C99CABAF7.png (repo root), 1024x1536,
 * phone screen 667 image px wide (1.71 image px per CSS px at 390). The round
 * glass plates at the left of the send form's rows, glyph included (line art,
 * no lettering). Only rows the product offers: Recipient, Amount, Narration,
 * and the shield of the reassurance card. NOT the Bank row (bank payouts do
 * not complete today), NOT the scan button (there is no scanner), NOT the
 * NDIC or 256 bit badges. The plate inside the lit Send Money button sits on
 * saturated blue, which this key cannot separate from its ground, so it is
 * drawn in CSS. See apps/web/public/brand/session-b/send/SOURCES.md.
 * (Wallet worker.)
 */
SURFACES.send = async () => {
  const render = path.join(ROOT, "77A54EA3-BBB5-4BF4-B3A5-144C99CABAF7.png");
  const dir = path.join(OUT, "send");
  await mkdir(dir, { recursive: true });
  const plates = {
    recipient: [228, 694],
    amount: [228, 874],
    note: [227, 1026],
    shield: [229, 1230],
  };
  for (const [name, [left, top]] of Object.entries(plates)) {
    await cutObject(render, [left, top, 64, 64], path.join(dir, `plate-${name}`), { feather: 0.04 });
  }
};

/* ======================================================================== */
/* roles: the platform identity pack (worker "identity")                     */
/* Governing: docs/design/references/roles/GOVERNING-01 to 12.               */
/* ======================================================================== */

/*
 * THE KEY IS THE SHARED PIPELINE'S OWN CODE, NOT A COPY OF IT.
 *
 * `scripts/cut-icon-ground.mjs` exports nothing and runs its whole cut over
 * `assets/brand-sliced` the moment it is imported, so an `import` would rewrite
 * `assets/brand-cut` as a side effect. Instead this reads that file's text and
 * evaluates only its keying section: from the FLOOR constant down to, and not
 * including, `cutOne`. That is `keyRender` (the two-pass plane fit of the ground
 * on a ring at the box edge, then the brightest-channel key with the hue kept
 * by scaling all three channels by one number), `dropEdgeStrays` and
 * `squareWithMargin`, byte for byte as the shared pack runs them. If the shared
 * file is ever restructured so these markers move, this throws rather than
 * silently keying with something else.
 */
function sharedKeying() {
  const src = readFileSync(path.join(ROOT, "scripts/cut-icon-ground.mjs"), "utf8");
  const from = src.indexOf("/** Below this, on its brightest channel");
  const to = src.indexOf("async function cutOne(");
  if (from < 0 || to < 0 || to <= from) {
    throw new Error("cut-icon-ground.mjs moved: the roles block cannot find the shared keying section");
  }
  const body = src.slice(from, to);
  // eslint-disable-next-line no-new-func
  return new Function(
    "Buffer",
    `${body}\nreturn { keyRender, dropEdgeStrays, squareWithMargin, RENDER_MARGIN, CEIL, RENDER_FLOOR };`,
  )(Buffer);
}

const ROLES_DIR = "docs/design/references/roles";
const R = {
  "01": "GOVERNING-01-switch-home-sheet-drawer.png",
  "02": "GOVERNING-02-add-workspace-chooser.png",
  "03": "GOVERNING-03-register-owner.png",
  "04": "GOVERNING-04-register-agent.png",
  "05": "GOVERNING-05-register-firm.png",
  "06": "GOVERNING-06-list-property-1-the-property.png",
  "07": "GOVERNING-07-list-property-2-light-water-media.png",
  "08": "GOVERNING-08-list-property-3-money-and-id.png",
  "09": "GOVERNING-09-stays-home-switch-and-doors.png",
  "10": "GOVERNING-10-set-up-hotel.png",
  "11": "GOVERNING-11-set-up-shortlet-and-restaurant.png",
  "12": "GOVERNING-12-review-desk-notification-search-by-id.png",
};

/*
 * THE OBJECTS. Box is left, top, width, height in the render's own pixels
 * (every roles render is 1536 x 1024; 10 is 1535). Each box stops short of the
 * card border, the caption and any neighbouring control, so its edge ring is
 * the render's surface and the plane fit reads ground, not object.
 *
 * Optional treatments, all applied to the render BEFORE the key:
 *   retouch  ellipses [cx, cy, rx, ry] or rects [x0, y0, x1, y1] rebuilt by a
 *            harmonic fill from the pixels around them (tick badges that
 *            overlap an object, lettering on a sign).
 *   keep     an ellipse [cx, cy, rx, ry] outside which alpha fades to zero
 *            over 4 px; only used where the ground is a drawn map whose
 *            street lines would otherwise survive the key.
 *   clip     alpha below this (0 to 255) is dropped after the key, then the
 *            stray pass runs again; same purpose as `keep`.
 */
const ROLES_OBJECTS = [
  /* 01: home, switch sheet, drawer */
  { name: "home-buy-tile", r: "01", box: [77, 387, 75, 76], what: "House glyph on a lit glass tile, the home Buy quick tile", screen: "01 home" },
  { name: "home-rent-tile", r: "01", box: [159, 387, 75, 76], what: "Key glyph on a lit glass tile, the home Rent quick tile", screen: "01 home" },
  { name: "home-manage-tile", r: "01", box: [241, 387, 75, 76], what: "Building glyph on a lit glass tile, the home Manage quick tile", screen: "01 home" },
  { name: "home-invest-tile", r: "01", box: [405, 387, 75, 76], what: "Rising chart glyph on a lit glass tile, the home Invest quick tile", screen: "01 home" },
  { name: "switch-owner-orb", r: "01", box: [1080, 582, 74, 74], what: "House glyph in a glass orb, the Owner workspace (drawer Switch profile row; the sheet's Owner row draws the same orb smaller)", screen: "01 sheet, 01 drawer" },
  { name: "switch-agent-orb", r: "01", box: [578, 497, 62, 64], what: "Key glyph in a glass orb, the Agent workspace row", screen: "01 sheet" },
  { name: "switch-firm-orb", r: "01", box: [578, 587, 62, 64], what: "Building glyph in a glass orb, the firm workspace row", screen: "01 sheet" },
  { name: "switch-add-orb", r: "01", box: [578, 708, 62, 64], what: "Plus in a glass orb, Add a workspace (05 team and 09 sheet draw the same orb)", screen: "01 sheet, 05, 09" },

  /* 02: add a workspace, what we will ask */
  { name: "door-owner-house", r: "02", box: [112, 294, 114, 110], what: "3D glass house on its glass tile, the I own the property door", screen: "02 chooser" },
  { name: "door-agent-key", r: "02", box: [114, 446, 108, 96], what: "3D glass key on its glass tile, the I am an agent door", screen: "02 chooser" },
  { name: "door-firm-building", r: "02", box: [114, 583, 112, 104], what: "3D glass office block on its glass tile, the registered firm door", screen: "02 chooser" },
  { name: "ask-person-tile", r: "02", box: [1078, 303, 84, 86], what: "Person glyph on a glass tile, Who you are", screen: "02 what we will ask" },
  { name: "ask-pin-tile", r: "02", box: [1078, 439, 84, 86], what: "Map pin on a glass tile, Where the property is", screen: "02 what we will ask" },
  { name: "ask-doc-shield-tile", r: "02", box: [1078, 573, 84, 86], what: "Document with a shield on a glass tile, What proves it is yours", screen: "02 what we will ask" },
  { name: "ask-clock-tile", r: "02", box: [1077, 711, 54, 56], what: "Clock on a small glass tile, About five minutes", screen: "02 what we will ask" },

  /* 03: owner registration */
  { name: "owner-house-orb", r: "03", box: [282, 146, 76, 78], what: "House glyph in a lit glass orb, the owner registration header", screen: "03 about you" },
  { name: "owner-shield-tile", r: "03", box: [56, 585, 56, 62], what: "Split shield on a glass tile, We check who you are", screen: "03 about you" },
  { name: "owner-map-pin", r: "03", box: [552, 336, 54, 62], keep: [579, 367, 22, 29], what: "Glass map pin, drawn over the map", screen: "03 where do you own" },
  { name: "doc-certificate-orb", r: "03", box: [810, 284, 52, 52], what: "Document glyph in a glass orb, Certificate of Occupancy (Deed and I have none of these draw the same)", screen: "03 proof of ownership" },
  { name: "doc-consent-orb", r: "03", box: [810, 400, 52, 52], what: "Document with a seal in a glass orb, Governor's consent", screen: "03 proof of ownership" },
  { name: "doc-survey-orb", r: "03", box: [810, 457, 52, 52], what: "Plan sheet in a glass orb, Survey plan", screen: "03 proof of ownership" },
  { name: "doc-utility-orb", r: "03", box: [810, 513, 52, 52], what: "Bill sheet in a glass orb, Utility bill in your name", screen: "03 proof of ownership" },
  { name: "ownership-proof-orb", r: "03", box: [1043, 148, 72, 72], what: "House outline with a key in a dark glass orb, the proof of ownership header", screen: "03 proof of ownership" },
  { name: "info-orb", r: "03", box: [816, 666, 40, 40], what: "Lit round info glyph, the calm info panel", screen: "03, 04, 05, 08 info panels" },
  { name: "owner-set-up-house", r: "03", box: [1228, 222, 212, 168], what: "3D glass house with a tick badge on a glowing plinth, You are set up as an owner", screen: "03 submitted" },

  /* 04: agent registration */
  { name: "agent-id-card", r: "04", box: [459, 360, 94, 90], what: "3D glass ID card, Take a photo of your ID", screen: "04 prove who you are" },
  { name: "agent-selfie-orb", r: "04", box: [462, 495, 88, 92], what: "Person in a lit glass orb, Take a selfie", screen: "04 prove who you are" },
  { name: "agent-key-plinth", r: "04", box: [1210, 240, 228, 150], what: "3D glass key on a glass plinth, We are checking your details", screen: "04 submitted" },

  /* 05: firm registration */
  { name: "firm-building-plinth", r: "05", box: [1200, 280, 248, 178], what: "3D glass office block on a glowing plinth (05 screen 1 draws the same smaller)", screen: "05 your firm, 05 under review" },
  { name: "firm-letter", r: "05", box: [446, 311, 88, 88], what: "3D glass letter on a stand, Upload a letter from your principal", screen: "05 prove you work here" },
  { name: "firm-stamp", r: "05", box: [448, 452, 82, 94], what: "3D glass rubber stamp, Have your principal confirm you", screen: "05 prove you work here" },

  /* 06: listing wizard, the property */
  { name: "list-rent-house", r: "06", box: [60, 278, 90, 94], retouch: [[140, 289, 13, 13]], what: "3D glass house on a plinth, To rent (tick badge retouched out)", screen: "06 what are you listing" },
  { name: "list-sale-sign", r: "06", box: [176, 282, 82, 86], retouch: [[206, 318, 238, 333], [216, 334, 227, 344]], what: "3D glass for-sale sign on a plinth, For sale (the lettering on the board retouched blank)", screen: "06 what are you listing" },
  { name: "list-land-plot", r: "06", box: [279, 280, 84, 90], what: "Glass land plot with a tree, Land", screen: "06 what are you listing" },
  { name: "type-flat", r: "06", box: [66, 508, 70, 72], what: "Glass apartment block, Flat", screen: "06 property type" },
  { name: "type-duplex", r: "06", box: [178, 508, 70, 72], what: "Glass two-storey house, Duplex", screen: "06 property type" },
  { name: "type-bungalow", r: "06", box: [287, 510, 70, 72], what: "Glass bungalow, Bungalow", screen: "06 property type" },
  { name: "type-self-contain", r: "06", box: [68, 638, 70, 70], what: "Glass small house, Self contain", screen: "06 property type" },
  { name: "type-shop", r: "06", box: [176, 645, 70, 68], what: "Glass shop front with an awning, Shop", screen: "06 property type" },
  { name: "type-office", r: "06", box: [288, 648, 70, 68], what: "Glass office block, Office", screen: "06 property type" },
  { name: "room-bedrooms", r: "06", box: [806, 258, 56, 58], what: "Bed glyph on a soft glass tile, Bedrooms", screen: "06 the rooms" },
  { name: "room-bathrooms", r: "06", box: [806, 343, 56, 60], what: "Shower glyph on a soft glass tile, Bathrooms", screen: "06 the rooms" },
  { name: "room-toilets", r: "06", box: [806, 425, 56, 60], what: "Toilet glyph on a soft glass tile, Toilets", screen: "06 the rooms" },
  { name: "room-size", r: "06", box: [806, 512, 56, 66], what: "Measured square glyph on a soft glass tile, Size", screen: "06 the rooms" },
  { name: "room-furnishing", r: "06", box: [806, 616, 56, 64], what: "Sofa glyph on a soft glass tile, Furnishing", screen: "06 the rooms" },
  { name: "room-floor", r: "06", box: [806, 712, 56, 62], what: "Stair glyph on a soft glass tile, Floor", screen: "06 the rooms" },
  { name: "condition-fair", r: "06", box: [1182, 312, 56, 56], what: "House glyph in a glass orb, Fair condition", screen: "06 condition" },
  { name: "condition-good", r: "06", box: [1352, 312, 74, 58], what: "Glass house, Good condition", screen: "06 condition" },
  { name: "condition-new", r: "06", box: [1182, 444, 58, 62], what: "Glass house with a bow, New", screen: "06 condition" },
  { name: "condition-off-plan", r: "06", box: [1352, 444, 76, 62], what: "Glass tower crane, Off plan", screen: "06 condition" },

  /* 07: light, water, amenities, media */
  { name: "light-bulb-plinth", r: "07", box: [282, 152, 94, 114], what: "3D glass light bulb on a plinth, the Light step header", screen: "07 light" },
  { name: "power-sun", r: "07", box: [64, 306, 42, 42], what: "Sun glyph, 24 hours", screen: "07 light" },
  { name: "power-clock-orb", r: "07", box: [228, 306, 42, 42], what: "Alarm clock in a glass orb, 16 to 20 hours (8 to 12 draws the same)", screen: "07 light" },
  { name: "none-orb", r: "07", box: [228, 411, 42, 42], what: "Prohibition circle in a glass orb, Less than 8 hours, None, No running water", screen: "07 light, 07 water" },
  { name: "power-inverter", r: "07", box: [64, 642, 42, 42], what: "Inverter glyph, Inverter", screen: "07 light" },
  { name: "power-solar", r: "07", box: [229, 643, 44, 40], what: "Solar panel glyph, Solar", screen: "07 light" },
  { name: "water-drop-plinth", r: "07", box: [650, 162, 94, 90], what: "3D glass water drop on a plinth, the Water step header", screen: "07 water" },
  { name: "water-borehole", r: "07", box: [604, 324, 54, 52], what: "Borehole pump on a base, Borehole (water source)", screen: "07 water" },
  { name: "water-well", r: "07", box: [444, 440, 50, 50], what: "Well with a bucket, Well", screen: "07 water" },
  { name: "amenity-parking", r: "07", box: [818, 280, 60, 46], what: "Car glyph, Parking", screen: "07 amenities" },
  { name: "amenity-security", r: "07", box: [934, 278, 48, 50], what: "Shield glyph, Security", screen: "07 amenities" },
  { name: "amenity-water-heater", r: "07", box: [1044, 278, 46, 50], what: "Water heater glyph, Water heater", screen: "07 amenities" },
  { name: "amenity-air-conditioning", r: "07", box: [818, 388, 60, 40], what: "Split unit glyph, Air conditioning", screen: "07 amenities" },
  { name: "amenity-wifi", r: "07", box: [928, 384, 52, 48], what: "Wi-Fi glyph, WiFi", screen: "07 amenities" },
  { name: "amenity-fitted-kitchen", r: "07", box: [1036, 382, 52, 50], what: "Cooker glyph, Fitted kitchen", screen: "07 amenities" },
  { name: "amenity-wardrobe", r: "07", box: [826, 488, 44, 50], what: "Wardrobe glyph, Wardrobe", screen: "07 amenities" },
  { name: "amenity-balcony", r: "07", box: [930, 488, 50, 50], what: "Balcony glyph, Balcony", screen: "07 amenities" },
  { name: "amenity-gated-estate", r: "07", box: [1036, 490, 54, 48], what: "Gate glyph, Gated estate", screen: "07 amenities" },
  { name: "amenity-borehole", r: "07", box: [828, 596, 44, 50], what: "Wellhead glyph, Borehole (amenity)", screen: "07 amenities" },
  { name: "amenity-generator", r: "07", box: [928, 600, 52, 46], what: "Generator glyph, Generator (the backup power row draws the same smaller)", screen: "07 amenities, 07 light" },
  { name: "amenity-running-water", r: "07", box: [1040, 596, 52, 48], what: "Tap glyph, Running water (Treated mains draws the same tap)", screen: "07 amenities, 07 water" },
  { name: "amenity-pop-ceiling", r: "07", box: [818, 700, 60, 42], what: "Recessed ceiling glyph, POP ceiling", screen: "07 amenities" },
  { name: "amenity-tiled-floor", r: "07", box: [926, 704, 56, 42], what: "Floor tiles glyph, Tiled floor", screen: "07 amenities" },
  { name: "amenity-garden", r: "07", box: [1046, 698, 42, 52], what: "Potted plant glyph, Garden", screen: "07 amenities" },
  { name: "media-camera-plinth", r: "07", box: [1444, 166, 54, 66], what: "Glass camera on a small plinth, the Photos step header", screen: "07 photos" },
  { name: "media-video-tile", r: "07", box: [1188, 606, 48, 52], what: "Film strip glyph on a glass tile, Video walkthrough", screen: "07 photos" },

  /* 08: money and the listing ID */
  { name: "price-rent-house", r: "08", box: [436, 292, 52, 52], what: "House glyph on a soft glass tile, Rent (annual)", screen: "08 what a tenant pays" },
  { name: "price-agency-person", r: "08", box: [436, 367, 52, 48], what: "Person at a desk glyph on a soft glass tile, Agency fee", screen: "08 what a tenant pays" },
  { name: "price-legal-doc", r: "08", box: [436, 440, 52, 52], what: "Document and pen glyph on a soft glass tile, Legal fee", screen: "08 what a tenant pays" },
  { name: "price-caution-shield", r: "08", box: [436, 514, 52, 52], what: "Shield glyph on a soft glass tile, Caution deposit", screen: "08 what a tenant pays" },
  { name: "price-service-gear", r: "08", box: [436, 594, 52, 52], what: "Gear glyph on a soft glass tile, Service charge", screen: "08 what a tenant pays" },
  { name: "price-total-coins", r: "08", box: [437, 682, 64, 68], what: "Stacked coins on a glass tile, Total to move in", screen: "08 what a tenant pays" },
  { name: "review-sent-house", r: "08", box: [1238, 168, 186, 146], what: "3D glass house with a tick badge on a glowing plinth, Sent for review", screen: "08 listing ID" },

  /* 09: stays home, sheet, doors */
  { name: "stays-hotels-bed", r: "09", box: [76, 472, 94, 74], what: "3D glass bed on a plinth, Hotels", screen: "09 stays home" },
  { name: "stays-shortlets-house", r: "09", box: [248, 470, 94, 72], what: "3D glass house on a plinth, Shortlets", screen: "09 stays home" },
  { name: "stays-restaurants-cloche", r: "09", box: [82, 604, 90, 74], what: "3D glass cloche on a plinth, Restaurants", screen: "09 stays home" },
  { name: "stays-nearby-pin", r: "09", box: [258, 604, 76, 74], what: "3D glass map pin on a plinth, Nearby (06 where is it draws the same pin on its disc, over the map, where it cannot be keyed clean)", screen: "09 stays home, 06 where is it" },
  { name: "stays-switch-person-orb", r: "09", box: [434, 292, 70, 70], what: "Person in a glass orb, Personal (stays sheet)", screen: "09 switch profile" },
  { name: "stays-switch-hotel-orb", r: "09", box: [434, 396, 70, 70], what: "Hotel block in a glass orb, a hotel workspace", screen: "09 switch profile" },
  { name: "stays-door-hotel", r: "09", box: [806, 280, 92, 94], what: "Glass hotel block in a glass orb, We are a hotel", screen: "09 stays doors" },
  { name: "stays-door-shortlet", r: "09", box: [806, 402, 92, 94], what: "Glass bed in a glass orb, I run a shortlet", screen: "09 stays doors" },
  { name: "stays-door-restaurant", r: "09", box: [806, 524, 92, 94], what: "Glass cloche in a glass orb, We are a restaurant", screen: "09 stays doors" },

  /* 10: hotel setup */
  { name: "facility-pool", r: "10", box: [1192, 278, 52, 42], what: "Pool ladder glyph, Pool", screen: "10 facilities" },
  { name: "facility-gym", r: "10", box: [1302, 278, 54, 40], what: "Dumbbell glyph, Gym", screen: "10 facilities" },
  { name: "facility-parking", r: "10", box: [1413, 278, 52, 42], what: "Car glyph, Parking (hotel)", screen: "10 facilities" },
  { name: "facility-restaurant", r: "10", box: [1199, 364, 38, 48], what: "Fork and knife glyph, Restaurant", screen: "10 facilities" },
  { name: "facility-airport-shuttle", r: "10", box: [1305, 366, 50, 46], what: "Minibus glyph, Airport shuttle", screen: "10 facilities" },
  { name: "facility-generator", r: "10", box: [1416, 366, 46, 46], what: "Generator with a bolt glyph, Generator (hotel)", screen: "10 facilities" },
  { name: "facility-wifi", r: "10", box: [1214, 457, 54, 44], what: "Wi-Fi glyph, WiFi (hotel)", screen: "10 facilities" },
  { name: "facility-air-conditioning", r: "10", box: [1382, 456, 46, 46], what: "Snowflake glyph, Air conditioning (hotel)", screen: "10 facilities" },
  { name: "add-tile", r: "10", box: [443, 556, 44, 44], what: "Plus on a small glass tile, Add a room type", screen: "10 room types" },

  /* 11: shortlet and restaurant */
  { name: "shortlet-entire-flat", r: "11", box: [86, 186, 66, 64], retouch: [[154, 200, 11, 11]], what: "Glass apartment block on a plinth, Entire flat (tick badge retouched out)", screen: "11 your place" },
  { name: "shortlet-whole-house", r: "11", box: [196, 188, 62, 60], what: "Glass house on a plinth, Whole house", screen: "11 your place" },
  { name: "shortlet-private-room", r: "11", box: [293, 188, 62, 60], what: "Glass object on a plinth captioned Private room; the render drew a car", screen: "11 your place" },
  { name: "restaurant-plate-orb", r: "11", box: [812, 108, 110, 106], what: "Plate, fork and knife before a glass cloche, Your restaurant header", screen: "11 your restaurant" },

  /* 12: review desk and notification centre */
  { name: "notify-listing-live", r: "12", box: [813, 261, 54, 54], what: "House on a lit glass tile, Your listing is live", screen: "12 notification centre" },
  { name: "notify-message", r: "12", box: [813, 345, 54, 54], what: "Speech bubble on a glass tile, New message", screen: "12 notification centre" },
  { name: "notify-viewed", r: "12", box: [813, 416, 54, 54], what: "Eye on a glass tile, Your listing was viewed", screen: "12 notification centre" },
  { name: "notify-approved", r: "12", box: [813, 486, 54, 54], what: "Tick in a ring on an emerald glass tile, Listing approved", screen: "12 notification centre" },
  { name: "notify-reminder", r: "12", box: [813, 553, 54, 54], what: "Bell on a glass tile, Reminder", screen: "12 notification centre" },
  { name: "notify-follower", r: "12", box: [813, 619, 54, 54], what: "Person on a glass tile, New follower", screen: "12 notification centre" },
  { name: "notify-system", r: "12", box: [813, 750, 54, 54], what: "Info glyph on a glass tile, System update", screen: "12 notification centre" },
  { name: "admin-avatar-orb", r: "12", box: [307, 96, 40, 42], what: "Person in a glass orb, the review desk's admin chip", screen: "12 review queue" },
];

/* The one stage: cut WITH its night ground and feathered, never keyed. */
const ROLES_STAGES = [
  {
    name: "hotel-scene",
    r: "10",
    box: [55, 256, 310, 122],
    feather: { left: 34, right: 34, top: 18, bottom: 14 },
    /* three small lettering-like panels on the facade and over the door, blanked */
    retouch: [[161, 276, 181, 287], [201, 273, 224, 284], [214, 334, 228, 341]],
    what: "The glowing glass hotel before its palms and pool at night, Your hotel header (09 draws the same scene smaller). Three small lettering-like panels on the facade retouched blank",
    screen: "10 your hotel, 09 set up a hotel",
  },
];

/** Harmonic fill of masked pixels, on a float RGB copy of the render. */
function rolesRetouch(px, w, h, shapes) {
  const mask = new Uint8Array(w * h);
  for (const s of shapes) {
    if (s.rect) {
      const [x0, y0, x1, y1] = s.rect;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) mask[y * w + x] = 1;
    } else {
      const [cx, cy, rx, ry] = s.ellipse;
      for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) {
        for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
          if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) mask[y * w + x] = 1;
        }
      }
    }
  }
  const idx = [];
  for (let i = 0; i < mask.length; i++) if (mask[i]) idx.push(i);
  const sum = [0, 0, 0];
  let n = 0;
  for (const i of idx) {
    for (const j of [i - 1, i + 1, i - w, i + w]) {
      if (!mask[j]) {
        for (let k = 0; k < 3; k++) sum[k] += px[j * 3 + k];
        n++;
      }
    }
  }
  for (const i of idx) for (let k = 0; k < 3; k++) px[i * 3 + k] = sum[k] / Math.max(1, n);
  for (let p = 0; p < 2000; p++) {
    for (const i of idx) {
      for (let k = 0; k < 3; k++) {
        px[i * 3 + k] = (px[(i - 1) * 3 + k] + px[(i + 1) * 3 + k] + px[(i - w) * 3 + k] + px[(i + w) * 3 + k]) / 4;
      }
    }
  }
}

/** Retouch shapes are [cx, cy, rx, ry] (an ellipse, rx < cx) or [x0, y0, x1, y1] (a rect, x1 > x0). */
function rolesShapes(list) {
  return (list ?? []).map((s) => (s[2] > s[0] ? { rect: s } : { ellipse: s }));
}

/*
 * THE PAPER RENDITION. A night object keyed for a dark ground goes green and
 * washed on white, and its faint outer bloom shows as a pale square, so every
 * roles object also ships a `-day` file for the light theme, from the same
 * key: bloom below alpha 50 is dropped, and each pixel is re-inked on the brand
 * ramp by how lit it was, from #9CC2FF (the glass body) to #06379A (the
 * brightest edges). The object then reads as blue glass drawn on paper and
 * sits on the pale icon tile of docs/design/GLOW_IDENTITY.md section 4, never
 * on a dark plate. A derived rendition, not commissioned light artwork.
 */
const ROLES_DAY_BODY = [156, 194, 255];
const ROLES_DAY_EDGE = [6, 55, 154];
const ROLES_DAY_FLOOR = 50;
function rolesDay(rgba) {
  const out = Buffer.alloc(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3];
    if (a < ROLES_DAY_FLOOR) continue;
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
    const lit = Math.min(1, (Math.min(r, g) / 255) * 1.2 + (Math.max(r, g, b) / 255) * 0.35);
    for (let k = 0; k < 3; k++) out[i + k] = Math.round(ROLES_DAY_BODY[k] + (ROLES_DAY_EDGE[k] - ROLES_DAY_BODY[k]) * lit);
    out[i + 3] = Math.min(255, Math.round(((a - ROLES_DAY_FLOOR) / (255 - ROLES_DAY_FLOOR)) * 255 * 1.1));
  }
  return out;
}

async function rolesLoad(file) {
  const { data, info } = await sharp(path.join(ROOT, ROLES_DIR, file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, px: Float32Array.from(data) };
}

function rolesExtract(img, [left, top, width, height]) {
  const out = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const s = ((top + y) * img.w + left + x) * 3;
      const d = (y * width + x) * 3;
      for (let k = 0; k < 3; k++) out[d + k] = Math.max(0, Math.min(255, Math.round(img.px[s + k])));
    }
  }
  return out;
}

SURFACES.roles = async function roles() {
  const K = sharedKeying();
  const dir = path.join(OUT, "roles");
  mkdirSync(dir, { recursive: true });
  const cache = new Map();
  const rows = [];

  /* `--stages-only` re-cuts the stage without re-keying the objects. */
  for (const o of process.argv.includes("--stages-only") ? [] : ROLES_OBJECTS) {
    const file = R[o.r];
    const key = `${file}|${JSON.stringify(o.retouch ?? [])}`;
    if (!cache.has(key)) {
      const img = await rolesLoad(file);
      if (o.retouch) rolesRetouch(img.px, img.w, img.h, rolesShapes(o.retouch));
      cache.set(key, img);
    }
    const img = cache.get(key);
    const [left, top, width, height] = o.box;
    const rgb = rolesExtract(img, o.box);
    const keyed = K.keyRender(rgb, width, height, 3);
    if (o.keep) {
      const [cx, cy, rx, ry] = o.keep;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const d = Math.sqrt(((left + x - cx) / rx) ** 2 + ((top + y - cy) / ry) ** 2);
          const f = d <= 1 ? 1 : Math.max(0, 1 - ((d - 1) * Math.min(rx, ry)) / 4);
          const q = (y * width + x) * 4 + 3;
          keyed[q] = Math.round(keyed[q] * f);
        }
      }
    }
    if (o.clip) for (let q = 3; q < keyed.length; q += 4) if (keyed[q] < o.clip) keyed[q] = 0;
    K.dropEdgeStrays(keyed, width, height);
    const { data: sq, edge } = K.squareWithMargin(keyed, width, height);
    const raw = { raw: { width: edge, height: edge, channels: 4 } };
    await sharp(sq, raw).png({ compressionLevel: 9 }).toFile(path.join(dir, `${o.name}.png`));
    await sharp(sq, raw).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(path.join(dir, `${o.name}.webp`));
    const big = sharp(sq, raw).resize(256, 256, { kernel: "lanczos3" });
    await big.clone().png({ compressionLevel: 9 }).toFile(path.join(dir, `${o.name}-256.png`));
    await big.clone().webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(path.join(dir, `${o.name}-256.webp`));
    const day = rolesDay(sq);
    await sharp(day, raw).png({ compressionLevel: 9 }).toFile(path.join(dir, `${o.name}-day.png`));
    await sharp(day, raw).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(path.join(dir, `${o.name}-day.webp`));
    const bigDay = sharp(day, raw).resize(256, 256, { kernel: "lanczos3" });
    await bigDay.clone().png({ compressionLevel: 9 }).toFile(path.join(dir, `${o.name}-day-256.png`));
    await bigDay.clone().webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(path.join(dir, `${o.name}-day-256.webp`));
    rows.push({ ...o, file, edge, native: Math.max(width, height) });
  }

  const stageRows = [];
  for (const s of ROLES_STAGES) {
    const img = await rolesLoad(R[s.r]);
    if (s.retouch) rolesRetouch(img.px, img.w, img.h, rolesShapes(s.retouch));
    const [left, top, width, height] = s.box;
    const out = Buffer.alloc(width * height * 4);
    const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const si = ((top + y) * img.w + left + x) * 3;
        const di = (y * width + x) * 4;
        const a =
          smooth(x / s.feather.left) *
          smooth((width - 1 - x) / s.feather.right) *
          smooth(y / s.feather.top) *
          smooth((height - 1 - y) / s.feather.bottom);
        for (let k = 0; k < 3; k++) out[di + k] = Math.round(img.px[si + k]);
        out[di + 3] = Math.round(a * 255);
      }
    }
    const raw = { raw: { width, height, channels: 4 } };
    await sharp(out, raw).png({ compressionLevel: 9 }).toFile(path.join(dir, `${s.name}.png`));
    await sharp(out, raw).webp({ quality: 90, alphaQuality: 90, effort: 6 }).toFile(path.join(dir, `${s.name}.webp`));
    stageRows.push({ ...s, file: R[s.r] });
  }

  if (rows.length) writeFileSync(path.join(dir, "SOURCES.md"), rolesSources(rows, stageRows));
};

function rolesSources(rows, stageRows) {
  const table = rows
    .map(
      (o) =>
        `| \`${o.name}\` | \`${o.file.slice(0, 12)}\` | ${o.box.join(", ")} | ${o.native} | ${o.edge} | ${o.screen} | ${o.what} |`,
    )
    .join("\n");
  const manifest = rows
    .map(
      (o) =>
        `  "${o.name}": {\n    render: "roles/${o.file}",\n    box: { left: ${o.box[0]}, top: ${o.box[1]}, width: ${o.box[2]}, height: ${o.box[3]} },\n    native: ${o.native},\n    what: "${o.what.replace(/"/g, '\\"')}",\n  },`,
    )
    .join("\n");
  const stages = stageRows
    .map((s) => `| \`${s.name}\` | \`${s.file.slice(0, 12)}\` | ${s.box.join(", ")} | ${s.box[2]} x ${s.box[3]} | ${s.screen} | ${s.what} |`)
    .join("\n");
  return `# The roles icon pack

Every 3D glass object and glass icon tile drawn in the twelve renders in
\`docs/design/references/roles/\`, cut by \`scripts/design/session-b-crops.mjs\`
(block roles). Do not edit these files by hand: change the script and re-run
\`node scripts/design/session-b-crops.mjs --surface roles\`.

**Key.** The shared pipeline's own \`keyRender\` from \`scripts/cut-icon-ground.mjs\`
(read from that file and evaluated, not copied): a two-pass plane fit of the
ground on a ring at the box edge, subtracted only to find how much of each
pixel's brightest channel is object, then the brightest-channel key with all
three channels scaled by one number so the hue is the render's hue. Then
\`dropEdgeStrays\` and \`squareWithMargin\`, the same 10 per cent margin as the
pack's 41 render crops.

**Files per object.** \`<name>.png\` and \`<name>.webp\` at native size (the
square edge column), \`<name>-256.png\` and \`<name>-256.webp\` at the pack's 256
edge. Where native is under 256 the 256 file is an upsample (Lanczos) and reads
exactly as soft as the native number says; nothing sharper was invented.

**Sizes, honestly.** Native is the object's longer side in render pixels. At
a 3x phone a crop is pin sharp up to native / 3 CSS px and acceptably soft to
native / 2. So: 40 to 60 native (the glyph tiles, orbs and amenities) belong
in 20 to 32 CSS px slots; 70 to 115 (the doors, the plinth objects) up to
40 to 56; the four hero objects (\`owner-set-up-house\`, \`agent-key-plinth\`,
\`firm-building-plinth\`, \`review-sent-house\`) up to 96 to 120.

**Duplicates.** Checked against all 144 objects in \`public/brand/glass\`: none of
them is the same drawing as any object here (the nearest, \`home-ring\`,
\`key-ring\`, \`chart-ring\`, \`building-chip\`, \`doc-shield\`, \`pin-map\`,
\`land-plot\`, \`duplex\`, \`bungalow\`, \`mini-flat\`, \`shop-retail\`,
\`office-space\`, \`id-card-check\`, \`hotel-bed\`, \`concierge-bell\`, \`info\`,
\`home-check\`, \`camera\`, are different drawings in a different style), so
nothing was skipped as already filed. Within the set, where two screens draw
the same object only the larger drawing was cut, and its row names both screens.

**Light theme.** No render draws these on paper, and a night object on white
goes green and washed, with its faint bloom showing as a pale square. So each
object also ships \`<name>-day.png\` / \`.webp\` and \`-day-256\`: the same key
with the faint bloom (alpha under 50) dropped and every pixel re-inked on the
brand ramp by how lit it was, \`#9CC2FF\` for the glass body to \`#06379A\` for
the brightest edges. On paper it sits bare, or on the PALE icon tile of
\`docs/design/GLOW_IDENTITY.md\` section 4. Never on a dark plate (the light
survey's condemned defect). It is a derived rendition, not commissioned light
artwork. See \`docs/design/proofs/session-b/identity/roles-pack-paper.png\`.

## Objects

| Name | Render | Box (left, top, w, h) | Native px | Square edge | Screen | What it is |
| --- | --- | --- | ---: | ---: | --- | --- |
${table}

## Stage (cut with its ground, feathered, not keyed)

| Name | Render | Box (left, top, w, h) | Source px | Screen | What it is |
| --- | --- | --- | --- | --- | --- |
${stages}

## Suggested \`RENDER_CROPS\` entries for \`scripts/icon-manifest.mjs\`

Paste inside \`RENDER_CROPS\`. The \`render\` path is relative to
\`docs/design/references/\`, as every existing entry is. Three need a
treatment the manifest pipeline does not have yet: \`list-rent-house\` and
\`shortlet-entire-flat\` (a tick badge retouched out), \`list-sale-sign\` (the
board's lettering retouched blank), and \`owner-map-pin\` (a \`keep\` mask against the drawn map). Until
the slicer grows a retouch step, take those four from this folder rather than
re-cutting them raw.

\`\`\`js
  /* roles/: the platform identity pack (Session B, docs/SESSION_B_SCOPE.md section 10). */
${manifest}
\`\`\`
`;
}

/* ================================================================= run */

/* ------------------------------------------------------------------ welcome */
/*
 * Worker "welcome" (Get started). Render: 2A49E2F7-F99C-47D3-BB79-075DCC1A0F5D.png
 * (repo root). A STAGE crop, not an object: cut with its dark ground, the
 * lettering and the coin body retouched out by a harmonic fill, edges
 * feathered. See apps/web/public/brand/session-b/welcome/SOURCES.md.
 */
/** The render as a mutable float RGB buffer. */
async function loadRender(file) {
  const { data, info } = await sharp(path.join(ROOT, file))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, px: Float32Array.from(data) };
}

/** A mask the size of the image, 1 where pixels are to be rebuilt. */
function emptyMask(img) {
  return new Uint8Array(img.w * img.h);
}

function maskRect(img, mask, [x0, y0, x1, y1]) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) mask[y * img.w + x] = 1;
}

/** A rotated ellipse: centre, semi axes, angle of the first axis in degrees. */
function maskEllipse(img, mask, { cx, cy, a, b, angle = 0 }) {
  const t = (angle * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  const r = Math.ceil(Math.max(a, b)) + 1;
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const u = dx * c + dy * s;
      const v = -dx * s + dy * c;
      if ((u * u) / (a * a) + (v * v) / (b * b) <= 1) mask[y * img.w + x] = 1;
    }
  }
}

/**
 * Rebuild the masked pixels from their surroundings: a harmonic fill, the
 * smoothest surface that meets the unmasked pixels at the mask's edge. On a
 * glass face or a glow this is indistinguishable from the artwork around it,
 * which is exactly what retouching lettering out of glass needs. Seeded with
 * the mean of the boundary so it converges in a few hundred passes.
 */
function harmonicFill(img, mask, passes = 1500) {
  const { w, px } = img;
  const idx = [];
  for (let i = 0; i < mask.length; i++) if (mask[i]) idx.push(i);
  const sum = [0, 0, 0];
  let n = 0;
  for (const i of idx) {
    for (const j of [i - 1, i + 1, i - w, i + w]) {
      if (!mask[j]) {
        for (let k = 0; k < 3; k++) sum[k] += px[j * 3 + k];
        n++;
      }
    }
  }
  for (const i of idx) for (let k = 0; k < 3; k++) px[i * 3 + k] = sum[k] / Math.max(1, n);
  for (let p = 0; p < passes; p++) {
    for (const i of idx) {
      for (let k = 0; k < 3; k++) {
        px[i * 3 + k] =
          (px[(i - 1) * 3 + k] + px[(i + 1) * 3 + k] + px[(i - w) * 3 + k] + px[(i + w) * 3 + k]) / 4;
      }
    }
  }
}

/**
 * Cut a box out as RGBA with its edges feathered to transparent, so a stage
 * sits in the page with no visible rectangle. `feather` is in source pixels
 * per side; the ramp is a smoothstep, which reads as light falling off rather
 * than as a gradient.
 */
async function stageCut(img, box, feather) {
  const { left, top, width, height } = box;
  const out = Buffer.alloc(width * height * 4);
  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const si = ((top + y) * img.w + (left + x)) * 3;
      const di = (y * width + x) * 4;
      const a =
        smooth(x / feather.left) *
        smooth((width - 1 - x) / feather.right) *
        smooth(y / feather.top) *
        smooth((height - 1 - y) / feather.bottom);
      for (let k = 0; k < 3; k++) out[di + k] = Math.max(0, Math.min(255, Math.round(img.px[si + k])));
      out[di + 3] = Math.round(a * 255);
    }
  }
  return sharp(out, { raw: { width, height, channels: 4 } });
}

async function welcome() {
  const RENDER = "2A49E2F7-F99C-47D3-BB79-075DCC1A0F5D.png";
  const dir = path.join(OUT, "welcome");
  await mkdir(dir, { recursive: true });

  /*
   * THE STAGE: the two tilted glass tiles, the glowing plinth, its light
   * pillars and reflection, and the haze behind them. The box runs from just
   * inside the phone's screen edge (the bezel's glow reaches x 194) to just
   * inside the other, and from the tiles' glow to below the plinth's
   * reflection. 636 x 530 source px, drawn 380 x 317 css at 390.
   */
  const BOX = { left: 194, top: 560, width: 636, height: 530 };
  const FEATHER = { left: 12, right: 12, top: 44, bottom: 56 };

  /* Retouched out, and why:
     - PROPERTY and STAYS: live text is laid back over the art as HTML.
     - HOTEL on the sign: lettering baked into an object ships blank
       (DESIGN_DIRECTION rule 3), the panel keeps its glass.
     - the coin's body: the coin is live, a CSS 3D coin that really turns,
       laid exactly where the drawn one stood. Its orbit swirl stays in the
       art and now circles the live coin. */
  const retouch = (img, mask) => {
    maskRect(img, mask, [290, 838, 418, 865]); // PROPERTY
    maskRect(img, mask, [626, 840, 712, 866]); // STAYS
    maskRect(img, mask, [647, 662, 685, 677]); // HOTEL
    maskEllipse(img, mask, { cx: 508, cy: 890, a: 96, b: 68, angle: 56 }); // coin body
  };

  /* Slide one: the render's own two objects, the house and the hotel. */
  const worlds = await loadRender(RENDER);
  const m1 = emptyMask(worlds);
  retouch(worlds, m1);
  harmonicFill(worlds, m1);
  await (await stageCut(worlds, BOX, FEATHER))
    .webp({ quality: 90, alphaQuality: 90, effort: 6 })
    .toFile(path.join(dir, "stage-worlds.webp"));

  /* Slides two to four: the same stage with the tiles emptied, so each slide
     stands its own glass object in the same tiles. */
  const tiles = await loadRender(RENDER);
  const m2 = emptyMask(tiles);
  retouch(tiles, m2);
  maskRect(tiles, m2, [266, 652, 434, 822]); // the house and its tree
  maskRect(tiles, m2, [574, 644, 768, 822]); // the hotel and its palms
  harmonicFill(tiles, m2, 2500);
  await (await stageCut(tiles, BOX, FEATHER))
    .webp({ quality: 90, alphaQuality: 90, effort: 6 })
    .toFile(path.join(dir, "stage-tiles.webp"));

  /*
   * THE COIN FACE, cut from this render's own coin. The drawn coin is seen
   * mid-turn, so its front face is an ellipse: fitted by eye in a 3x overlay
   * to centre (515, 884), semi axes 80 and 52 render px, the long axis 20
   * degrees from the vertical with its foot to the right. The face is
   * un-projected to the circle it is a view of (the short axis stretched by
   * 80/52 after turning the long axis upright), sampled bilinearly from the
   * untouched render, and masked to the circle with a one pixel soft edge.
   * 160 px across, the render's own resolution along the long axis; nothing
   * is invented. The live coin turns this face back to the drawn pose.
   */
  const COIN = { cx: 515, cy: 884, a: 80, b: 52, deg: 20 };
  {
    const src = await loadRender(RENDER);
    const R = COIN.a;
    const N = 2 * R;
    const t = (COIN.deg * Math.PI) / 180;
    const ux = Math.sin(t);
    const uy = Math.cos(t);
    const out = Buffer.alloc(N * N * 4);
    const at = (x, y, k) => src.px[(y * src.w + x) * 3 + k];
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const px = i + 0.5 - R;
        const py = j + 0.5 - R;
        const d = Math.hypot(px, py);
        const alpha = Math.max(0, Math.min(1, R - d));
        const q = (j * N + i) * 4;
        if (alpha === 0) continue;
        const m = (px * COIN.b) / COIN.a;
        const sx = COIN.cx + py * ux + m * uy;
        const sy = COIN.cy + py * uy - m * ux;
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const fx = sx - x0;
        const fy = sy - y0;
        for (let k = 0; k < 3; k++) {
          const v =
            at(x0, y0, k) * (1 - fx) * (1 - fy) +
            at(x0 + 1, y0, k) * fx * (1 - fy) +
            at(x0, y0 + 1, k) * (1 - fx) * fy +
            at(x0 + 1, y0 + 1, k) * fx * fy;
          out[q + k] = Math.round(v);
        }
        out[q + 3] = Math.round(alpha * 255);
      }
    }
    await sharp(out, { raw: { width: N, height: N, channels: 4 } })
      .webp({ quality: 92, alphaQuality: 100, effort: 6 })
      .toFile(path.join(dir, "coin-face.webp"));
  }

  writeFileSync(
    path.join(dir, "SOURCES.md"),
    `# Get started crops

Cut by \`scripts/design/session-b-crops.mjs\` (block WELCOME). Do not edit by
hand; change the script and re-run it.

| File | Render | Box (left, top, w, h, render px) | Treatment | Drawn at 390 |
|---|---|---|---|---|
| \`stage-worlds.webp\` | \`${RENDER}\` | ${BOX.left}, ${BOX.top}, ${BOX.width}, ${BOX.height} | Stage with its dark ground. PROPERTY, STAYS and the HOTEL lettering retouched out by harmonic fill from the surrounding glass; the coin's body retouched out (the live CSS coin stands there); edges feathered to transparent (${FEATHER.left}/${FEATHER.right}/${FEATHER.top}/${FEATHER.bottom} px, smoothstep). WebP q90 with alpha. | 380 x 317 css |
| \`stage-tiles.webp\` | \`${RENDER}\` | same | As above, and the house and the hotel retouched out of the two tiles, so slides two to four stand their own glass objects in them. | 380 x 317 css |

| \`coin-face.webp\` | \`${RENDER}\` | ellipse centre ${COIN.cx}, ${COIN.cy}, semi axes ${COIN.a} and ${COIN.b}, long axis ${COIN.deg} deg from vertical | The drawn coin's front face, un-projected from its mid-turn ellipse to the circle it is a view of (short axis x ${COIN.a}/${COIN.b}), bilinear, masked to the circle with a 1 px soft edge. WebP q92 with alpha. Both faces of the live CSS coin. | 160 px source for a 96 css face: sharp at 1x, the browser scales it 2x at 2x |

Resolution: the source box is 636 px wide for 380 css px, 1.67 source px per
css px. A 3x phone asks for 1140, so the stage is visibly softer than live
text at 3x and matches it at 2x. Nothing is upscaled.
`,
  );
}

SURFACES.welcome = welcome;

/* =====================================================================
 * SIGNIN (Welcome back), render 55A56F21. Owner: Session B "signin".
 * Its own helpers, prefixed `si`, so nothing above is changed: raw RGBA
 * through sharp, a normalised-convolution fill that lifts painted UI out of
 * a render, an edge feather, and a brightest-channel key outside one
 * rounded rectangle (the app tile, kept whole).
 * ===================================================================== */
/** Decode a render (or a box of it) to raw RGBA. */
async function siRead(file, box) {
  let img = sharp(path.join(ROOT, file)).ensureAlpha();
  if (box) img = img.extract(box);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data: new Float32Array(data), w: info.width, h: info.height };
}

/** Encode raw RGBA to WebP with alpha. */
async function siWrite(raw, path, { quality = 84, width } = {}) {
  const buf = Buffer.from(Uint8ClampedArray.from(raw.data));
  let img = sharp(buf, { raw: { width: raw.w, height: raw.h, channels: 4 } });
  if (width && width !== raw.w) img = img.resize({ width, kernel: "lanczos3" });
  await img.webp({ quality, alphaQuality: 90, effort: 6, smartSubsample: true }).toFile(path);
}

/** Separable box blur, three passes (close to a gaussian), on one plane. */
function siBlur(plane, w, h, radius) {
  const tmp = new Float32Array(plane.length);
  let src = plane;
  for (let pass = 0; pass < 3; pass++) {
    // horizontal
    for (let y = 0; y < h; y++) {
      let acc = 0;
      const row = y * w;
      for (let x = -radius; x <= radius; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = acc / (2 * radius + 1);
        acc += src[row + Math.min(w - 1, x + radius + 1)] - src[row + Math.max(0, x - radius)];
      }
    }
    // vertical
    const out = new Float32Array(plane.length);
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -radius; y <= radius; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = acc / (2 * radius + 1);
        acc += tmp[Math.min(h - 1, y + radius + 1) * w + x] - tmp[Math.max(0, y - radius) * w + x];
      }
    }
    src = out;
  }
  return src;
}

/**
 * Remove painted UI from a render by normalised convolution: every pixel
 * inside `holes` is replaced by the blurred average of the pixels OUTSIDE the
 * holes around it, so the fill is the render's own light carried inwards,
 * never an invented colour. `feather` softens the seam.
 */
function siFill(raw, holes, { radius = 40, feather = 10 } = {}) {
  const { data, w, h } = raw;
  const keep = new Float32Array(w * h).fill(1);
  for (const r of holes)
    for (let y = r.top; y < r.top + r.height; y++)
      for (let x = r.left; x < r.left + r.width; x++) keep[y * w + x] = 0;
  const soft = feather > 0 ? siBlur(keep, w, h, feather) : keep;
  /* Several reaches, nearest first: a pixel deep inside a large hole is
     filled from the wide pass, one near the edge from the tight pass. */
  const radii = [radius, radius * 3, radius * 8];
  const weights = radii.map((r) => siBlur(keep, w, h, r));
  const out = new Float32Array(data);
  for (let c = 0; c < 3; c++) {
    const plane = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) plane[i] = data[i * 4 + c] * keep[i];
    const sums = radii.map((r) => siBlur(plane, w, h, r));
    for (let i = 0; i < w * h; i++) {
      let fill = 0;
      let need = 1;
      for (let k = 0; k < radii.length && need > 1e-3; k++) {
        const wt = weights[k][i];
        if (wt < 1e-5) continue;
        const take = Math.min(1, wt / 0.25) * need;
        fill += (sums[k][i] / wt) * take;
        need -= take;
      }
      const k = keep[i] === 1 ? Math.max(soft[i], 0) : soft[i];
      out[i * 4 + c] = data[i * 4 + c] * k + fill * (1 - k);
    }
  }
  return { data: out, w, h };
}

/** Multiply alpha by a feather ramp of `px` on each named edge. */
function siFeather(raw, px) {
  const { data, w, h } = raw;
  const ramp = (d, n) => (n <= 0 ? 1 : Math.min(1, Math.max(0, d / n)) ** 1.6);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const a =
        ramp(x, px.left ?? 0) * ramp(w - 1 - x, px.right ?? 0) * ramp(y, px.top ?? 0) * ramp(h - 1 - y, px.bottom ?? 0);
      data[(y * w + x) * 4 + 3] *= a;
    }
  return raw;
}

/** Brightest-channel key everywhere except inside one rounded rectangle. */
function siKeyOutsideTile(raw, r, floor, span) {
  const { data, w, h } = raw;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      // signed distance to the rounded rectangle, negative inside
      const cx = Math.max(r.left + r.radius - x, 0, x - (r.right - r.radius));
      const cy = Math.max(r.top + r.radius - y, 0, y - (r.bottom - r.radius));
      const d = Math.hypot(cx, cy) - r.radius;
      const inside = Math.min(1, Math.max(0, 0.5 - d / r.soft));
      const m = Math.max(data[i], data[i + 1], data[i + 2]);
      const key = Math.min(1, Math.max(0, (m - floor) / span));
      const a = Math.max(inside, key);
      /* Colour is left as drawn: the ground under it on the page is the
         same night sky, so the lit pixels composite back to what the render
         shows, and nothing is invented by dividing through a guessed ground. */
      data[i + 3] = 255 * a;
    }
  return raw;
}

async function signin() {
  const RENDER = "55A56F21-0654-4F2D-984B-60A8CE97BB17.png";
  const dir = path.join(OUT, "signin");
  await mkdir(dir, { recursive: true });

  /*
   * 1. THE STAGE: the whole render with its painted UI lifted out, so what is
   * left is the sky, the light curtains, the horizon, the plinth and the
   * mirror floor, exactly as drawn. The holes are the lockup and slogan
   * (the slogan never ships) and the card with its bloom. The plinth, from
   * y 1338 down, is kept untouched. Served at 1024 wide; the page scales it
   * with the card, anchored at the card's foot.
   */
  const stage = await siRead(RENDER);
  const filled = siFill(
    stage,
    [
      { left: 280, top: 170, width: 464, height: 516 }, // app tile, wordmark, slogan
      { left: 150, top: 664, width: 724, height: 674 }, // card and its bloom, to the plinth
    ],
    { radius: 48, feather: 12 },
  );
  siFeather(filled, { left: 60, right: 60, top: 120, bottom: 40 });
  await siWrite(filled, path.join(dir, "stage.webp"), { quality: 82 });

  /*
   * 2. THE LOCKUP: the app tile and the chrome wordmark together, as drawn,
   * with the render's spacing between them. Its ground is the render's sky,
   * feathered away on every side so it melts into the stage beneath.
   */
  const lockup = await siRead(RENDER, { left: 280, top: 176, width: 464, height: 452 });
  /* Keyed, not boxed: outside the tile the render's sky goes and only light
     stays (brightest channel, floor 70, span 150), so there is no rectangle
     to see where the crop meets the stage. Inside the tile (render box 380,
     222 to 642, 502, corner 52) the glass is kept whole, dark navy and all,
     with a 6 px soft edge. */
  siKeyOutsideTile(lockup, { left: 380 - 280, top: 222 - 176, right: 642 - 280, bottom: 502 - 176, radius: 52, soft: 6 }, 70, 150);
  siFeather(lockup, { left: 12, right: 12, top: 12, bottom: 8 });
  await siWrite(lockup, path.join(dir, "lockup.webp"), { quality: 90 });

  console.log("signin: stage.webp, lockup.webp ->", dir);
}
/* ============================== end SIGNIN ============================ */
SURFACES.signin = signin;

/* --------------------------------------------------------------- profile */
/*
 * Worker "profile". Render: 50E032EA-4141-4237-88D5-01B3720D87B6.png (repo
 * root), 1024x1536, phone screen 658 image px wide. The five row objects are
 * already in the shared pack as night crops of this render (calendar-grid,
 * bookmark-ribbon, wallet-tile, shield-check-tile, role-switch-tile, boxes as
 * `scripts/icon-manifest.mjs` records them). This block cuts ONLY their paper
 * renditions, from the same boxes, by the glow identity's method
 * (docs/design/GLOW_IDENTITY.md, section 4): key the render, drop the faint
 * bloom below alpha 50, and re-ink every pixel on the brand ramp by how lit it
 * was, from #9CC2FF (glass body) to #06379A (the brightest edges), so the SAME
 * object reads as blue glass drawn on paper. A derived rendition, not
 * commissioned light artwork. See apps/web/public/brand/session-b/profile/SOURCES.md.
 */
const DAY_BODY = [0x9c, 0xc2, 0xff];
const DAY_EDGE = [0x06, 0x37, 0x9a];

async function cutDayObject(render, box, plate, dest) {
  const { data, info } = await sharp(render)
    .extract({ left: box[0], top: box[1], width: box[2], height: box[3] })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const keyed = featherEdges(keyRender(data, w, h, info.channels), w, h, 0.04);
  /* The tile's own rounded square, measured in the render: everything
     outside it is bloom and page and is dropped; inside it, a faint pixel is
     the tile's glass body and is kept as body, so the square has no holes. */
  const [ox, oy, size, radius] = plate;
  const inside = (x, y) => {
    const dx = Math.max(ox + radius - x, 0, x - (ox + size - radius));
    const dy = Math.max(oy + radius - y, 0, y - (oy + size - radius));
    return x >= ox && x < ox + size && y >= oy && y < oy + size && dx * dx + dy * dy <= radius * radius;
  };
  for (let q = 0; q < keyed.length; q += 4) {
    const x = (q / 4) % w;
    const y = Math.floor(q / 4 / w);
    const a = keyed[q + 3];
    if (!inside(x, y)) {
      keyed[q] = keyed[q + 1] = keyed[q + 2] = keyed[q + 3] = 0;
      continue;
    }
    if (a < 50) {
      for (let k = 0; k < 3; k += 1) keyed[q + k] = DAY_BODY[k];
      keyed[q + 3] = 150;
      continue;
    }
    /* How lit the pixel was at night: its brightest channel, weighted by how
       much of it survived the key. 0 is glass body, 1 is the hottest edge. */
    const lit = Math.min(1, (Math.max(keyed[q], keyed[q + 1], keyed[q + 2]) / 255) * (a / 255));
    /* A steep ramp: the glass body and its soft bloom stay pale, only the
       lit line work and the rim go to the deep end. */
    const t = Math.min(1, Math.max(0, (lit - 0.32) / 0.45)) ** 0.8;
    for (let k = 0; k < 3; k += 1) keyed[q + k] = Math.round(DAY_BODY[k] + (DAY_EDGE[k] - DAY_BODY[k]) * t);
    keyed[q + 3] = Math.round(Math.min(255, 60 + a * 0.9));
  }
  await sharp(keyed, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(`${dest}.webp`);
}

SURFACES.profile = async () => {
  const render = path.join(ROOT, "50E032EA-4141-4237-88D5-01B3720D87B6.png");
  const dir = path.join(OUT, "profile");
  await mkdir(dir, { recursive: true });
  /* [box], [square inside the box: left, top, size, corner radius], image px. */
  const ROW_PLATE = [5, 5, 84, 17];
  const boxes = {
    "calendar-grid": [[231, 657, 96, 96], ROW_PLATE],
    "bookmark-ribbon": [[231, 781, 96, 96], ROW_PLATE],
    "wallet-tile": [[231, 906, 96, 96], ROW_PLATE],
    "shield-check-tile": [[231, 1031, 96, 96], ROW_PLATE],
    "role-switch-tile": [[229, 1174, 84, 84], [7, 11, 73, 15]],
  };
  for (const [name, [box, plate]] of Object.entries(boxes)) {
    await cutDayObject(render, box, plate, path.join(dir, `${name}-day`));
  }
};
/* ============================= end PROFILE ============================ */

const only = process.argv.includes("--surface")
  ? process.argv[process.argv.indexOf("--surface") + 1]
  : null;
for (const [name, run] of Object.entries(SURFACES)) {
  if (only && name !== only) continue;
  await run();
  console.log(`cut: ${name}`);
}
