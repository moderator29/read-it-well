/**
 * MEASURE THE LIGHT IN A REFERENCE RENDER, so nobody has to guess at it.
 *
 * The founder's ruling is that our primary controls are flat where every
 * reference image draws them lit: a gradient fill, a brighter rim along the
 * top edge, and a soft bloom thrown onto the surface underneath. A value
 * eyeballed off a screenshot is a value the next person re-guesses, so this
 * reads the pixels and prints numbers that can be written into the token
 * layer and into the ledger.
 *
 * WHAT IT MEASURES, and why each one is here:
 *
 *   THE FILL GRADIENT. The mean colour of each row inside the control, from
 *   its top edge to its bottom. A flat fill gives the same row twice; a
 *   gradient gives a slope, and the first and last rows are the stops.
 *
 *   THE TOP RIM. The brightest row in the top fifth of the control, reported
 *   as its lift over the fill immediately beneath it. This is the inset
 *   highlight, and it is the single cue that makes a glass control read as
 *   lit from above.
 *
 *   THE BLOOM. The excess brightness outside each edge over the surface the
 *   control sits on, sampled outwards until it dies. The radius is where the
 *   excess falls under 5 per cent of its peak, which is the point a blur
 *   stops being visible, and the peak excess is what the shadow's alpha has
 *   to reproduce.
 *
 * Usage:
 *   node scripts/design/measure-glow.mjs <image> <x> <y> <w> <h> [--label name]
 *   node scripts/design/measure-glow.mjs <image> --find <x> <y> <w> <h>
 *
 * `--find` locates the strongest blue control inside a search window and
 * prints its box, so a rectangle never has to be read off a ruler.
 */

import sharp from "sharp";

const argv = process.argv.slice(2);
const file = argv[0];
if (!file) {
  console.error("usage: measure-glow.mjs <image> <x> <y> <w> <h> | <image> --find <x> <y> <w> <h>");
  process.exit(2);
}

const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

const at = (x, y) => {
  const i = (y * width + x) * channels;
  return [data[i], data[i + 1], data[i + 2]];
};

/** Perceived brightness. Not a colour space, just a consistent ordering. */
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** A saturated blue: the fill of a primary control, never the page behind it. */
const isControlBlue = ([r, g, b]) => b > 120 && b - r > 50 && b >= g;

function meanRow(x0, x1, y) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let x = x0; x < x1; x++) {
    const p = at(x, y);
    r += p[0]; g += p[1]; b += p[2]; n++;
  }
  return [r / n, g / n, b / n];
}

function fmt([r, g, b]) {
  const hex = (v) => Math.round(v).toString(16).padStart(2, "0");
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)}) #${hex(r)}${hex(g)}${hex(b)} L=${lum([r, g, b]).toFixed(1)}`;
}

if (argv[1] === "--find") {
  const [sx, sy, sw, sh] = argv.slice(2, 6).map(Number);
  const rows = [];
  for (let y = sy; y < sy + sh; y++) {
    let n = 0;
    for (let x = sx; x < sx + sw; x++) if (isControlBlue(at(x, y))) n++;
    rows.push([y, n]);
  }
  const wide = rows.filter(([, n]) => n > sw * 0.4).map(([y]) => y);
  if (wide.length === 0) {
    console.log("no control-wide band of blue in that window");
    process.exit(0);
  }
  const top = wide[0];
  const bottom = wide[wide.length - 1];
  let left = sx + sw, right = sx;
  for (let y = top; y <= bottom; y++) {
    for (let x = sx; x < sx + sw; x++) {
      if (isControlBlue(at(x, y))) {
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  console.log(`box: x=${left} y=${top} w=${right - left + 1} h=${bottom - top + 1}`);
  process.exit(0);
}

const [x, y, w, h] = argv.slice(1, 5).map(Number);
const label = argv.includes("--label") ? argv[argv.indexOf("--label") + 1] : file;

console.log(`\n=== ${label} ===`);
console.log(`${file} ${width}x${height}, control x=${x} y=${y} w=${w} h=${h}`);

/* The middle sixty per cent, so a chevron or a label at either end cannot
   drag a row's mean away from the fill. */
const ix0 = x + Math.round(w * 0.2);
const ix1 = x + Math.round(w * 0.8);

console.log("\n-- the fill, row by row from the top edge --");
const rows = [];
for (let yy = y; yy < y + h; yy++) rows.push(meanRow(ix0, ix1, yy));
rows.forEach((c, i) => {
  if (i < 6 || i > h - 5 || i === Math.floor(h / 2)) {
    console.log(`  +${String(i).padStart(2)}  ${fmt(c)}`);
  }
});

const topFifth = rows.slice(0, Math.max(2, Math.round(h * 0.2)));
const brightest = topFifth.reduce((a, c) => (lum(c) > lum(a) ? c : a), topFifth[0]);
const brightestAt = topFifth.findIndex((c) => c === brightest);
const body = rows[Math.round(h * 0.45)];
const last = rows[h - 1];
console.log("\n-- the stops and the rim --");
console.log(`  top stop     ${fmt(rows[Math.min(2, h - 1)])}`);
console.log(`  bottom stop  ${fmt(last)}`);
console.log(`  rim          row +${brightestAt}, ${fmt(brightest)}`);
console.log(`  rim lift     L +${(lum(brightest) - lum(body)).toFixed(1)} over the fill beneath it`);

console.log("\n-- the bloom, outward from each edge --");
const cx = Math.round(x + w / 2);
const cy = Math.round(y + h / 2);
const REACH = 72;

function profile(name, step) {
  const samples = [];
  for (let d = 1; d <= REACH; d++) samples.push([d, lum(step(d))]);
  /* The floor is what the surface reads at the far end of the reach, where
     the light has certainly died. Everything else is measured over it. */
  const floor = Math.min(...samples.slice(-12).map(([, l]) => l));
  const excess = samples.map(([d, l]) => [d, l - floor]);
  const peak = Math.max(...excess.map(([, e]) => e));
  const dead = excess.find(([, e]) => e < peak * 0.05);
  console.log(
    `  ${name.padEnd(6)} peak +${peak.toFixed(1)}L at ${excess[0][0]}px, ` +
      `floor L=${floor.toFixed(1)}, dies at ${dead ? dead[0] : ">" + REACH}px`,
  );
  const marks = [2, 4, 8, 12, 16, 24, 32, 48].filter((d) => d <= REACH);
  console.log(
    `         ${marks.map((d) => `${d}px:+${(excess[d - 1][1]).toFixed(1)}`).join("  ")}`,
  );
}

profile("below", (d) => meanRow(ix0, ix1, Math.min(height - 1, y + h - 1 + d)));
profile("above", (d) => meanRow(ix0, ix1, Math.max(0, y - d)));
profile("right", (d) => at(Math.min(width - 1, x + w - 1 + d), cy));
profile("left", (d) => at(Math.max(0, x - d), cy));
console.log(`  surface far from the control: ${fmt(at(cx, Math.min(height - 1, y + h + 110)))}`);
