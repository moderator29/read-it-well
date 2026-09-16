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
 *   alpha = brightness, normalised between a floor and a ceiling
 *   colour = the pixel, unpremultiplied by that alpha
 *
 * AND "BRIGHTNESS" HERE IS THE BRIGHTEST CHANNEL, NOT LUMINANCE. That looks like
 * a detail and it is the single biggest thing this file got wrong.
 *
 * Luminance weights blue at 0.0722, because human eyes are poor at blue. On
 * ordinary photography that is the right weighting. On THIS artwork it is a
 * disaster, because the subject is blue: a saturated blue pixel at full blue and
 * no red or green has a luminance of 18, which is BELOW the floor, so the key
 * threw it away as background. The parts of the mark that carry the most brand
 * colour were the parts most likely to be deleted, while white highlights, which
 * luminance rates highest, survived at full alpha. Cut a blue object with a
 * luminance key and what comes back is the white parts of it.
 *
 * The brightest channel has no such bias. The ground is black, so any pixel the
 * artist lit is lit in at least one channel, and a pure blue at 255 is as opaque
 * as a white at 255. It is also the measure that makes the unpremultiply below
 * safe, because a channel can never exceed the number it is being divided by.
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
 * AND THE FIRST VERSION OF THAT DIVISION CHANGED THE BRAND COLOUR, which is the
 * one mistake in this file worth reading before changing anything in it.
 *
 * It divided each channel by the alpha and clamped the result at 255. On this
 * artwork blue is already at or near maximum wherever the object is lit, so blue
 * hit the clamp and stopped while red and green carried on rising. The ratio
 * between the channels is the hue, so flattening it turned a deep electric blue
 * into pale cyan. Measured on `shield-check`: the supplied artwork averages
 * rgb(18, 44, 101) and the first cut averaged rgb(70, 142, 162). Red and green
 * had nearly tripled and blue could not follow.
 *
 * It also quietly broke the guarantee two paragraphs above. Composite a clamped
 * pixel back onto black and you do NOT get the original back, because the clamp
 * threw information away.
 *
 * THE FIX IS TO RAISE THE ALPHA INSTEAD OF CLIPPING THE COLOUR. Where dividing
 * by the keyed alpha would push any channel past 255, the alpha is raised to
 * exactly the point where the brightest channel lands on 255:
 *
 *   alpha = max(keyed alpha, brightest channel / 255)
 *
 * Every channel is then divided by that same number, so the ratio between them,
 * and therefore the hue, is untouched by construction. Nothing can clip, so
 * nothing needs clamping. And `colour * alpha` still equals the original pixel,
 * so compositing back onto black is exact again.
 *
 * What it costs: a pixel that would have clipped ends up slightly more opaque
 * than the luminance key alone would have made it. Those are the brightest parts
 * of the object, where the key was already returning an alpha near one, so the
 * difference is small and it is in the right direction.
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

/** Below this, on its brightest channel, a pixel is ground and gets no alpha. */
const FLOOR = 26;

/**
 * At and above this, on its brightest channel, a pixel is fully opaque.
 *
 * Raised from 150 when the key moved off luminance. Under the old key this
 * number was doing two jobs: setting where the object becomes solid, and
 * compensating for the fact that luminance was reading the blue body as much
 * darker than it is. Only the first job is real, so the number that does it can
 * be honest about the artwork: glass has depth and its body should stay slightly
 * translucent, so the object goes fully opaque only where it is genuinely bright.
 */
const CEIL = 210;

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
    const brightest = r > g ? (r > b ? r : b) : g > b ? g : b;
    let a = (brightest - FLOOR) / (CEIL - FLOOR);
    a = a <= 0 ? 0 : a >= 1 ? 1 : a;
    if (a === 0) {
      out[q] = 0; out[q + 1] = 0; out[q + 2] = 0; out[q + 3] = 0;
      continue;
    }
    /*
     * Unpremultiply by an alpha raised just enough that nothing can clip. See
     * the note above: clamping a channel is what turned the brand blue cyan.
     * Dividing all three by one number leaves the hue exactly as supplied.
     */
    const aOut = Math.max(a, brightest / 255);
    out[q] = Math.round(r / aOut);
    out[q + 1] = Math.round(g / aOut);
    out[q + 2] = Math.round(b / aOut);
    out[q + 3] = Math.round(aOut * 255);
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
    /*
     * Un-composite from white: c = a*src + (1-a)*255, so src = (c - (1-a)*255)/a.
     *
     * The same trap as the dark path, pointing the other way. Here a channel can
     * come out BELOW zero rather than above 255, and clamping it at zero flattens
     * the ratio between the channels exactly as clipping at 255 does. So the
     * alpha is raised until the DARKEST channel lands on zero, and all three are
     * un-composited with that one number. Hue preserved, nothing to clamp, and
     * `a*src + (1-a)*255` still returns the supplied pixel.
     */
    const darkest = r < g ? (r < b ? r : b) : g < b ? g : b;
    const aOut = Math.max(a, 1 - darkest / 255);
    const un = (v) => Math.round((v - (1 - aOut) * 255) / aOut);
    out[q] = un(r); out[q + 1] = un(g); out[q + 2] = un(b);
    out[q + 3] = Math.round(aOut * 255);
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
