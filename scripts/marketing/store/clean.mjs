/**
 * Three captures were taken scrolled, and the app's header is translucent: the labels
 * scrolled under it (the home screen's "Buy Rent Pay List", the help centre's "Report a
 * problem · Write to us · Help centre" and its search box) show through it as faint ghost
 * text beside the logo. At the store's size that reads as a rendering fault, so for these
 * three the header band alone is cleaned before the display goes on a phone:
 *
 *   - the band is the status bar and the header, from the top to the header's hairline;
 *   - the header's own parts (the time and status icons, the menu, the logo with its glow,
 *     the bell button) are found on a capture of the same header taken unscrolled (the
 *     reference) and kept exactly as captured, with a soft edge;
 *   - the rest of the band, and the inside of the bell button around its glyph, take the
 *     band's own colour (the button's own fill inside it), row by row.
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
/* On every 1320 x 2868 display the header's hairline is at y 366, and its bell button is
   a disc about 66 px in radius centred on (1204, 275). */
const BAND = 365;
const BELL = { x: 1204, y: 275, inner: 60, outer: 70 };

async function raw(file) {
  const { data, info } = await sharp(file).removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function median(values, n) {
  const s = values.subarray(0, n).sort();
  return n ? s[n >> 1] : 0;
}

/** The reference's own background, per row, as a running median over 301 px. */
function background(R, w) {
  const bg = new Float32Array(w * BAND * 3);
  const step = 50;
  const half = 150;
  const buf = new Float64Array(2 * half + 1);
  for (let y = 0; y < BAND; y += 1) {
    const centres = [];
    for (let cx = 0; cx <= w - 1 + step; cx += step) centres.push(Math.min(cx, w - 1));
    const med = centres.map((cx) => [0, 1, 2].map((c) => {
      let n = 0;
      for (let x = Math.max(0, cx - half); x <= Math.min(w - 1, cx + half); x += 1) buf[n++] = R.data[(y * w + x) * 3 + c];
      return median(buf, n);
    }));
    for (let x = 0; x < w; x += 1) {
      const k = Math.min(centres.length - 2, Math.floor(x / step));
      const t = Math.max(0, Math.min(1, (x - centres[k]) / Math.max(1, centres[k + 1] - centres[k])));
      for (let c = 0; c < 3; c += 1) bg[(y * w + x) * 3 + c] = med[k][c] * (1 - t) + med[k + 1][c] * t;
    }
  }
  return bg;
}

/** Grow a soft mask by `r` px (a max filter). */
function grow(m, w, h, r) {
  const tmp = new Float32Array(m.length);
  const out = new Float32Array(m.length);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let v = 0;
      for (let dx = -r; dx <= r; dx += 1) {
        const xx = x + dx;
        if (xx >= 0 && xx < w && m[y * w + xx] > v) v = m[y * w + xx];
      }
      tmp[y * w + x] = v;
    }
  }
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let v = 0;
      for (let dy = -r; dy <= r; dy += 1) {
        const yy = y + dy;
        if (yy >= 0 && yy < h && tmp[yy * w + x] > v) v = tmp[yy * w + x];
      }
      out[y * w + x] = v;
    }
  }
  return out;
}

/** Write the cleaned display for `id` on `store` (if not cached) and return its path. */
export async function cleanDisplay(id, store) {
  const plat = STORES[store].screen;
  const src = join(SCREENS, `${id}-${plat}.png`);
  const ref = join(SCREENS, `${CLEAN[id]}-${plat}.png`);
  mkdirSync(CACHE, { recursive: true });
  const stamp = `${Math.round(statSync(src).mtimeMs)}-${Math.round(statSync(ref).mtimeMs)}-v3`;
  const out = join(CACHE, `${id}-${plat}-${stamp}.png`);
  if (existsSync(out)) return out;

  const T = await raw(src);
  const R = await raw(ref);
  if (T.w !== R.w || T.h !== R.h) throw new Error(`clean: ${id} and ${CLEAN[id]} differ in size`);
  const { w } = T;
  const n = w * BAND;
  const px = (A, i, c) => A.data[i * 3 + c];
  const rBell = (x, y) => Math.hypot(x - BELL.x, y - BELL.y);

  /* 1. Where the reference's parts are: how far each pixel stands out from its own
        background. The solid parts (from 20 levels up, fully from 36, grown by 1 px)
        are kept from the capture; their soft glow is carried over from the reference
        onto the band's colour instead, since the ghost text shows through it. */
  const bg = background(R, w);
  const part = new Float32Array(n);
  const glow = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    let d = 0;
    for (let c = 0; c < 3; c += 1) {
      const v = px(R, i, c) - bg[i * 3 + c];
      d = Math.max(d, Math.abs(v));
      glow[i * 3 + c] = Math.max(0, v);
    }
    part[i] = Math.max(0, Math.min(1, (d - 20) / 16));
  }
  const keep = grow(part, w, BAND, 1);
  const quiet = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    let d = 0;
    for (let c = 0; c < 3; c += 1) d = Math.max(d, Math.abs(px(R, i, c) - bg[i * 3 + c]));
    quiet[i] = d > 4 ? 1 : 0;
  }
  const busy = grow(quiet, w, BAND, 2);

  /* 2. Inside the bell button: its glyph and dot against the button's own fill. */
  const fillRef = [[], [], []];
  for (let y = BELL.y - BELL.inner; y <= BELL.y + BELL.inner; y += 1) {
    for (let x = BELL.x - BELL.inner; x <= BELL.x + BELL.inner; x += 1) {
      if (rBell(x, y) < BELL.inner - 6) for (let c = 0; c < 3; c += 1) fillRef[c].push(px(R, y * w + x, c));
    }
  }
  const fr = fillRef.map((a) => median(Float64Array.from(a), a.length));
  const glyph = new Float32Array(n);
  for (let y = BELL.y - BELL.inner; y <= BELL.y + BELL.inner; y += 1) {
    for (let x = BELL.x - BELL.inner; x <= BELL.x + BELL.inner; x += 1) {
      const i = y * w + x;
      let d = 0;
      for (let c = 0; c < 3; c += 1) d = Math.max(d, Math.abs(px(R, i, c) - fr[c]));
      glyph[i] = Math.max(0, Math.min(1, (d - 10) / 20));
    }
  }
  const glyphKeep = grow(glyph, w, BAND, 2);
  const inDisc = (x, y) => rBell(x, y) < BELL.inner;
  const inRing = (x, y) => rBell(x, y) >= BELL.inner && rBell(x, y) <= BELL.outer;

  /* 3. The colours to fill with: the band's per row (smoothed over 9 rows) and the
        button's fill, both from the capture's own pixels where nothing else is. */
  const rows = [];
  const buf = new Float64Array(w);
  for (let y = 0; y < BAND; y += 1) {
    rows.push([0, 1, 2].map((c) => {
      let k = 0;
      for (let x = 0; x < w; x += 1) {
        const i = y * w + x;
        if (busy[i] === 0 && rBell(x, y) > BELL.outer) buf[k++] = px(T, i, c);
      }
      return median(buf, k);
    }));
  }
  const band = rows.map((_, y) => [0, 1, 2].map((c) => {
    const win = rows.slice(Math.max(0, y - 4), Math.min(BAND, y + 5)).map((v) => v[c]);
    return median(Float64Array.from(win), win.length);
  }));
  const fillT = [[], [], []];
  for (let y = BELL.y - BELL.inner; y <= BELL.y + BELL.inner; y += 1) {
    for (let x = BELL.x - BELL.inner; x <= BELL.x + BELL.inner; x += 1) {
      const i = y * w + x;
      if (rBell(x, y) < BELL.inner - 6 && glyphKeep[i] === 0) for (let c = 0; c < 3; c += 1) fillT[c].push(px(T, i, c));
    }
  }
  const fill = fillT.map((a) => median(Float64Array.from(a), a.length));

  /* 4. Blend. */
  const o = Buffer.from(T.data);
  for (let y = 0; y < BAND; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      let k;
      let to;
      if (inDisc(x, y)) {
        k = glyphKeep[i];
        to = fill;
      } else if (inRing(x, y)) {
        k = 1;
        to = band[y];
      } else {
        k = keep[i];
        to = [0, 1, 2].map((c) => band[y][c] + glow[i * 3 + c]);
      }
      for (let c = 0; c < 3; c += 1) o[i * 3 + c] = Math.max(0, Math.min(255, Math.round(px(T, i, c) * k + to[c] * (1 - k))));
    }
  }
  await sharp(o, { raw: { width: w, height: T.h, channels: 3 } }).png({ compressionLevel: 6, palette: false }).toFile(out);
  return out;
}
