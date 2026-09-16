/**
 * Build the standalone brand marks: the mark with no container, and the
 * wordmark with a real alpha channel.
 *
 * Run from the repository root:
 *
 *   node scripts/build-brand-marks.mjs
 *
 * WHY THIS EXISTS. Until 16 September 2026 every brand asset in the product was
 * an opaque rectangle: `vallo-mark.png` was a 640px square CROP out of the app
 * tile, three channels, no alpha, towers clipped at the top, swoosh cut at both
 * sides, bright blue bleeding to all four edges. The header painted it at 33 to
 * 46px, where it read as a navy smudge with a hard square edge, and in the light
 * theme the wordmark was a black slab. The founder's complaint, "make the logo
 * more visible, remove the container around it", is this file's brief.
 *
 * THE MARK CANNOT BE KEYED THE WAY THE ICONS WERE, AND THE REASONS ARE
 * RECORDED BECAUSE EACH ONE WAS TRIED.
 *
 * The icon sheets are objects on near-black, so brightness is opacity and the
 * key in `cut-icon-ground.mjs` inverts the render exactly. The tile is not
 * that: it is a SCENE. The mark sits on a lit glass panel whose own brightness
 * overlaps the mark's, so:
 *
 *   - A low floor keeps the panel as a visible navy haze square.
 *   - A floor high enough to delete the panel also deletes the two shortest
 *     towers, whose dim bodies sit at the same brightness as the panel's
 *     reflections.
 *   - Keeping only the largest connected component removes the panel's corner
 *     reflections AND two of the five towers, because at that threshold the
 *     mark is not one blob. That render is the reason this file does not do it.
 *
 * WHAT ACTUALLY WORKS is admitting the separation is soft. The mark region is
 * keyed at a floor that keeps every tower (80, chosen by rendering 26 through
 * 130 side by side), and what survives of the panel, a faint ambient bloom
 * around the mark, is FEATHERED OUT with a radial falloff centred on the mark.
 * The result reads as the mark carrying its own glow, which is what the
 * artwork's language is anyway. On the night theme the remaining bloom is
 * invisible against the navy; on paper it reads as a soft blue halo rather than
 * a hard-edged box, which is the difference the founder can see in the header.
 *
 * A TRUE mark-only render from the founder's generator would still be better,
 * and the ask is one line: the five glass towers and the orbital swoosh alone,
 * same style, on pure black, nothing else in frame. Drop it in
 * `assets/brand-sheets/` as `vallo-mark-render.png` and this script will prefer
 * it automatically over the tile extraction.
 *
 * THE HUE RULES FROM `cut-icon-ground.mjs` APPLY VERBATIM: the key is the
 * brightest channel, never luminance, and where unpremultiplying would clip a
 * channel the alpha is raised instead. Both lessons were paid for once already.
 */

import { access, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRAND = path.join(ROOT, "apps/web/public/brand");
const SOURCES = path.join(ROOT, "assets/brand-sheets");

/** The tile is source and is never overwritten: it stays the app icon. */
const TILE = path.join(BRAND, "vallo-icon.png");

/**
 * The original wordmark render, archived under assets before the public copy
 * gained an alpha channel. The public file is OUTPUT here; a build script that
 * reads its own output keys an already-keyed image on the second run.
 */
const WORDMARK_SOURCE = path.join(SOURCES, "vallo-wordmark-source.png");

/** A mark-only render, if the founder has supplied one. Preferred when present. */
const MARK_RENDER = path.join(SOURCES, "vallo-mark-render.png");

/** Where the mark sits inside the 1024px tile, measured off a gridded render. */
const MARK_REGION = { left: 175, top: 80, width: 700, height: 590 };

/** Keeps all five towers; below the panel survives, above the short towers go. */
const MARK_FLOOR = 80;

/**
 * The wordmark's own panel is brighter than the icon sheets' ground, and the
 * letters are chrome, so there is room above it: 95 deletes the panel cleanly
 * and the letters do not begin to erode until around 150. Chosen by rendering
 * 55 through 115 side by side on both grounds.
 */
const WORD_FLOOR = 95;

/** Full opacity from here up. See cut-icon-ground.mjs for why not 255. */
const CEIL = 235;

/** Radial feather: alpha unchanged inside this radius, gone at the corner. */
const FADE_START = 0.62;

async function keyed(src, { region = null, floor, fade = false } = {}) {
  let pipe = sharp(src);
  if (region) pipe = pipe.extract(region);
  const { data, info } = await pipe.raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const out = Buffer.alloc(w * h * 4);
  for (let p = 0, i = 0, q = 0; p < w * h; p += 1, i += c, q += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const brightest = r > g ? (r > b ? r : b) : g > b ? g : b;
    let a = (brightest - floor) / (CEIL - floor);
    a = a <= 0 ? 0 : a >= 1 ? 1 : a;
    if (a === 0) continue;
    /* The falloff multiplies the FINAL alpha and never the divisor: dividing
       the colour by a faded alpha brightens exactly the pixels being faded,
       which was tried, looked like a halo, and is why these are two numbers. */
    let f = 1;
    if (fade) {
      const x = p % w, y = (p - x) / w;
      const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > FADE_START) {
        const t = Math.min(1, (d - FADE_START) / (1.02 - FADE_START));
        f = 1 - t * t * (3 - 2 * t);
      }
    }
    const aKey = Math.max(a, brightest / 255);
    const aFinal = aKey * f;
    if (aFinal <= 0.004) continue;
    out[q] = Math.round(r / aKey);
    out[q + 1] = Math.round(g / aKey);
    out[q + 2] = Math.round(b / aKey);
    out[q + 3] = Math.round(aFinal * 255);
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 1 });
}

const exists = (p) => access(p).then(() => true, () => false);

/* ------------------------------------------------------------------ the mark */
let mark;
if (await exists(MARK_RENDER)) {
  mark = await keyed(MARK_RENDER, { floor: 26 });
  console.log("mark: from the supplied mark-only render");
} else {
  mark = await keyed(TILE, { region: MARK_REGION, floor: MARK_FLOOR, fade: true });
  console.log("mark: extracted from the tile (supply vallo-mark-render.png for a cleaner one)");
}
const m = await mark.png({ compressionLevel: 9, palette: true, quality: 95 }).toFile(path.join(BRAND, "vallo-mark.png"));
console.log(`  vallo-mark.png      ${m.width}x${m.height}  ${(m.size / 1024).toFixed(0)}kB  alpha: yes`);

/* -------------------------------------------------------------- the wordmark */
const word = await keyed(WORDMARK_SOURCE, { floor: WORD_FLOOR });
const wd = await word.png({ compressionLevel: 9, palette: true, quality: 95 }).toFile(path.join(BRAND, "vallo-wordmark.png"));
console.log(`  vallo-wordmark.png  ${wd.width}x${wd.height}  ${(wd.size / 1024).toFixed(0)}kB  alpha: yes`);
