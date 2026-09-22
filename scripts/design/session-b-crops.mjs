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
  await cutObject(render, [622, 196, 186, 140], path.join(dir, "house-check"), { feather: 0.06, dayFloor: 70 });
  /* The checklist's round glass plates, glyph included (line art, no
     lettering). Centres at x 251 on the row pitch; each box is the 48px disc
     plus a pixel of ground. Only the four the built checklist draws are cut:
     the ladder has four rungs, and the render's other four rooms have no row
     to sit on until scope request I1 lands (their centres, for then:
     kitchen 796, bathrooms 850, utilities 904, appliances 958). */
  const plates = {
    exterior: 688,
    interior: 742,
    safety: 1014,
    overall: 1070,
  };
  for (const [name, cy] of Object.entries(plates)) {
    await cutObject(render, [226, cy - 25, 50, 50], path.join(dir, `plate-${name}`), { feather: 0.04, dayFloor: 40 });
  }
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

/* ================================================================= run */

const only = process.argv.includes("--surface")
  ? process.argv[process.argv.indexOf("--surface") + 1]
  : null;
for (const [name, run] of Object.entries(SURFACES)) {
  if (only && name !== only) continue;
  await run();
  console.log(`cut: ${name}`);
}
