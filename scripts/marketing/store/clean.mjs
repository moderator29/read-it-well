/**
 * Three captures were taken scrolled, and the app's header is translucent: the labels
 * scrolled under it (the home screen's "Buy Rent Pay List", the help centre's "Report a
 * problem · Write to us · Help centre" and its search box) show through it as faint ghost
 * text beside the logo. At the store's size that reads as a rendering fault, so for these
 * three the header band alone is cleaned before the display goes on a phone:
 *
 *   - the band is the status bar and the header, from the top to the header's hairline;
 *   - the header's own parts (the time and status icons, the menu, the logo, the bell) are
 *     found on a capture of the same header taken unscrolled (the reference), and kept
 *     exactly as captured;
 *   - everything else in the band is set to the band's own colour, row by row.
 *
 * Nothing below the hairline is touched. The result is cached beside the phone renders.
 */
import sharp from "sharp";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { MARKETING, SCREENS, STORES } from "./lib.mjs";

/** Capture id -> the unscrolled capture that shows the same header. */
export const CLEAN = {
  "home-recent": "home",
  "support-money": "support",
  "support-inspection": "support",
};

const CACHE = join(MARKETING, "node_modules", ".cache", "store-displays");
/* The header's hairline sits at y 366 on every 1320 x 2868 display. */
const BAND = 365;

async function raw(file) {
  const { data, info } = await sharp(file).removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

const median = (arr) => {
  const s = Float64Array.from(arr).sort();
  return s.length ? s[s.length >> 1] : 0;
};

/** Write the cleaned display for `id` on `store` and return its path. */
export async function cleanDisplay(id, store) {
  const plat = STORES[store].screen;
  const src = join(SCREENS, `${id}-${plat}.png`);
  const ref = join(SCREENS, `${CLEAN[id]}-${plat}.png`);
  mkdirSync(CACHE, { recursive: true });
  const stamp = `${Math.round(statSync(src).mtimeMs)}-${Math.round(statSync(ref).mtimeMs)}`;
  const out = join(CACHE, `${id}-${plat}-${stamp}.png`);
  if (existsSync(out)) return out;

  const T = await raw(src);
  const R = await raw(ref);
  if (T.w !== R.w || T.h !== R.h) throw new Error(`clean: ${id} and ${CLEAN[id]} differ in size`);
  const { w } = T;

  /* 1. The reference's parts: pixels that stand out from their row's colour. */
  const mask = new Uint8Array(w * BAND);
  for (let y = 0; y < BAND; y += 1) {
    const bg = [0, 1, 2].map((c) => median(Array.from({ length: w }, (_, x) => R.data[(y * w + x) * 3 + c])));
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 3;
      const d = Math.max(...[0, 1, 2].map((c) => Math.abs(R.data[i + c] - bg[c])));
      if (d > 8) mask[y * w + x] = 1;
    }
  }
  /* 2. Grown by 3 px, so every part keeps its own anti-aliased edge. */
  const grown = new Uint8Array(w * BAND);
  const r = 3;
  for (let y = 0; y < BAND; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!mask[y * w + x]) continue;
      for (let dy = -r; dy <= r; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= BAND) continue;
        for (let dx = -r; dx <= r; dx += 1) {
          const xx = x + dx;
          if (xx >= 0 && xx < w) grown[yy * w + xx] = 1;
        }
      }
    }
  }
  /* 3. The band's colour, row by row, from the target's own pixels outside the parts,
        smoothed over 9 rows. */
  const rows = [];
  for (let y = 0; y < BAND; y += 1) {
    const vals = [[], [], []];
    for (let x = 0; x < w; x += 1) {
      if (grown[y * w + x]) continue;
      const i = (y * w + x) * 3;
      for (let c = 0; c < 3; c += 1) vals[c].push(T.data[i + c]);
    }
    rows.push(vals.map(median));
  }
  const smooth = rows.map((_, y) => [0, 1, 2].map((c) => median(rows.slice(Math.max(0, y - 4), Math.min(BAND, y + 5)).map((v) => v[c]))));
  /* 4. Parts kept, the rest set to the band's colour. */
  const outBuf = Buffer.from(T.data);
  for (let y = 0; y < BAND; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (grown[y * w + x]) continue;
      const i = (y * w + x) * 3;
      outBuf[i] = smooth[y][0];
      outBuf[i + 1] = smooth[y][1];
      outBuf[i + 2] = smooth[y][2];
    }
  }
  await sharp(outBuf, { raw: { width: w, height: T.h, channels: 3 } }).png({ compressionLevel: 6, palette: false }).toFile(out);
  return out;
}
