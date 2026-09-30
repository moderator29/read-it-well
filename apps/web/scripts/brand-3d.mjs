#!/usr/bin/env node
/**
 * THE FOUNDER'S 3D ART (30 September), sliced and converted.
 *
 *   node scripts/brand-3d.mjs
 *
 * Sources live in assets-src/3d-2026-09-30/ (never served). Outputs:
 *
 * 1. public/brand/3d/<name>.webp: the eight icons of
 *    icon-sheet-stays-and-actions.png (a 2 x 4 sheet on a dark navy ground),
 *    each a square with even padding, 256 px. The navy ground is keyed out
 *    with a difference key against a background estimated from the tile's own
 *    border, so the soft blue glow survives as partial alpha. Anything the
 *    ground cannot reach from the tile edge (the icon's own dark shading) is
 *    held fully opaque, so the key never punches holes in an object.
 *
 * 2. public/brand/onboarding/step-3-*.webp and step-4-*.webp: the Get started
 *    art at 1080 x 1440. The founder sent dark versions only; the light file
 *    is the same picture until a light version arrives (see step-photos.ts).
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

/* The sheet's tile centres, measured from the icons' bright pixels. */
const TILE = 290;
const ICONS = [
  { name: "hotel", cx: 167, cy: 462 },
  { name: "shortlet", cx: 457, cy: 462 },
  { name: "restaurant", cx: 741, cy: 462 },
  { name: "local-talks", cx: 1036, cy: 462 },
  { name: "buy", cx: 166, cy: 816 },
  { name: "rent", cx: 452, cy: 816 },
  { name: "pay", cx: 747, cy: 816 },
  { name: "list", cx: 1053, cy: 816 },
];
const OUT_SIZE = 256;
/** Padding around the keyed object, as a share of the square's side. */
const PAD = 0.06;
/** Difference below this is ground noise; above HARD is fully the object. */
const SOFT = 22;
const HARD = 120;
/** A pixel this different from the ground counts as object for hole filling. */
const SOLID = 70;

async function keyTile(sheet, W, H, { cx, cy }) {
  const left = Math.max(0, cx - TILE / 2);
  const top = Math.max(0, cy - TILE / 2);
  const w = Math.min(TILE, W - left);
  const h = Math.min(TILE, H - top);
  const { data } = await sheet
    .clone()
    .extract({ left, top, width: w, height: h })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const at = (x, y, c) => data[(y * w + x) * 3 + c];

  // The ground along each edge, smoothed, then blended across the tile by
  // distance to each edge (a Coons-style patch). The sheet's ground is a
  // smooth gradient, so this follows it closely.
  const band = 4;
  const edge = (len, pick) => {
    const out = [];
    for (let i = 0; i < len; i++) {
      const acc = [0, 0, 0];
      for (let k = 0; k < band; k++) for (let c = 0; c < 3; c++) acc[c] += pick(i, k, c);
      out.push(acc.map((v) => v / band));
    }
    // A wide box blur so a stray bright neighbour pixel cannot bias it.
    const r = 20;
    return out.map((_, i) => {
      const acc = [0, 0, 0];
      let n = 0;
      for (let j = Math.max(0, i - r); j <= Math.min(len - 1, i + r); j++) {
        for (let c = 0; c < 3; c++) acc[c] += out[j][c];
        n++;
      }
      return acc.map((v) => v / n);
    });
  };
  const topE = edge(w, (i, k, c) => at(i, k, c));
  const botE = edge(w, (i, k, c) => at(i, h - 1 - k, c));
  const leftE = edge(h, (i, k, c) => at(k, i, c));
  const rightE = edge(h, (i, k, c) => at(w - 1 - k, i, c));
  const ground = (x, y) => {
    const u = x / (w - 1);
    const v = y / (h - 1);
    const wt = [1 / (v + 0.02), 1 / (1 - v + 0.02), 1 / (u + 0.02), 1 / (1 - u + 0.02)];
    const s = wt.reduce((a, b) => a + b, 0);
    return [0, 1, 2].map(
      (c) => (topE[x][c] * wt[0] + botE[x][c] * wt[1] + leftE[y][c] * wt[2] + rightE[y][c] * wt[3]) / s,
    );
  };

  const bg = new Float32Array(w * h * 3);
  const diff = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const g = ground(x, y);
      let d = 0;
      for (let c = 0; c < 3; c++) {
        bg[(y * w + x) * 3 + c] = g[c];
        d = Math.max(d, Math.abs(at(x, y, c) - g[c]));
      }
      diff[y * w + x] = d;
    }
  }

  // Flood the ground in from the tile edge through non-solid pixels; what it
  // cannot reach is inside an object and stays opaque.
  const reached = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (reached[i] || diff[i] >= SOLID) return;
    reached[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < w; x++) (push(x, 0), push(x, h - 1));
  for (let y = 0; y < h; y++) (push(0, y), push(w - 1, y));
  while (stack.length) {
    const i = stack.pop();
    const x = i % w;
    const y = (i - x) / w;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  const out = Buffer.alloc(w * h * 4);
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let i = 0; i < w * h; i++) {
    let a = reached[i] ? Math.min(1, Math.max(0, (diff[i] - SOFT) / (HARD - SOFT))) : 1;
    a = a * a * (3 - 2 * a); // smoothstep: a clean fall-off at the glow's rim
    for (let c = 0; c < 3; c++) {
      const p = data[i * 3 + c];
      const g = bg[i * 3 + c];
      // Un-mix the ground: the colour that, laid over the ground at alpha a,
      // gives back the sheet's pixel.
      const f = a > 0.01 ? g + (p - g) / a : p;
      out[i * 4 + c] = Math.max(0, Math.min(255, Math.round(f)));
    }
    out[i * 4 + 3] = Math.round(a * 255);
    if (a > 0.06) {
      const x = i % w;
      const y = (i - x) / w;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  // Tight square around the object with even padding.
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const side = Math.ceil(Math.max(bw, bh) / (1 - 2 * PAD));
  const padL = Math.floor((side - bw) / 2);
  const padT = Math.floor((side - bh) / 2);
  return sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: bw, height: bh })
    .extend({
      left: padL,
      right: side - bw - padL,
      top: padT,
      bottom: side - bh - padT,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
}

async function icons() {
  mkdirSync(OUT_ICONS, { recursive: true });
  const sheet = sharp(join(SRC, "icon-sheet-stays-and-actions.png"));
  const { width: W, height: H } = await sheet.metadata();
  for (const icon of ICONS) {
    const keyed = await keyTile(sheet, W, H, icon);
    const buf = await keyed.png().toBuffer();
    const sized = sharp(buf).resize(OUT_SIZE, OUT_SIZE, { fit: "contain", kernel: "lanczos3" });
    await sized.clone().webp({ quality: 90, alphaQuality: 90, effort: 6 }).toFile(join(OUT_ICONS, `${icon.name}.webp`));
    console.log(`brand/3d/${icon.name}`);
  }
}

async function steps() {
  mkdirSync(OUT_STEPS, { recursive: true });
  const pairs = [
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

await icons();
await steps();
