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
import { writeFileSync } from "node:fs";
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
    await cutObject(render, [226, cy - 25, 50, 50], path.join(dir, `plate-${name}`), { feather: 0.04 });
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

  writeFileSync(
    path.join(dir, "SOURCES.md"),
    `# Get started crops

Cut by \`scripts/design/session-b-crops.mjs\` (block WELCOME). Do not edit by
hand; change the script and re-run it.

| File | Render | Box (left, top, w, h, render px) | Treatment | Drawn at 390 |
|---|---|---|---|---|
| \`stage-worlds.webp\` | \`${RENDER}\` | ${BOX.left}, ${BOX.top}, ${BOX.width}, ${BOX.height} | Stage with its dark ground. PROPERTY, STAYS and the HOTEL lettering retouched out by harmonic fill from the surrounding glass; the coin's body retouched out (the live CSS coin stands there); edges feathered to transparent (${FEATHER.left}/${FEATHER.right}/${FEATHER.top}/${FEATHER.bottom} px, smoothstep). WebP q90 with alpha. | 380 x 317 css |
| \`stage-tiles.webp\` | \`${RENDER}\` | same | As above, and the house and the hotel retouched out of the two tiles, so slides two to four stand their own glass objects in them. | 380 x 317 css |

The coin's faces are \`public/brand/glass/flip-coin.png\`, the pack's crop of the
same two-faced glass coin from the drawer render, so no new coin crop exists.

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

const only = process.argv.includes("--surface")
  ? process.argv[process.argv.indexOf("--surface") + 1]
  : null;
for (const [name, run] of Object.entries(SURFACES)) {
  if (only && name !== only) continue;
  await run();
  console.log(`cut: ${name}`);
}
