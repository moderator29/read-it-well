/**
 * WHAT A BRAND OBJECT MEASURES AGAINST THE PLATE IT IS PAINTED ON, IN DAYLIGHT.
 *
 * Run from the repository root:
 *
 *   node scripts/design/paper/measure-object-ground.mjs
 *   node scripts/design/paper/measure-object-ground.mjs --json
 *
 * WHY THIS IS NOT `probe-contrast.mjs`. That probe measures TEXT against the
 * pixels a browser painted. These objects carry no text, they are artwork, and
 * the question here is a property of the artwork and the plate together rather
 * than of any one route: the same 121 PNGs paint the same way on every surface
 * that draws them, so measuring them once off the files is both cheaper and
 * more complete than finding a route that happens to show each one.
 *
 * WHY THE FILES CAN BE TRUSTED AS A MODEL OF THE PAINT, which is the part that
 * has to be argued rather than asserted. `scripts/cut-icon-ground.mjs` keyed
 * these objects out of renders that are GLOWING OBJECTS ON BLACK, which is
 * additive light: it set `alpha = brightest channel` and unpremultiplied the
 * colour by it. So the stored pixel is exactly the `(colour, alpha)` pair a
 * browser composites, and `out = a*C + (1-a)*G` here is the same arithmetic
 * Chromium runs. Composite one back onto black and the original render comes
 * back pixel for pixel, which is the check that makes this a model and not a
 * guess.
 *
 * THE ONE THING IT CANNOT SEE is a plate whose own ground is a photograph or a
 * gradient the page supplies, so every ground below is stated explicitly and
 * the radial one is computed here with the same geometry the stylesheet asks
 * for rather than eyeballed off a screenshot.
 */
import sharp from "sharp";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const GLASS = join(ROOT, "apps", "web", "public", "brand", "glass");
const BRAND_ICON = join(ROOT, "apps", "web", "src", "design-system", "icons", "BrandIcon.tsx");
const JSON_OUT = process.argv.includes("--json");

/* ------------------------------------------------------------------ colour */
const srgbToLin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const linToSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
const lum = ([r, g, b]) =>
  0.2126 * srgbToLin(r / 255) + 0.7152 * srgbToLin(g / 255) + 0.0722 * srgbToLin(b / 255);
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const hex = (h) => {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const toHex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/*
 * `color-mix(in oklab, A p%, B)` IS COMPUTED HERE RATHER THAN READ OFF A
 * BROWSER, because the whole point of this file is to try grounds that are not
 * in the stylesheet yet. The transform is the published sRGB-to-Oklab matrix
 * pair; the check is that mixing anything with itself returns itself and that
 * the current token reproduces the `#052A6D` the survey measured.
 */
function toOklab([r, g, b]) {
  const R = srgbToLin(r / 255),
    G = srgbToLin(g / 255),
    B = srgbToLin(b / 255);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function fromOklab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const R = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const B = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [R, G, B].map((v) => Math.min(255, Math.max(0, linToSrgb(v) * 255)));
}
const mixOklab = (a, b, pa) => {
  const A = toOklab(a),
    B = toOklab(b);
  return fromOklab(A.map((v, i) => v * pa + B[i] * (1 - pa)));
};

/* -------------------------------------------------------------- the tokens */
const INK_950 = hex("#010118");
const BRAND_PRIMARY_LIGHT = hex("#094BA9"); /* tokens.css, the daylight brand */
const PAGE = hex("#FFFFFF"); /* a card; the canvas #F4F5F7 is one step softer */

/* ------------------------------------------------------------- the grounds */
/*
 * A ground is a function of the pixel's position inside the plate, so a flat
 * colour and a radial are the same kind of thing and can be scored side by
 * side. `u` and `v` run 0..1 across the plate.
 */
const flat = (c) => ({ kind: "flat", at: () => c, swatch: c });
const radial = (core, rim, stop) => ({
  kind: "radial",
  /*
   * `radial-gradient(circle at 50% 50%, core 0%, core stop%, rim 100%)`, with
   * the default farthest-corner sizing, so the radius is half the diagonal.
   * Interpolation in oklab, which is what the stylesheet asks for.
   */
  at: (u, v) => {
    const d = Math.hypot(u - 0.5, v - 0.5) / (Math.SQRT2 / 2);
    if (d <= stop) return core;
    const t = Math.min(1, (d - stop) / (1 - stop));
    return mixOklab(rim, core, t);
  },
  swatch: core,
  rim,
});

const CURRENT = mixOklab(BRAND_PRIMARY_LIGHT, INK_950, 0.62);
const PROPOSED_CORE = mixOklab(BRAND_PRIMARY_LIGHT, INK_950, 0.14);
const PROPOSED_RIM = mixOklab(BRAND_PRIMARY_LIGHT, INK_950, 0.62);

const GROUNDS = {
  "night canvas (what the artwork was lit for)": flat(INK_950),
  "current token: brand 62% + ink": flat(CURRENT),
  "flat brand 40% + ink": flat(mixOklab(BRAND_PRIMARY_LIGHT, INK_950, 0.4)),
  "flat brand 28% + ink": flat(mixOklab(BRAND_PRIMARY_LIGHT, INK_950, 0.28)),
  "flat brand 14% + ink": flat(PROPOSED_CORE),
  "radial, ramp from 25%": radial(PROPOSED_CORE, PROPOSED_RIM, 0.25),
  "radial, ramp from 46%": radial(PROPOSED_CORE, PROPOSED_RIM, 0.46),
  /* SHIPPED. `--nf-icon-plate` in `tokens.css` is this one, stop for stop. The
     ramp starts at 35 per cent of the radius: the object numbers are flat
     between 25 and 46 per cent, so the stop was chosen for how much navy the
     plate shows rather than for contrast, and 35 leaves the widest navy band
     that costs nothing. */
  "shipped: brand 14% core to brand 62% rim, ramp from 35%": radial(PROPOSED_CORE, PROPOSED_RIM, 0.35),
};

/* ------------------------------------------------------------- the objects */
const src = readFileSync(BRAND_ICON, "utf8");
const twinBlock = src.slice(src.indexOf("const LIGHT_TWINS"), src.indexOf("]);", src.indexOf("const LIGHT_TWINS")));
const TWINS = new Set([...twinBlock.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]));
const ALL = readdirSync(GLASS)
  .filter((f) => f.endsWith(".png"))
  .map((f) => f.replace(/\.png$/, ""))
  .sort();
const UNTWINNED = ALL.filter((n) => !TWINS.has(n));

/*
 * THE PLATE'S GEOMETRY, AND IT IS WHY THE OBJECT IS NOT THE WHOLE SQUARE.
 * `.nf-brand-icon-ground` is square and pads by 7 per cent, so the artwork
 * occupies the middle 86 per cent. A radial ground has to be sampled at the
 * PLATE's coordinates, not the artwork's, or the core is scored as if it
 * covered the object edge to edge.
 */
const PAD = 0.07;

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[(s.length - 1) >> 1] : 0;
};

const rows = [];
for (const name of UNTWINNED) {
  const { data, info } = await sharp(join(GLASS, name + ".png"))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const per = {};
  const perAll = {};
  for (const key of Object.keys(GROUNDS)) {
    per[key] = [];
    perAll[key] = [];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3] / 255;
      /*
       * TWO REGIMES, AND REPORTING ONLY ONE OF THEM IS HOW THE NUMBER GETS
       * ARGUED ABOUT INSTEAD OF USED.
       *
       * `all` is every pixel the key kept, which is the regime the September
       * survey used to report "1.60:1 median, 45 under 1.5:1". It includes the
       * bloom, and the bloom is a RAMP that fades into whatever it is on by
       * design, so a large share of it will always sit near the ground however
       * good the ground is. It is the right regime for asking "has this got
       * better", because it is the one the earlier figure was taken in.
       *
       * `body` is the pixels at half alpha and up: the object's own material,
       * which is the part a person is trying to read. It is the right regime
       * for asking "is this legible".
       *
       * Both are carried through to the end. A ground that improves one and not
       * the other has not improved anything.
       */
      if (a < 0.05) continue;
      const isBody = a >= 0.5;
      const C = [data[i], data[i + 1], data[i + 2]];
      const u = PAD + ((x + 0.5) / w) * (1 - 2 * PAD);
      const v = PAD + ((y + 0.5) / h) * (1 - 2 * PAD);
      for (const [key, g] of Object.entries(GROUNDS)) {
        const G = g.at(u, v);
        const out = [0, 1, 2].map((k) => a * C[k] + (1 - a) * G[k]);
        const r = ratio(out, G);
        perAll[key].push(r);
        if (isBody) per[key].push(r);
      }
    }
  }
  const row = { name, px: per[Object.keys(GROUNDS)[0]].length, all: {} };
  for (const key of Object.keys(GROUNDS)) {
    row[key] = median(per[key]);
    row.all[key] = median(perAll[key]);
  }
  rows.push(row);
}

const summary = Object.keys(GROUNDS).map((key) => {
  const meds = rows.map((r) => r[key]);
  const medsAll = rows.map((r) => r.all[key]);
  /* The colour that meets the PAGE is the plate's outermost ring, which on a
     radial is the rim and on a flat plate is the fill. */
  const edge = GROUNDS[key].rim ?? GROUNDS[key].swatch;
  return {
    ground: key,
    swatch: toHex(GROUNDS[key].swatch),
    rim: GROUNDS[key].rim ? toHex(GROUNDS[key].rim) : null,
    medianOfMedians: median(meds),
    under1_5: meds.filter((m) => m < 1.5).length,
    under2: meds.filter((m) => m < 2).length,
    under3: meds.filter((m) => m < 3).length,
    worst: Math.min(...meds),
    allMedian: median(medsAll),
    allUnder1_5: medsAll.filter((m) => m < 1.5).length,
    edgeOnWhite: ratio(edge, PAGE),
  };
});

if (JSON_OUT) {
  console.log(JSON.stringify({ objects: UNTWINNED.length, summary, rows }, null, 2));
} else {
  console.log(
    `${ALL.length} objects on disk, ${TWINS.size} with a light twin, ${UNTWINNED.length} without.\n` +
      `Median contrast of the object's BODY (alpha >= 0.5) against the plate under it.\n`,
  );
  for (const s of summary) {
    console.log(
      `${s.ground}\n` +
        `  plate ${s.swatch}${s.rim ? " -> rim " + s.rim : ""}  ` +
        `the edge that meets the page ${s.edgeOnWhite.toFixed(2)}:1 on white\n` +
        `  BODY  median ${s.medianOfMedians.toFixed(2)}:1  ` +
        `under 1.5 ${s.under1_5}  under 2 ${s.under2}  under 3 ${s.under3}  worst ${s.worst.toFixed(2)}:1\n` +
        `  ALL   median ${s.allMedian.toFixed(2)}:1  under 1.5 ${s.allUnder1_5}   (the survey's regime)`,
    );
  }
  const best = "shipped: brand 14% core to brand 62% rim, ramp from 35%";
  console.log(`\nTHE TWENTY WORST OBJECTS on "${best}", which is the list a render order is cut from:`);
  [...rows]
    .sort((a, b) => a[best] - b[best])
    .slice(0, 20)
    .forEach((r) =>
      console.log(`  ${r.name.padEnd(24)} ${r[best].toFixed(2)}:1  (current ${r["current token: brand 62% + ink"].toFixed(2)}:1)`),
    );
}
