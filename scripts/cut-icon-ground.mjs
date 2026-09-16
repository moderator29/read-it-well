/**
 * Cut the ground out of the sliced glass icons.
 *
 * Run from the repository root, after `slice-icon-sheets.mjs`:
 *
 *   node scripts/cut-icon-ground.mjs
 *
 * WHY A THRESHOLD IS THE WRONG TOOL HERE, AND WHAT IS USED INSTEAD.
 *
 * The obvious approach is to pick a darkness below which a pixel is background
 * and delete it. On this artwork it produces exactly the dirty halo the brief
 * forbids: these objects GLOW, the glow fades continuously into the ground over
 * forty or fifty pixels, and any threshold cuts that ramp at some arbitrary
 * point. Above the line you keep dark navy pixels that look like grime on a pale
 * surface; below it you amputate the bloom, which is half of what makes the mark
 * look like the logo.
 *
 * The right tool follows from what the artwork physically is. **A glowing object
 * on black is additive light.** The render is close to `object + black`, so the
 * ground contributes almost nothing and brightness IS opacity. So:
 *
 *   alpha = luminance, normalised between a floor and a ceiling
 *   colour = the pixel, unpremultiplied by that alpha
 *
 * This is not an approximation of a cutout, it is the inverse of how the image
 * was formed. Composite the result back onto black and you get the original
 * pixel for pixel. Composite it onto navy, onto a glass card, onto white, and
 * the glow falls off smoothly with no edge anywhere, because there is no edge:
 * the alpha ramp is the glow.
 *
 * THE FLOOR AND THE CEILING, AND WHY THEY ARE NOT ZERO AND 255.
 *
 * The floor lifts pure ground to zero alpha. The sheets are not pure black, they
 * carry a faint navy field and, because the objects were laid out densely, a
 * little bloom from the neighbouring mark. Without a floor that field survives
 * as a grey wash across the whole square.
 *
 * The ceiling makes the object's own body fully opaque rather than leaving it at
 * the eighty per cent its mid tones would otherwise get. Without it every mark
 * looks slightly washed out.
 *
 * UNPREMULTIPLYING IS THE STEP THAT IS EASY TO SKIP AND VISIBLE WHEN YOU DO.
 *
 * A pixel at half brightness is either a bright colour at half opacity or a dark
 * colour at full opacity, and on black those are identical. Dividing the colour
 * through by the alpha recovers the first reading, which is the correct one for
 * light. Skip it and every semi-transparent pixel, which is the entire glow,
 * comes out too dark and the halo returns by another route.
 *
 * WHAT THIS DOES NOT SOLVE, AND IT IS IMPORTANT.
 *
 * It is correct for additive light on a dark ground. It is NOT correct for the
 * LIGHT twin, where the artwork is dark on white and nothing is additive. That
 * sheet is keyed on distance from white instead, which is the matching inverse,
 * and it is honest about being a weaker result: a frosted white object on white
 * has genuine edge ambiguity that no key resolves.
 *
 * And a glass object is not a sticker. Its body is meant to be see-through. The
 * alpha this produces is therefore partial across the tile interior, which is
 * correct on a dark surface and reads thin on a pale one. That is not a bug in
 * the cut, it is the reason the light theme needs its own artwork rather than
 * the same file recoloured, which is the recommendation in docs/BRAND_MARKS.md.
 */

import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SLICED = path.join(ROOT, "assets/brand-sliced");
const OUT = path.join(ROOT, "assets/brand-cut");

/** Sheets rendered on white. Everything else is treated as light on black. */
const LIGHT_SHEETS = new Set(["c0f67033"]);

/** Below this luminance a pixel is ground and gets no alpha at all. */
const FLOOR = 26;

/** At and above this luminance a pixel is fully opaque. */
const CEIL = 150;

/** On a white sheet, distance from white at which a pixel becomes fully opaque. */
const LIGHT_SPAN = 120;

/** Ground on a white sheet, below this distance from white alpha is zero. */
const LIGHT_FLOOR = 6;

function keyOnDark(data, w, h, c) {
  const out = Buffer.alloc(w * h * 4);
  for (let p = 0, q = 0; p < w * h * c; p += c, q += 4) {
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    let a = (l - FLOOR) / (CEIL - FLOOR);
    a = a <= 0 ? 0 : a >= 1 ? 1 : a;
    if (a === 0) {
      out[q] = 0; out[q + 1] = 0; out[q + 2] = 0; out[q + 3] = 0;
      continue;
    }
    /* Unpremultiply. Clamped, because a saturated channel can exceed 255. */
    out[q] = Math.min(255, Math.round(r / a));
    out[q + 1] = Math.min(255, Math.round(g / a));
    out[q + 2] = Math.min(255, Math.round(b / a));
    out[q + 3] = Math.round(a * 255);
  }
  return out;
}

function keyOnLight(data, w, h, c) {
  const out = Buffer.alloc(w * h * 4);
  for (let p = 0, q = 0; p < w * h * c; p += c, q += 4) {
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    /* Distance from white, on the channel that has travelled furthest. */
    const d = Math.max(255 - r, 255 - g, 255 - b);
    let a = (d - LIGHT_FLOOR) / LIGHT_SPAN;
    a = a <= 0 ? 0 : a >= 1 ? 1 : a;
    if (a === 0) {
      out[q] = 0; out[q + 1] = 0; out[q + 2] = 0; out[q + 3] = 0;
      continue;
    }
    /* Un-composite from white: c = a*src + (1-a)*255, so src = (c - (1-a)*255)/a */
    const un = (v) => Math.max(0, Math.min(255, Math.round((v - (1 - a) * 255) / a)));
    out[q] = un(r); out[q + 1] = un(g); out[q + 2] = un(b);
    out[q + 3] = Math.round(a * 255);
  }
  return out;
}

async function cutOne(src, dest, onLight) {
  const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const rgba = onLight ? keyOnLight(data, w, h, c) : keyOnDark(data, w, h, c);
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(dest);
}

await mkdir(OUT, { recursive: true });
const sets = (await readdir(SLICED, { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

let total = 0;
for (const set of sets) {
  const onLight = LIGHT_SHEETS.has(set);
  const dir = path.join(OUT, set);
  await mkdir(dir, { recursive: true });
  const files = (await readdir(path.join(SLICED, set))).filter((f) => f.endsWith(".png")).sort();
  for (const f of files) {
    await cutOne(path.join(SLICED, set, f), path.join(dir, f), onLight);
    total += 1;
  }
  console.log(`${set}  ${onLight ? "light" : "dark "}  ${String(files.length).padStart(2)} cut`);
}
console.log(`\n${total} objects written to assets/brand-cut`);
