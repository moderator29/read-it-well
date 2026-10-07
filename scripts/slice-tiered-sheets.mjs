/**
 * Slice the founder's 6 October 2026 asset sheets into transparent webp objects.
 *
 * Run from the repository root:
 *
 *   node scripts/slice-tiered-sheets.mjs                 # slice, write, report
 *   node scripts/slice-tiered-sheets.mjs --dry           # measure only, write nothing
 *
 * It reads `docs/design/assets-raw/2026-10-06/` and `scripts/tiered-sheet-manifest.mjs`
 * and writes, per object, at 1x and 2x:
 *
 *   apps/web/public/brand/tier-b/<name>.webp  and  <name>@2x.webp     symbols (D29 tier B)
 *   apps/web/public/brand/tier-a/<name>.webp  and  <name>@2x.webp     real things (tier A)
 *   apps/web/public/brand/tier-a/scene/...                             wide scenes
 *   docs/design/assets-raw/2026-10-06/rejected/<tier>/<name>.webp      sliced, never shipped
 *
 * and `docs/design/assets-raw/2026-10-06/slice-report.json`, which is the audit trail.
 *
 * WHY THIS IS NOT `slice-icon-sheets.mjs`.
 *
 * That pipeline was built for glass on black and keys a GLOW: it measures the
 * brightest channel and lets the glow be the alpha ramp. These sheets are the
 * opposite material. They are matte or realistic objects with hard edges, and the
 * ground is either a baked checkerboard (tier B) or a real matte (tier A). Reusing
 * the glow keyer would have returned a grey wash around every object, so this is a
 * separate tool that shares only the idea (measure geometry, never assume a grid).
 *
 * THE CHECKERBOARD IS FAKE TRANSPARENCY AND IS KEYED OUT OF THE COLOUR.
 *
 * A pixel is ground when it is light in EVERY channel (214 or more): the checker
 * squares run 235 to 255, faintly blue-tinted beside an object, and every tier B
 * object is saturated royal blue, navy or orange, so one channel is always far lower. Ground that touches the
 * sheet edge is ground. Ground that is ENCLOSED (the inside of the empty picture
 * frame, the light through the door, the hole in a key or a trophy handle) is
 * ground too, but only when it is uniformly checker-like (at least 85 percent of it
 * within 36 of grey), so a tinted highlight inside an object is never punched through. The edge pixels, which are a blend of object and checker, are then
 * UNMIXED rather than thresholded: coverage is solved from the darkest channel
 * against the checker, and the colour is taken from the nearest solid interior
 * pixel, so no white fringe survives onto the dark night canvas.
 *
 * TIER A KEEPS ITS OWN MATTE and only has its edge decontaminated: the pixels in the
 * transparent area still hold the generator's navy glow, and a half-transparent edge
 * pixel carries some of it, which is a dark halo on paper.
 *
 * A CONSISTENT ORIGIN, WHICH IS WHAT D33 ASKS FOR.
 *
 * Each object is trimmed to its own opaque pixels, scaled so its longer edge fills a
 * fixed share of the canvas (80 percent for tier B, 86 for tier A), and placed so its
 * OPTICAL centre sits at the middle of the canvas. The optical centre is half the box
 * centre and half the alpha-weighted centre of mass: a trophy on a heavy plinth has
 * a box centre well above its weight, and centring the box alone makes it ride high.
 */

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { entry, NOT_ASSETS, OUT_DIR, RAW_DIR, SHEETS, TIERS } from "./tiered-sheet-manifest.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");
/* `--only 24C172B9,5BB888BE` re-cuts the named sheets alone (by filename prefix), for tuning. */
const onlyArg = process.argv.indexOf("--only");
const ONLY = onlyArg > 0 ? process.argv[onlyArg + 1].split(",").map((p) => p.toLowerCase()) : null;

/* Ground test for the baked checkerboard: light in every channel. See `keyChecker`. */
const GROUND_MIN = 214;
/* A solid object colour is at least this far from the checker in its darkest channel. */
const GROUND_LEVEL = 250;
/* Enclosed ground must be this large, and this uniformly neutral, to be punched through. */
const ENCLOSED_MIN_AREA = 24;
const ENCLOSED_NEUTRAL = 0.85;
/* A speck of object smaller than this is checker noise, not artwork. */
const SPECK_AREA = 120;
/* Alpha below this share is dropped after unmixing: it is a rounding of the ground. */
const ALPHA_FLOOR = 0.05;

/* ------------------------------------------------------------------ labelling */

/** 4-connected components of a 0/1 mask. Returns labels (0 = none) and per-label stats. */
function label(mask, w, h) {
  const labels = new Int32Array(w * h);
  const comps = [];
  const stack = new Int32Array(w * h);
  let next = 0;
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || labels[start]) continue;
    next += 1;
    let sp = 0;
    stack[sp++] = start;
    labels[start] = next;
    let area = 0;
    let sx = 0;
    let sy = 0;
    let x0 = w;
    let y0 = h;
    let x1 = 0;
    let y1 = 0;
    let border = false;
    while (sp) {
      const i = stack[--sp];
      const x = i % w;
      const y = (i - x) / w;
      area += 1;
      sx += x;
      sy += y;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) border = true;
      if (x > 0 && mask[i - 1] && !labels[i - 1]) { labels[i - 1] = next; stack[sp++] = i - 1; }
      if (x < w - 1 && mask[i + 1] && !labels[i + 1]) { labels[i + 1] = next; stack[sp++] = i + 1; }
      if (y > 0 && mask[i - w] && !labels[i - w]) { labels[i - w] = next; stack[sp++] = i - w; }
      if (y < h - 1 && mask[i + w] && !labels[i + w]) { labels[i + w] = next; stack[sp++] = i + w; }
    }
    comps.push({ id: next, area, cx: sx / area, cy: sy / area, x0, y0, x1, y1, border });
  }
  return { labels, comps };
}

/* ------------------------------------------------------------------ keying */

/**
 * Key a baked checkerboard out of an RGB sheet. Returns an RGBA buffer the size of
 * the sheet: solid pixels keep their colour, edge pixels get an unmixed alpha and the
 * colour of their nearest solid neighbour, ground is alpha 0.
 */
function keyChecker(rgb, w, h, ch) {
  const n = w * h;
  const px = (i) => i * ch;
  const cand = new Uint8Array(n);
  const neutral = new Uint8Array(n); // strictly neutral, for the enclosed test
  for (let i = 0; i < n; i += 1) {
    const r = rgb[px(i)];
    const g = rgb[px(i) + 1];
    const b = rgb[px(i) + 2];
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    /*
     * GROUND IS "LIGHT IN EVERY CHANNEL", NOT "GREY".
     *
     * The first version asked for a near-neutral pixel and left a white wedge on
     * the tick circle and white patches inside the trophy handles. The reason is in
     * the source: next to an object the generator tints its ground faintly blue (a
     * bounce of the object's colour), so the checker there is 235,240,255 and not
     * 250,250,250. Every tier B object has at least one channel well below 200
     * (royal blue, orange and navy all do), so "every channel at 214 or more" cannot
     * be artwork, whatever its tint. The one object this rule would eat is a pale
     * one, and the pale object is the receipt, which is rejected for exactly that.
     */
    if (mn >= GROUND_MIN) {
      cand[i] = 1;
      if (mx - mn <= 36) neutral[i] = 1;
    }
  }
  const { labels, comps } = label(cand, w, h);
  const neutralCount = new Int32Array(comps.length + 1);
  for (let i = 0; i < n; i += 1) if (labels[i] && neutral[i]) neutralCount[labels[i]] += 1;
  const ground = new Uint8Array(n);
  const isGround = new Uint8Array(comps.length + 1);
  for (const c of comps) {
    if (c.border) isGround[c.id] = 1;
    else if (c.area >= ENCLOSED_MIN_AREA && neutralCount[c.id] / c.area >= ENCLOSED_NEUTRAL) isGround[c.id] = 1;
  }
  for (let i = 0; i < n; i += 1) if (labels[i] && isGround[labels[i]]) ground[i] = 1;

  /* Object mask, minus specks. */
  const obj = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) obj[i] = ground[i] ? 0 : 1;
  const objLab = label(obj, w, h);
  const specks = new Set(objLab.comps.filter((c) => c.area < SPECK_AREA).map((c) => c.id));
  if (specks.size) for (let i = 0; i < n; i += 1) if (specks.has(objLab.labels[i])) obj[i] = 0;

  /* Ring: object pixels within 2px of ground. Interior: the rest. */
  const ring = new Uint8Array(n);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      if (!obj[i]) continue;
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) { near = true; break; }
        for (let dx = -2; dx <= 2; dx += 1) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) { near = true; break; }
          if (!obj[yy * w + xx]) { near = true; break; }
        }
      }
      if (near) ring[i] = 1;
    }
  }

  /* Colour propagation: ring pixels take the colour of the nearest solid interior pixel. */
  const out = new Uint8ClampedArray(n * 4);
  const set = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) {
    if (obj[i] && !ring[i]) {
      out[i * 4] = rgb[px(i)];
      out[i * 4 + 1] = rgb[px(i) + 1];
      out[i * 4 + 2] = rgb[px(i) + 2];
      out[i * 4 + 3] = 255;
      set[i] = 1;
    }
  }
  const pending = [];
  for (let i = 0; i < n; i += 1) if (ring[i]) pending.push(i);
  for (let pass = 0; pass < 6 && pending.length; pass += 1) {
    const fill = [];
    const rest = [];
    for (const i of pending) {
      const x = i % w;
      const y = (i - x) / w;
      let r = 0;
      let g = 0;
      let b = 0;
      let c = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue;
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (set[j]) { r += out[j * 4]; g += out[j * 4 + 1]; b += out[j * 4 + 2]; c += 1; }
        }
      }
      if (c) fill.push([i, r / c, g / c, b / c]);
      else rest.push(i);
    }
    for (const [i, r, g, b] of fill) {
      out[i * 4] = r;
      out[i * 4 + 1] = g;
      out[i * 4 + 2] = b;
      set[i] = 1;
    }
    pending.length = 0;
    pending.push(...rest);
  }
  /* Unmix coverage from the darkest channel against the checker. */
  for (let i = 0; i < n; i += 1) {
    if (!ring[i]) continue;
    if (!set[i]) { out[i * 4 + 3] = 0; continue; }
    const pmin = Math.min(rgb[px(i)], rgb[px(i) + 1], rgb[px(i) + 2]);
    const cmin = Math.min(out[i * 4], out[i * 4 + 1], out[i * 4 + 2]);
    let a = 1;
    if (GROUND_LEVEL - cmin > 40) a = (GROUND_LEVEL - pmin) / (GROUND_LEVEL - cmin);
    a = Math.max(0, Math.min(1, a));
    out[i * 4 + 3] = a < ALPHA_FLOOR ? 0 : Math.round(a * 255);
  }
  return { rgba: out, obj };
}

/* ------------------------------------------------------------------ tier A */

/**
 * Tier A has a real matte. Keep it, drop the haze, and decontaminate the half
 * transparent edge pixels: their colour still carries the generator's navy glow.
 */
function keyAlpha(rgba, w, h) {
  const n = w * h;
  const out = new Uint8ClampedArray(rgba);
  const obj = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) {
    const a = rgba[i * 4 + 3];
    obj[i] = a >= 128 ? 1 : 0;
    if (a <= 6) out[i * 4 + 3] = 0;
  }
  /*
   * DROP THE HAZE. The generator's matte is clean along most of the edge but
   * leaves soft blue wisps beside some objects (the left and right of the
   * mansion, the serviced block and the small house): alpha 10 to 120 over a
   * dozen pixels, invisible on night and a visible smudge on paper. A genuine
   * soft edge is one or two pixels wide, so a half-transparent pixel survives
   * only within 2px of a SOLID one (alpha 128 or more). Anything further out is
   * haze and goes. The one real thin translucent thing on the sheets, the
   * borehole's water stream, is solid in its core and keeps its core.
   */
  const solidNear = new Uint8Array(n);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!obj[y * w + x]) continue;
      for (let dy = -2; dy <= 2; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -2; dx <= 2; dx += 1) {
          const xx = x + dx;
          if (xx >= 0 && xx < w) solidNear[yy * w + xx] = 1;
        }
      }
    }
  }
  for (let i = 0; i < n; i += 1) if (!solidNear[i]) out[i * 4 + 3] = 0;
  const solid = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) solid[i] = rgba[i * 4 + 3] >= 250 ? 1 : 0;
  /* A half transparent pixel takes the nearest solid colour, so no navy halo survives. */
  const set = new Uint8Array(solid);
  const colour = new Uint8ClampedArray(n * 3);
  for (let i = 0; i < n; i += 1) {
    if (solid[i]) { colour[i * 3] = rgba[i * 4]; colour[i * 3 + 1] = rgba[i * 4 + 1]; colour[i * 3 + 2] = rgba[i * 4 + 2]; }
  }
  let pending = [];
  for (let i = 0; i < n; i += 1) {
    const a = rgba[i * 4 + 3];
    if (a > 6 && a < 250) pending.push(i);
  }
  const edge = pending.slice();
  for (let pass = 0; pass < 3 && pending.length; pass += 1) {
    const fill = [];
    const rest = [];
    for (const i of pending) {
      const x = i % w;
      const y = (i - x) / w;
      let r = 0;
      let g = 0;
      let b = 0;
      let c = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue;
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (set[j]) { r += colour[j * 3]; g += colour[j * 3 + 1]; b += colour[j * 3 + 2]; c += 1; }
        }
      }
      if (c) fill.push([i, r / c, g / c, b / c]);
      else rest.push(i);
    }
    for (const [i, r, g, b] of fill) {
      colour[i * 3] = r;
      colour[i * 3 + 1] = g;
      colour[i * 3 + 2] = b;
      set[i] = 1;
    }
    pending = rest;
  }
  /*
   * Only the OUTER edge is decontaminated, where the edge pixel sits within two
   * pixels of an empty one. A thin semi-transparent object (the water stream) has
   * no solid neighbour to borrow from and keeps its own colour.
   */
  for (const i of edge) {
    if (!set[i]) continue;
    const x = i % w;
    const y = (i - x) / w;
    let nearEmpty = false;
    for (let dy = -2; dy <= 2 && !nearEmpty; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        if (out[(yy * w + xx) * 4 + 3] <= 6) { nearEmpty = true; break; }
      }
    }
    if (nearEmpty) {
      out[i * 4] = colour[i * 3];
      out[i * 4 + 1] = colour[i * 3 + 1];
      out[i * 4 + 2] = colour[i * 3 + 2];
    }
  }
  return { rgba: out, obj };
}

/* ------------------------------------------------------------------ cutting */

/**
 * Assign each component of artwork to its grid cell by centroid.
 *
 * `core` is the mask that is labelled, and it is deliberately the SOLID artwork
 * (alpha 128 and up on a tier A sheet), not everything with a trace of alpha.
 * At a threshold of 24 on the buildings sheet the soft contact shadows of one row
 * touch the roofs of the next and the whole sheet comes back as chains of merged
 * objects; at 128 it comes back as exactly 32. The thin half-transparent edge that
 * the high threshold leaves out is then GROWN back onto its owner, three pixels
 * deep, so the cut keeps its soft edge and a neighbour's wisp is never claimed.
 *
 * The rows are NOT assumed uniform. The buildings sheet has a 19px top margin and
 * its rows are 156px apart, so dividing the height by eight puts the first row's
 * canopy in the second row's cell; centroids of whole components do not care.
 */
function assignCells(core, rgba, w, h, cols, rows, file, cluster) {
  const { labels, comps } = label(core, w, h);
  const owner = new Int32Array(comps.length + 1).fill(-1);
  const cells = Array.from({ length: cols * rows }, () => ({ ids: new Set(), x0: w, y0: h, x1: 0, y1: 0, area: 0 }));
  const real = comps.filter((c) => c.area >= SPECK_AREA);
  const place = (c, row, col) => {
    owner[c.id] = row * cols + col;
    cells[row * cols + col].ids.add(c.id);
    cells[row * cols + col].area += c.area;
  };
  if (cluster) {
    /*
     * A sheet whose rows are not evenly pitched: cluster the components' centres
     * into the declared number of rows (1-D k-means), then each row into its
     * columns. Only used where every object is ONE solid component, because a
     * fragmented object (a ring of rays) would be split across clusters.
     */
    const kmeans = (values, k) => {
      const sorted = [...values].sort((a, b) => a - b);
      let centres = Array.from({ length: k }, (_, i) => sorted[Math.floor(((i + 0.5) / k) * sorted.length)]);
      for (let it = 0; it < 40; it += 1) {
        const sum = new Array(k).fill(0);
        const cnt = new Array(k).fill(0);
        for (const v of values) {
          let best = 0;
          for (let j = 1; j < k; j += 1) if (Math.abs(v - centres[j]) < Math.abs(v - centres[best])) best = j;
          sum[best] += v;
          cnt[best] += 1;
        }
        centres = centres.map((c, j) => (cnt[j] ? sum[j] / cnt[j] : c));
      }
      return centres.sort((a, b) => a - b);
    };
    const nearest = (v, centres) => centres.reduce((best, c, j) => (Math.abs(v - c) < Math.abs(v - centres[best]) ? j : best), 0);
    const rowCentres = kmeans(real.map((c) => c.cy), rows);
    const byRow = Array.from({ length: rows }, () => []);
    for (const c of real) byRow[nearest(c.cy, rowCentres)].push(c);
    byRow.forEach((members, row) => {
      const colCentres = kmeans(members.map((c) => c.cx), cols);
      for (const c of members) place(c, row, nearest(c.cx, colCentres));
    });
  } else {
    for (const c of real) {
      place(c, Math.min(rows - 1, Math.floor((c.cy / h) * rows)), Math.min(cols - 1, Math.floor((c.cx / w) * cols)));
    }
  }
  cells.forEach((cell, i) => {
    if (!cell.ids.size) throw new Error(`${file}: cell ${i + 1} has no artwork. Fix the declared grid, not the threshold.`);
  });
  /* Grow the soft edge back onto its owner. */
  for (let pass = 0; pass < 3; pass += 1) {
    const claim = [];
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const i = y * w + x;
        if (labels[i] || rgba[i * 4 + 3] <= 6) continue;
        const l = labels[i - 1] || labels[i + 1] || labels[i - w] || labels[i + w];
        if (l && owner[l] >= 0) claim.push(i, l);
      }
    }
    for (let k = 0; k < claim.length; k += 2) labels[claim[k]] = claim[k + 1];
  }
  for (let i = 0; i < w * h; i += 1) {
    const l = labels[i];
    if (!l || owner[l] < 0) continue;
    const cell = cells[owner[l]];
    const x = i % w;
    const y = (i - x) / w;
    if (x < cell.x0) cell.x0 = x;
    if (x > cell.x1) cell.x1 = x;
    if (y < cell.y0) cell.y0 = y;
    if (y > cell.y1) cell.y1 = y;
  }
  return { labels, cells };
}

/** The optical centre of a cut object, in cut-local pixels, and its box. */
function optical(rgba, cw, ch) {
  let x0 = cw;
  let y0 = ch;
  let x1 = -1;
  let y1 = -1;
  let m = 0;
  let mx = 0;
  let my = 0;
  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      const a = rgba[(y * cw + x) * 4 + 3];
      if (a < 20) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      m += a;
      mx += a * x;
      my += a * y;
    }
  }
  const bx = (x0 + x1 + 1) / 2;
  const by = (y0 + y1 + 1) / 2;
  return { x0, y0, x1, y1, bw: x1 - x0 + 1, bh: y1 - y0 + 1, ox: 0.5 * bx + 0.5 * (mx / m), oy: 0.5 * by + 0.5 * (my / m), bx, by };
}

/**
 * Light-mode legibility: mean contrast ratio of the object's EDGE colour against
 * #F4F4F1. An edge pixel is a solid-enough pixel (alpha 128 or more) with a nearly
 * empty pixel (alpha 40 or less) within two pixels of it. WCAG asks 3:1 for a
 * graphical object; the colour compared is the object's own, not the half-blended
 * one, because the antialiasing ramp is not what a person reads as the edge.
 */
function paperContrast(rgba, w, h) {
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const paper = L(0xf4, 0xf4, 0xf1);
  let sum = 0;
  let count = 0;
  let low = 0;
  for (let y = 2; y < h - 2; y += 1) {
    for (let x = 2; x < w - 2; x += 1) {
      const i = y * w + x;
      if (rgba[i * 4 + 3] < 128) continue;
      let edge = false;
      for (let dy = -2; dy <= 2 && !edge; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          if (rgba[((y + dy) * w + (x + dx)) * 4 + 3] <= 40) { edge = true; break; }
        }
      }
      if (!edge) continue;
      const l = L(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
      const ratio = (Math.max(l, paper) + 0.05) / (Math.min(l, paper) + 0.05);
      sum += ratio;
      if (ratio < 3) low += 1;
      count += 1;
    }
  }
  return count ? { mean: sum / count, lowShare: low / count, edgePixels: count } : { mean: 0, lowShare: 1, edgePixels: 0 };
}

/** Share of edge pixels that are noticeably darker than the solid pixels beside them: a halo. */
function fringeShare(rgba, w, h) {
  let edge = 0;
  let dark = 0;
  const lum = (i) => 0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2];
  for (let y = 2; y < h - 2; y += 1) {
    for (let x = 2; x < w - 2; x += 1) {
      const i = y * w + x;
      const a = rgba[i * 4 + 3];
      if (a < 30 || a > 225) continue;
      /* nearest solid pixel within 2px */
      let best = -1;
      for (let dy = -2; dy <= 2 && best < 0; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const j = (y + dy) * w + (x + dx);
          if (rgba[j * 4 + 3] >= 250) { best = j; break; }
        }
      }
      if (best < 0) continue;
      edge += 1;
      if (lum(best) - lum(i) > 45) dark += 1;
    }
  }
  return edge ? dark / edge : 0;
}

async function cutObject({ rgba, labels, cell, w }, tier, edgeOverride, fitOverride) {
  const x0 = cell.x0;
  const y0 = cell.y0;
  const cw = cell.x1 - cell.x0 + 1;
  const ch = cell.y1 - cell.y0 + 1;
  const cut = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      const src = (y0 + y) * w + (x0 + x);
      if (!cell.ids.has(labels[src])) continue;
      const k = (y * cw + x) * 4;
      cut[k] = rgba[src * 4];
      cut[k + 1] = rgba[src * 4 + 1];
      cut[k + 2] = rgba[src * 4 + 2];
      cut[k + 3] = rgba[src * 4 + 3];
    }
  }
  const o = optical(cut, cw, ch);
  const spec = { ...TIERS[tier], ...(fitOverride ? { fit: fitOverride, weight: undefined } : {}) };
  const E = edgeOverride ?? spec.edge2x;
  /*
   * SCALE. Tier B fits the longer edge, which is right for symbols drawn to a
   * common cell. Tier A is buildings and machines of very different proportions
   * (a 5:2 villa beside a 1:1.5 tower), and fitting the longer edge makes every
   * wide building a sliver beside a tall one: the first contact sheet showed the
   * mansion and the warehouse at half the presence of the apartment block. So tier
   * A is sized by the geometric mean of its box (its visual weight), then capped so
   * the longer edge still stays inside the frame.
   */
  const scale =
    spec.weight !== undefined
      ? Math.min((E * spec.weight) / Math.sqrt(o.bw * o.bh), (E * spec.fit) / Math.max(o.bw, o.bh))
      : (E * spec.fit) / Math.max(o.bw, o.bh);
  const sw = Math.max(1, Math.round(o.bw * scale));
  const sh = Math.max(1, Math.round(o.bh * scale));
  /* The cut is trimmed to its box, resized, then placed so the optical centre is the canvas centre. */
  const trimmed = await sharp(Buffer.from(cut.buffer), { raw: { width: cw, height: ch, channels: 4 } })
    .extract({ left: o.x0, top: o.y0, width: o.bw, height: o.bh })
    .resize(sw, sh, { kernel: "lanczos3" })
    .png()
    .toBuffer();
  const ox = (o.ox - o.x0) * scale;
  const oy = (o.oy - o.y0) * scale;
  let left = Math.round(E / 2 - ox);
  let top = Math.round(E / 2 - oy);
  /* Never let the optical shift push the box past a 4 percent margin. */
  const margin = Math.round(E * 0.04);
  left = Math.max(margin, Math.min(E - margin - sw, left));
  top = Math.max(margin, Math.min(E - margin - sh, top));
  const master = await sharp({ create: { width: E, height: E, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: trimmed, left, top }])
    .png()
    .toBuffer();
  return { master, native: Math.max(o.bw, o.bh), scale, box: { w: sw, h: sh, left, top } };
}

/* ------------------------------------------------------------------ main */

async function writeWebp(master, tier, dir, name, root = OUT_DIR, edge2x = TIERS[tier].edge2x) {
  const spec = { ...TIERS[tier], edge2x };
  const base = path.join(ROOT, root, dir);
  await mkdir(base, { recursive: true });
  const opts = { quality: spec.quality, alphaQuality: 100, effort: 6, smartSubsample: true };
  const two = await sharp(master).webp(opts).toBuffer();
  const one = await sharp(master)
    .resize(spec.edge2x / 2, spec.edge2x / 2, { kernel: "lanczos3" })
    .webp(opts)
    .toBuffer();
  if (!DRY) {
    await writeFile(path.join(base, `${name}@2x.webp`), two);
    await writeFile(path.join(base, `${name}.webp`), one);
  }
  return { bytes1x: one.length, bytes2x: two.length };
}

const report = { generatedFrom: RAW_DIR, sheets: [], notAssets: NOT_ASSETS, totals: { objects: 0, rejected: 0, bytes: 0 } };

if (!DRY && !ONLY) {
  for (const t of Object.values(TIERS)) await rm(path.join(ROOT, OUT_DIR, t.dir), { recursive: true, force: true });
  await rm(path.join(ROOT, OUT_DIR, "rejected"), { recursive: true, force: true });
  await rm(path.join(ROOT, RAW_DIR, "rejected"), { recursive: true, force: true });
}

for (const sheet of SHEETS) {
  if (ONLY && !ONLY.some((p) => sheet.file.toLowerCase().startsWith(p))) continue;
  const src = path.join(ROOT, RAW_DIR, sheet.file);
  const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info;
  let rgba;
  let obj;
  if (sheet.keying === "checker") {
    ({ rgba, obj } = keyChecker(data, w, h, channels));
  } else {
    if (channels !== 4) throw new Error(`${sheet.file}: declared alpha keying but the file has ${channels} channels.`);
    ({ rgba, obj } = keyAlpha(new Uint8ClampedArray(data), w, h));
  }
  const { labels, cells } = assignCells(obj, rgba, w, h, sheet.cols, sheet.rows, sheet.file, sheet.cluster);
  if (cells.length !== sheet.names.length) {
    throw new Error(`${sheet.file}: the grid has ${cells.length} cells and the manifest names ${sheet.names.length}.`);
  }
  const rows = [];
  for (let i = 0; i < cells.length; i += 1) {
    const item = entry(sheet.names[i]);
    if (item.noFile) {
      /* Rejected for a reason that is about the artwork's colour, so the key cannot cut it honestly. */
      report.totals.objects += 1;
      report.totals.rejected += 1;
      rows.push({ index: i + 1, name: item.name, tier: sheet.tier, path: null, rejected: item.reject, notCut: true });
      continue;
    }
    const E = sheet.edge2x ?? TIERS[sheet.tier].edge2x;
    const { master, native, scale, box } = await cutObject({ rgba, labels, cell: cells[i], w }, sheet.tier, E, sheet.scene ? 0.9 : undefined);
    /* Measure on the master, which is what ships. */
    const raw = await sharp(master).raw().toBuffer();
    const contrast = paperContrast(raw, E, E);
    const fringe = fringeShare(raw, E, E);
    /* A rejected object is kept for comparison beside the sources, NEVER under public/. */
    const dir = item.reject ? path.join("rejected", sheet.tier) : sheet.scene ? path.join(TIERS[sheet.tier].dir, "scene") : TIERS[sheet.tier].dir;
    const bytes = await writeWebp(master, sheet.tier, dir, item.name, item.reject ? RAW_DIR : OUT_DIR, E);
    report.totals.objects += 1;
    if (item.reject) report.totals.rejected += 1;
    else report.totals.bytes += bytes.bytes1x + bytes.bytes2x;
    rows.push({
      index: i + 1,
      name: item.name,
      tier: sheet.tier,
      path: `${dir.split(path.sep).join("/")}/${item.name}`,
      root: item.reject ? RAW_DIR : OUT_DIR,
      sourceEdge: native,
      scale: Number(scale.toFixed(3)),
      upscaled: scale > 1,
      paperContrast: Number(contrast.mean.toFixed(2)),
      paperLowShare: Number(contrast.lowShare.toFixed(3)),
      fringeShare: Number(fringe.toFixed(3)),
      bytes1x: bytes.bytes1x,
      bytes2x: bytes.bytes2x,
      edge2x: E,
      box,
      ...(item.reject ? { rejected: item.reject } : {}),
    });
  }
  report.sheets.push({ file: sheet.file, tier: sheet.tier, keying: sheet.keying, group: sheet.group, size: `${w}x${h}`, objects: rows });
  console.log(`${sheet.file.slice(0, 8)}  tier ${sheet.tier.toUpperCase()}  ${sheet.keying.padEnd(7)}  ${String(rows.length).padStart(2)} objects  ${sheet.group}`);
}

if (!DRY && ONLY) {
  /* A partial run replaces just its own sheets in the existing report. */
  const prev = JSON.parse(await readFile(path.join(ROOT, RAW_DIR, "slice-report.json"), "utf8"));
  const kept = prev.sheets.filter((p) => !report.sheets.some((n) => n.file === p.file));
  report.sheets = [...kept, ...report.sheets].sort((x, y) => SHEETS.findIndex((q) => q.file === x.file) - SHEETS.findIndex((q) => q.file === y.file));
  report.totals = { objects: 0, rejected: 0, bytes: 0 };
  for (const sh of report.sheets) {
    for (const o of sh.objects) {
      report.totals.objects += 1;
      if (o.rejected) report.totals.rejected += 1;
      else report.totals.bytes += o.bytes1x + o.bytes2x;
    }
  }
}
if (!DRY) {
  await writeFile(path.join(ROOT, RAW_DIR, "slice-report.json"), JSON.stringify(report, null, 1) + "\n", "utf8");
}
console.log(
  `\n${report.totals.objects} objects (${report.totals.rejected} rejected), ${(report.totals.bytes / 1024).toFixed(0)} KB of shipped webp` +
    (DRY ? " (dry run, nothing written)" : ""),
);
