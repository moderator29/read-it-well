/**
 * IS THE OFFLINE COMPOSITE MODEL A MODEL OF THE PAINT, OR JUST ARITHMETIC?
 *
 *   node scripts/design/paper/model-vs-chromium.mjs --base http://127.0.0.1:3184
 *
 * `measure-object-ground.mjs` decides what ground the 121 untwinned objects
 * sit on by compositing PNGs in Node. Nothing about a number computed in Node
 * is evidence about Chromium, and this repository has twice shipped a
 * measurement that was an artefact of its own instrument. So: draw one object
 * on one plate in a real browser, composite the same object over the same
 * modelled ground offline, and print the largest and mean per-channel
 * disagreement.
 *
 * MEASURED ON 23 SEPTEMBER: mean 1.41 of 255, largest 39. The largest sits on
 * the artwork's own edges, where Chromium resamples a 256px source into a
 * 220.16px box and this file takes the nearest source pixel; the mean is the
 * number that says the two agree. A model this close is worth arguing from.
 *
 * TWO THINGS THAT LOOK LIKE DETAILS AND ARE NOT.
 *
 * The artwork is loaded over HTTP from the running proof server, not from
 * `file://`. A `file://` image inside a `setContent` document does not load at
 * all, and it does not fail loudly: `complete` is true and `naturalWidth` is 0,
 * so the harness draws a bare plate and the comparison quietly measures the
 * gradient against itself.
 *
 * The plate sits inside a wrapper of its own width, because `padding: 7%`
 * resolves against the CONTAINING BLOCK rather than the padded box. Without the
 * wrapper the plate took 7 per cent of the body and the object was drawn at the
 * wrong size, which is the same trap `BrandIcon.tsx` documents for a sized tile
 * in a wide flex row.
 */
import { chromium } from "playwright-core";
import sharp from "sharp";

const arg = (n, d = null) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const BASE = arg("base", "http://127.0.0.1:3184").replace(/\/$/, "");
const OBJ = arg("object", "modern-house");
const PNG = `/home/user/read-it-well/apps/web/public/brand/glass/${OBJ}.png`;
const SIDE = 256;
const PAD = 0.07;
/* The two stops `--nf-icon-plate` resolves to in daylight. */
const CORE = "#020629";
const RIM = "#052a6d";
const STOP = 0.35;

const srgbToLin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const linToSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
const hex = (h) => [0, 2, 4].map((i) => parseInt(h.replace("#", "").slice(i, i + 2), 16));
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
  const R = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const B = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [R, G, B].map((v) => Math.min(255, Math.max(0, linToSrgb(v) * 255)));
}
const mix = (a, b, pa) => {
  const A = toOklab(a),
    B = toOklab(b);
  return fromOklab(A.map((v, i) => v * pa + B[i] * (1 - pa)));
};

const html = `<!doctype html><html><body style="margin:0;background:#fff">
<div style="width:${SIDE}px"><div id="p" style="width:${SIDE}px;height:${SIDE}px;padding:7%;
 box-sizing:border-box;background:radial-gradient(circle at 50% 50%, ${CORE} 0%, ${CORE} ${STOP * 100}%, ${RIM} 100%)">
<img src="${BASE}/brand/glass/${OBJ}.png" style="width:100%;height:100%;display:block"></div></div></body></html>`;

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--disable-lcd-text"],
});
const page = await browser.newPage({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 1 });
/* A real origin first, so the artwork's HTTP request is same-origin. */
const res = await page.goto(`${BASE}/preview`, { waitUntil: "load", timeout: 45_000 });
if ((res?.status() ?? 0) !== 200) throw new Error(`server answered ${res?.status()}`);
await page.setContent(html, { waitUntil: "load" });
await page.waitForSelector("#p img", { state: "attached", timeout: 15_000 });
await page.waitForTimeout(400);
const loaded = await page.evaluate(() => {
  const i = document.querySelector("img");
  return { complete: i.complete, naturalWidth: i.naturalWidth };
});
if (!loaded.naturalWidth) throw new Error("the artwork never loaded, so there is nothing to compare");
const shot = await page.locator("#p").screenshot();
await browser.close();

const { data: got, info } = await sharp(shot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const box = Math.round(SIDE * (1 - 2 * PAD));
const { data: art } = await sharp(PNG).ensureAlpha().resize(box, box).raw().toBuffer({ resolveWithObject: true });
const core = hex(CORE);
const rim = hex(RIM);
let worst = 0;
let sum = 0;
let n = 0;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const u = (x + 0.5) / info.width;
    const v = (y + 0.5) / info.height;
    const d = Math.hypot(u - 0.5, v - 0.5) / (Math.SQRT2 / 2);
    const G = d <= STOP ? core : mix(rim, core, Math.min(1, (d - STOP) / (1 - STOP)));
    const ax = Math.floor(u * SIDE - PAD * SIDE);
    const ay = Math.floor(v * SIDE - PAD * SIDE);
    let out = G;
    if (ax >= 0 && ay >= 0 && ax < box && ay < box) {
      const i = (ay * box + ax) * 4;
      const a = art[i + 3] / 255;
      out = [0, 1, 2].map((k) => a * art[i + k] + (1 - a) * G[k]);
    }
    const j = (y * info.width + x) * 4;
    for (let k = 0; k < 3; k++) {
      const e = Math.abs(got[j + k] - out[k]);
      if (e > worst) worst = e;
      sum += e;
      n += 1;
    }
  }
}
console.log(
  `${OBJ} on the daylight plate, ${info.width}x${info.height}: ` +
    `largest per-channel disagreement ${worst}, mean ${(sum / n).toFixed(2)} of 255.`,
);
