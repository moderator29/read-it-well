/**
 * THE FOUNDER'S 3D ART (30 September), sliced and converted.
 *
 *   node scripts/brand-3d.mjs
 *
 * Sources live in assets-src/3d-2026-09-30/ (never served; keep them). Outputs:
 *
 * 1. public/brand/3d/<name>.webp (@1x, 128 px) and <name>@2x.webp (256 px),
 *    plus PNGs for email at public/brand/3d/email/<name>.png and @2x.png:
 *    every icon of every sheet in SHEETS below (the eight of
 *    icon-sheet-transparent.png, the twenty-one of icon-sheet-2-new.png).
 *    Each is cropped to its own opaque pixels and set in a square with even
 *    padding, so the icons sit on light surfaces as well as on the night
 *    glass. (The earlier dark sheet, icon-sheet-stays-and-actions.png, stays
 *    in assets-src as a source only.)
 *
 * 2. public/brand/onboarding/step-N-{light,dark}.webp: the Get started art at
 *    1080 x 1440. The founder sent dark versions only; the light file is the
 *    same picture until a light version arrives (see step-photos.ts).
 *
 * Rerun it whenever a source changes; the outputs are committed.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "assets-src/3d-2026-09-30");
const OUT_ICONS = join(ROOT, "public/brand/3d");
const OUT_STEPS = join(ROOT, "public/brand/onboarding");

/*
 * THE SHEETS. Config-driven, so a new or replaced sheet is one entry here and
 * a rerun. Each sheet has a `mode`:
 *
 *   "alpha"  the sheet carries a real alpha channel: use it as it is.
 *   "matte"  the sheet is flat (an opaque ground, a glow behind each object):
 *            pull the object out by flooding the ground from the crop's border
 *            across soft colour steps (the glow shades slowly; an object's
 *            edge is a hard step), then feather the edge. Tune per sheet
 *            with `matte: { step, erode, feather }`.
 *
 * and a `layout`: a regular `grid` (cols, rows, names row by row) or
 * explicit `boxes` ({ name: [x0, y0, x1, y1] } in sheet pixels, inclusive;
 * keep a box clear of a neighbour and of any divider line).
 *
 * icon-sheet-2-new.png (the second sheet, 30 September) looks black with a
 * blue glow in viewers that ignore alpha, but it DOES carry real alpha: the
 * ground and glow are colour left in pixels of alpha 0. So it runs in
 * "alpha" mode; "matte" stays for a flat sheet (tried on this sheet with
 * its alpha removed: step 2 keeps every object whole but leaves a thin glow
 * rim on a few, so check the paper composites before shipping a matte run).
 */
const SHEETS = [
  /* The first eight. icon-sheet-4-transparent.png (the founder's better
     re-render, 30 September) replaced icon-sheet-transparent.png, which
     stays in assets-src as a source only. Its objects stand in a baked,
     opaque navy glow, so it runs in "rim" mode. */
  {
    file: "icon-sheet-4-transparent.png",
    mode: "rim",
    matte: { max: [60, 90, 230], dark: 120, step: 6, feather: 2 },
    layout: {
      grid: {
        cols: 4,
        rows: 2,
        names: ["hotel", "shortlet", "restaurant", "local-talks", "buy", "rent", "pay", "list"],
      },
    },
  },
  {
    file: "icon-sheet-2-new.png",
    mode: "alpha",
    matte: { step: 2, erode: 2, feather: 1 },
    layout: {
      boxes: {
        bell: [382, 19, 539, 182],
        assistant: [673, 13, 858, 179],
        "calendar-booked": [972, 23, 1153, 182],
        shield: [384, 202, 535, 367],
        search: [679, 202, 850, 368],
        explore: [978, 202, 1135, 368],
        "home-verified": [211, 408, 389, 560],
        villa: [515, 404, 709, 557],
        city: [822, 402, 1015, 555],
        apartment: [1167, 402, 1292, 566],
        land: [204, 581, 399, 724],
        "stay-rated": [520, 581, 690, 723],
        "calendar-pending": [835, 579, 998, 719],
        "card-secure": [1133, 594, 1322, 724],
        earnings: [228, 751, 379, 860],
        coin: [557, 751, 663, 876],
        verified: [851, 756, 974, 879],
        "id-check": [1120, 762, 1304, 878],
        handover: [223, 871, 389, 1004],
        keys: [533, 892, 683, 1008],
        "home-small": [815, 892, 1013, 1002],
      },
    },
  },
  /* The wishlist (30 September): three rows of eight, each under a text
     pill ("Sheet 3 - ...") that every box stays clear of. Real alpha. */
  {
    file: "icon-sheet-5.png",
    mode: "alpha",
    layout: {
      boxes: {
        camera: [15, 140, 210, 362],
        video: [222, 140, 412, 362],
        checklist: [420, 140, 590, 366],
        contract: [596, 140, 778, 366],
        receipt: [782, 140, 955, 368],
        boxes: [966, 140, 1152, 368],
        toolbox: [1158, 140, 1374, 360],
        "price-tag": [1380, 130, 1522, 362],
        analytics: [15, 460, 212, 680],
        bank: [218, 458, 410, 670],
        megaphone: [412, 460, 606, 668],
        support: [608, 460, 788, 668],
        team: [790, 460, 978, 668],
        folder: [986, 460, 1162, 674],
        clock: [1168, 460, 1350, 660],
        "report-flag": [1352, 460, 1516, 682],
        "saved-heart": [18, 772, 212, 964],
        envelope: [224, 772, 406, 964],
        "phone-code": [424, 770, 594, 964],
        "passcode-lock": [610, 768, 776, 966],
        gift: [800, 772, 970, 966],
        map: [972, 772, 1184, 966],
        power: [1192, 760, 1340, 964],
        celebrate: [1350, 760, 1522, 966],
      },
    },
  },
];
/** Margin added around each box, in sheet pixels. */
const BOX_MARGIN = 4;
/** Padding around the object, as a share of the square's side. */
const PAD = 0.05;
/** Alpha at or below this is treated as empty when finding the crop. */
const ALPHA_FLOOR = 12;
const SIZE_1X = 128;
const OUT_EMAIL = join(OUT_ICONS, "email");

/** The cells of a sheet: [{ name, x0, y0, w, h }]. */
function cellsOf(layout, W, H) {
  if (layout.grid) {
    const { cols, rows, names } = layout.grid;
    const cw = Math.floor(W / cols);
    const ch = Math.floor(H / rows);
    return names.map((name, n) => ({ name, x0: (n % cols) * cw, y0: Math.floor(n / cols) * ch, w: cw, h: ch }));
  }
  return Object.entries(layout.boxes).map(([name, [bx0, by0, bx1, by1]]) => {
    const x0 = Math.max(0, bx0 - BOX_MARGIN);
    const y0 = Math.max(0, by0 - BOX_MARGIN);
    const x1 = Math.min(W - 1, bx1 + BOX_MARGIN);
    const y1 = Math.min(H - 1, by1 + BOX_MARGIN);
    return { name, x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  });
}

/**
 * A cell's RGBA, cw x ch. "alpha" copies the sheet; "matte" rebuilds the
 * alpha: flood the ground from the border across small colour steps, the
 * rest is the object, eroded by `erode` px and box-feathered by `feather`.
 */
function cellPixels(data, W, { x0, y0, w, h }, mode, matte) {
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) data.copy(out, y * w * 4, ((y0 + y) * W + x0) * 4, ((y0 + y) * W + x0 + w) * 4);
  if (mode === "alpha") return out;
  if (mode === "rim") return stripRim(out, w, h, matte);
  if (mode !== "matte") throw new Error(`unknown mode ${mode}`);
  const { step = 2, erode = 2, feather = 1 } = matte ?? {};
  const ground = new Uint8Array(w * h);
  const stack = [];
  const seed = (i) => {
    if (!ground[i]) {
      ground[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) seed(x), seed((h - 1) * w + x);
  for (let y = 0; y < h; y++) seed(y * w), seed(y * w + w - 1);
  const dist = (i, j) =>
    Math.max(Math.abs(out[i * 4] - out[j * 4]), Math.abs(out[i * 4 + 1] - out[j * 4 + 1]), Math.abs(out[i * 4 + 2] - out[j * 4 + 2]));
  while (stack.length) {
    const i = stack.pop();
    const x = i % w;
    const y = (i - x) / w;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (!ground[j] && dist(i, j) <= step) {
        ground[j] = 1;
        stack.push(j);
      }
    }
  }
  let mask = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = ground[i] ? 0 : 1;
  for (let e = 0; e < erode; e++) {
    const next = new Float32Array(mask);
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (mask[i] && (!mask[i - 1] || !mask[i + 1] || !mask[i - w] || !mask[i + w])) next[i] = 0;
      }
    mask = next;
  }
  for (let f = 0; f < feather; f++) {
    const next = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += mask[(y + dy) * w + x + dx];
        next[y * w + x] = s / 9;
      }
    mask = next;
  }
  for (let i = 0; i < w * h; i++) out[i * 4 + 3] = Math.round(mask[i] * 255);
  return out;
}

/**
 * "rim": an alpha sheet whose objects stand in a baked, OPAQUE navy glow
 * (icon-sheet-4). Flood from the transparent ground into the dark navy
 * pixels touching it (every channel under `max`, dark: r + g under `dark`,
 * and across a colour step no bigger than `step`), clear them, then ramp the alpha over the next `feather` px so the
 * object's own edge stays soft. The object's lit rim stops the flood.
 */
function stripRim(px, w, h, { max = [60, 90, 215], dark = 110, step = 255, feather = 2 } = {}) {
  const navy = (i) => px[i * 4] < max[0] && px[i * 4 + 1] < max[1] && px[i * 4 + 2] < max[2] && px[i * 4] + px[i * 4 + 1] < dark;
  const gone = new Uint8Array(w * h);
  const stack = [];
  for (let i = 0; i < w * h; i++) {
    if (px[i * 4 + 3] <= ALPHA_FLOOR) {
      gone[i] = 1;
      stack.push(i);
    }
  }
  while (stack.length) {
    const i = stack.pop();
    const x = i % w;
    const y = (i - x) / w;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (gone[j] || !navy(j)) continue;
      // Across a soft step only (the glow shades slowly), unless from the
      // clear ground itself.
      if (px[i * 4 + 3] > ALPHA_FLOOR && Math.max(...[0, 1, 2].map((c) => Math.abs(px[i * 4 + c] - px[j * 4 + c]))) > step) continue;
      gone[j] = 1;
      stack.push(j);
    }
  }
  // Distance (in px, 4-connected, capped) from the cleared ground, for the ramp.
  const dist = new Uint8Array(w * h).fill(255);
  let ring = [];
  for (let i = 0; i < w * h; i++) if (gone[i]) (dist[i] = 0), ring.push(i);
  for (let d = 1; d <= feather && ring.length; d++) {
    const next = [];
    for (const i of ring) {
      const x = i % w;
      const y = (i - x) / w;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (dist[j] === 255) {
          dist[j] = d;
          next.push(j);
        }
      }
    }
    ring = next;
  }
  for (let i = 0; i < w * h; i++) {
    if (dist[i] === 0) px[i * 4 + 3] = 0;
    else if (dist[i] <= feather) px[i * 4 + 3] = Math.round((px[i * 4 + 3] * dist[i]) / (feather + 1));
  }
  return px;
}

/**
 * Keep the cell's main object: label its opaque islands. A neighbour's edge
 * can spill across the cell's border (the base of the icon above), so an
 * island touching the border is dropped unless it is the main object.
 */
function isolate(px, cw, ch) {
  const lab = new Int32Array(cw * ch);
  const sizes = [0];
  const touches = [false];
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (lab[y * cw + x] || px[(y * cw + x) * 4 + 3] <= ALPHA_FLOOR) continue;
      const id = sizes.length;
      sizes.push(0);
      touches.push(false);
      const stack = [y * cw + x];
      lab[y * cw + x] = id;
      while (stack.length) {
        const i = stack.pop();
        const qx = i % cw;
        const qy = (i - qx) / cw;
        sizes[id]++;
        if (qx === 0 || qy === 0 || qx === cw - 1 || qy === ch - 1) touches[id] = true;
        for (const [nx, ny] of [[qx + 1, qy], [qx - 1, qy], [qx, qy + 1], [qx, qy - 1]]) {
          if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
          const j = ny * cw + nx;
          if (lab[j] || px[j * 4 + 3] <= ALPHA_FLOOR) continue;
          lab[j] = id;
          stack.push(j);
        }
      }
    }
  }
  const main = sizes.indexOf(Math.max(...sizes));
  const keep = sizes.map((sz, id) => id !== 0 && (id === main || (!touches[id] && sz >= 40)));
  const cell = Buffer.alloc(cw * ch * 4);
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = (y * cw + x) * 4;
      const id = lab[y * cw + x];
      // Faint pixels below the floor belong to whichever object is nearest;
      // keep them only away from the cell's border.
      const faintOk = id === 0 && x > 2 && y > 2 && x < cw - 3 && y < ch - 3;
      if (!(keep[id] || faintOk)) continue;
      px.copy(cell, i, i, i + 4);
      if (id !== 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { cell, minX, minY, bw: maxX - minX + 1, bh: maxY - minY + 1 };
}

/**
 * Writes public/brand/3d/<name>.webp (128) and @2x.webp (256), and the
 * email PNGs public/brand/3d/email/<name>.png (128) and @2x.png (256).
 * `only` (a sheet file name, from the command line) limits the run.
 */
async function icons(only) {
  mkdirSync(OUT_ICONS, { recursive: true });
  mkdirSync(OUT_EMAIL, { recursive: true });
  for (const sheet of SHEETS) {
    if (only && sheet.file !== only) continue;
    const { data, info } = await sharp(join(SRC, sheet.file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (const c of cellsOf(sheet.layout, info.width, info.height)) {
      const px = cellPixels(data, info.width, c, sheet.mode, sheet.matte);
      const { cell, minX, minY, bw, bh } = isolate(px, c.w, c.h);
      const side = Math.ceil(Math.max(bw, bh) / (1 - 2 * PAD));
      const padL = Math.floor((side - bw) / 2);
      const padT = Math.floor((side - bh) / 2);
      const square = await sharp(cell, { raw: { width: c.w, height: c.h, channels: 4 } })
        .extract({ left: minX, top: minY, width: bw, height: bh })
        .extend({
          left: padL,
          right: side - bw - padL,
          top: padT,
          bottom: side - bh - padT,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
      for (const [scale, suffix] of [[1, ""], [2, "@2x"]]) {
        const sized = sharp(square).resize(SIZE_1X * scale, SIZE_1X * scale, { kernel: "lanczos3" });
        await sized.clone().webp({ quality: 88, alphaQuality: 95, effort: 6 }).toFile(join(OUT_ICONS, `${c.name}${suffix}.webp`));
        await sized.clone().png({ compressionLevel: 9, palette: false }).toFile(join(OUT_EMAIL, `${c.name}${suffix}.png`));
      }
      console.log(`brand/3d/${c.name} (${sheet.mode}, ${side} px source square)`);
    }
  }
}

async function steps() {
  mkdirSync(OUT_STEPS, { recursive: true });
  const pairs = [
    [1, "get-started-step1-two-worlds-dark.png"],
    [2, "get-started-step2-verified-dark.png"],
    [3, "get-started-step3-talk-pay-dark.png"],
    [4, "get-started-step4-arch-dark.png"],
  ];
  for (const [n, file] of pairs) {
    const img = sharp(join(SRC, file)).resize(1080, 1440, { fit: "cover", position: "top" }).webp({ quality: 82, effort: 6 });
    await img.clone().toFile(join(OUT_STEPS, `step-${n}-dark.webp`));
    // Light version owed by the founder: the dark picture stands in for now.
    await img.clone().toFile(join(OUT_STEPS, `step-${n}-light.webp`));
    console.log(`brand/onboarding/step-${n}`);
  }
}

/* node scripts/brand-3d.mjs [sheet-file | --icons-only] */
const arg = process.argv[2];
await icons(arg && arg !== "--icons-only" ? arg : undefined);
if (!arg) await steps();
