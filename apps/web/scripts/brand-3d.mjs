/**
 * THE FOUNDER'S 3D ART (30 September), sliced and converted.
 *
 *   node scripts/brand-3d.mjs
 *
 * Sources live in assets-src/3d-2026-09-30/ (never served; keep them). Outputs:
 *
 * 1. public/brand/3d/<name>.webp (@1x, 128 px) and <name>@2x.webp (256 px):
 *    the eight icons of icon-sheet-transparent.png, a 1536 x 1024 sheet with
 *    a real alpha channel on a 2 x 4 grid. Each is cropped to its own opaque
 *    pixels and set in a square with even padding, so the icons sit on light
 *    surfaces as well as on the night glass. (The earlier dark sheet,
 *    icon-sheet-stays-and-actions.png, stays in assets-src as a source only.)
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

/* The sheet's grid, row by row, left to right. */
const SHEET = "icon-sheet-transparent.png";
const COLS = 4;
const ROWS = 2;
const NAMES = ["hotel", "shortlet", "restaurant", "local-talks", "buy", "rent", "pay", "list"];
/** Padding around the object, as a share of the square's side. */
const PAD = 0.05;
/** Alpha at or below this is treated as empty when finding the crop. */
const ALPHA_FLOOR = 12;
const SIZE_1X = 128;

async function icons() {
  mkdirSync(OUT_ICONS, { recursive: true });
  const src = join(SRC, SHEET);
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const cw = Math.floor(W / COLS);
  const ch = Math.floor(info.height / ROWS);
  for (let n = 0; n < NAMES.length; n++) {
    const x0 = (n % COLS) * cw;
    const y0 = Math.floor(n / COLS) * ch;
    // Label the cell's opaque islands. A neighbour's edge can spill across
    // the grid line (the base of the icon above), so an island touching the
    // cell's border is dropped unless it is the cell's main object.
    const lab = new Int32Array(cw * ch);
    const sizes = [0];
    const touches = [false];
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        if (lab[y * cw + x] || data[((y0 + y) * W + x0 + x) * 4 + 3] <= ALPHA_FLOOR) continue;
        const id = sizes.length;
        sizes.push(0);
        touches.push(false);
        const stack = [y * cw + x];
        lab[y * cw + x] = id;
        while (stack.length) {
          const i = stack.pop();
          const px = i % cw;
          const py = (i - px) / cw;
          sizes[id]++;
          if (px === 0 || py === 0 || px === cw - 1 || py === ch - 1) touches[id] = true;
          for (const [nx, ny] of [[px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]]) {
            if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
            const j = ny * cw + nx;
            if (lab[j] || data[((y0 + ny) * W + x0 + nx) * 4 + 3] <= ALPHA_FLOOR) continue;
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
        const si = ((y0 + y) * W + x0 + x) * 4;
        const di = (y * cw + x) * 4;
        const id = lab[y * cw + x];
        // Faint pixels below the floor belong to whichever object is nearest;
        // keep them only away from the cell's border.
        const faintOk = id === 0 && x > 2 && y > 2 && x < cw - 3 && y < ch - 3;
        if (!(keep[id] || faintOk)) continue;
        data.copy(cell, di, si, si + 4);
        if (id !== 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const side = Math.ceil(Math.max(bw, bh) / (1 - 2 * PAD));
    const padL = Math.floor((side - bw) / 2);
    const padT = Math.floor((side - bh) / 2);
    const square = await sharp(cell, { raw: { width: cw, height: ch, channels: 4 } })
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
      await sharp(square)
        .resize(SIZE_1X * scale, SIZE_1X * scale, { kernel: "lanczos3" })
        .webp({ quality: 88, alphaQuality: 95, effort: 6 })
        .toFile(join(OUT_ICONS, `${NAMES[n]}${suffix}.webp`));
    }
    console.log(`brand/3d/${NAMES[n]} (${side} px source square)`);
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

await icons();
await steps();
