/*
 * SAMPLE THE GOVERNING REFERENCE, BECAUSE EYEBALLING A GLOW IS GUESSING.
 *
 * The founder put the built landing beside `GOVERNING-landing-desktop-hero.png`
 * and said our glow is hotter, wider and more saturated than the reference, and
 * that our controls are capsules where the reference has none. Both are true,
 * and neither can be closed by argument: a token either matches the pixels in
 * the reference or it does not.
 *
 * So this reads the reference PNG itself and prints what is actually there. It
 * loads the image into a canvas in headless Chromium, which needs no image
 * dependency in the tree, and averages a small box at each point so one noisy
 * pixel of photographic grain cannot decide a token.
 *
 * Usage:  node scripts/design/sample-reference.mjs [--json]
 *
 * The coordinates below are read off the 1536x1024 hero and are recorded as
 * fractions of the image, so they survive the image being re-exported at a
 * different size. Each one names the thing it samples rather than its pixel,
 * because a coordinate with no name is unreviewable.
 */
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO = resolve(new URL("../..", import.meta.url).pathname);

/*
 * TWO REFERENCES, because they answer different questions.
 *
 * The desktop hero is the colour and glow authority: it is the image the
 * founder had open when he ruled, and its buttons, chips and containers are
 * what the tokens are set from.
 *
 * The phone home target is the CHROME authority. The desktop image has no
 * bottom dock and its header floats over a photograph, so neither can be
 * measured from it. The phone image draws the header, the dock, the market
 * tiles and the city chips against the product's own ground, which is the
 * only place those can be read honestly.
 *
 *   node scripts/design/sample-reference.mjs            the hero
 *   node scripts/design/sample-reference.mjs --chrome   the phone home
 */
const CHROME = process.argv.includes("--chrome");
const IMAGE = CHROME
  ? resolve(REPO, "docs/design/references/founder/GOVERNING-home-markets-target.png")
  : resolve(REPO, "docs/design/references/GOVERNING-landing-desktop-hero.png");
const W = CHROME ? 1024 : 1536;
const H = CHROME ? 1536 : 1024;
const f = (x, y) => [x / W, y / H];

/*
 * THE PHONE HOME POINTS. Read off `GOVERNING-home-markets-target.png`, which
 * is 1024x1536 and draws a phone inside a lit frame on a photographic
 * background, so every coordinate here is INSIDE the screen and none of them
 * is on the frame or the wallpaper.
 *
 * What this image settles that the hero cannot: the header has no bar of its
 * own and no hairline, it simply sits on the canvas; the dock is a rounded
 * rectangle with visibly straight ends; the market tiles are the product's
 * own card at rest; and the only circle on the entire screen is the avatar.
 */
const CHROME_POINTS = [
  ["canvas: the screen ground beside the lockup", ...f(560, 120), 7],
  ["header: any bar fill behind the lockup row", ...f(600, 120), 7],
  ["header: the hairline under the header, if there is one", ...f(512, 160), 2],
  ["header: the avatar's ring", ...f(796, 96), 2],
  ["search field: fill", ...f(420, 397), 7],
  ["search field: top border", ...f(512, 371), 2],
  ["search submit: the rounded square fill", ...f(798, 397), 6],
  ["market tile: fill", ...f(300, 530), 7],
  ["market tile: top border", ...f(293, 455), 2],
  ["market tile: the glyph plate behind the icon", ...f(246, 505), 5],
  ["band: the invest card fill", ...f(300, 1150), 7],
  ["band: its top border", ...f(516, 1002), 2],
  ["city chip: fill", ...f(300, 1320), 5],
  ["city chip: top border", ...f(268, 1291), 2],
  ["dock: the bar fill", ...f(300, 1450), 7],
  ["dock: its top border", ...f(512, 1376), 2],
  ["dock: the active slot ink", ...f(267, 1410), 3],
  ["dock: a resting slot ink", ...f(397, 1412), 3],
];

/** [name, fractionX, fractionY, boxSize] */
const HERO_POINTS = [
  ["canvas: the page ground below the fold", ...f(40, 1010), 9],
  ["header: the bar's own fill, over the photo", ...f(700, 18), 5],
  ["primary button: fill, left end of the gradient", ...f(186, 417), 5],
  ["primary button: fill, centre", ...f(268, 417), 5],
  ["primary button: fill, right end of the gradient", ...f(348, 417), 5],
  ["primary button: the header's Get Started, centre", ...f(1346, 43), 5],
  ["secondary button: Explore Stays, fill", ...f(440, 424), 5],
  ["secondary button: Explore Stays, top border", ...f(440, 398), 2],
  ["chip: Lagos, fill", ...f(228, 477), 5],
  ["chip: Lagos, top border", ...f(228, 460), 2],
  ["search container: fill, right of the segments", ...f(1085, 570), 6],
  ["search container: top border", ...f(700, 549), 2],
  ["search segment: Buy, active fill", ...f(760, 570), 5],
  ["search segment: Rent, resting fill", ...f(848, 570), 5],
  ["card: stats tile fill", ...f(600, 735), 6],
  ["card: stats tile top border", ...f(587, 688), 2],
  ["card: the band behind the tiles", ...f(300, 770), 6],
  ["tile: feature tile fill", ...f(620, 880), 6],
  ["tile: feature tile top border", ...f(616, 810), 2],
  ["listing card: fill", ...f(1300, 410), 5],
];

const POINTS = CHROME ? CHROME_POINTS : HERO_POINTS;

/*
 * THE GLOW, measured as a falloff rather than as one number.
 *
 * A glow is a radius, a spread and an opacity, and a single sample cannot tell
 * those apart. Walking outward from the button's edge one pixel at a time and
 * printing the series says exactly how far the light carries and how fast it
 * dies, which is what a box-shadow has to reproduce.
 */
const FALLOFF = CHROME
  ? {
      label: "the dock's top edge, upward from y=1376 into the page above it",
      x: 512,
      vertical: true,
      y: 1376,
      from: 1376,
      to: 1330,
      step: 5,
    }
  : {
      label: "primary button, rightward from its edge at y=417",
      y: 417,
      from: 360,
      to: 430,
      step: 5,
    };

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});
const page = await browser.newPage();
/*
 * A data URL rather than `file://`. A blank page cannot decode a file the
 * canvas is then asked to read back: the origin is opaque and `getImageData`
 * throws or the decode is refused outright. Handing the bytes in as a data URL
 * makes the image same-origin with the page, which is the whole requirement.
 */
await page.goto("about:blank");
const dataUrl = "data:image/png;base64," + readFileSync(IMAGE).toString("base64");

const result = await page.evaluate(
  async ({ src, points, falloff, w, h }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const sx = img.naturalWidth / w;
    const sy = img.naturalHeight / h;

    const box = (px, py, size) => {
      const half = Math.max(0, Math.floor(size / 2));
      const d = ctx.getImageData(px - half, py - half, size, size).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n += 1; }
      return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
    };
    const hex = ([r, g, b]) =>
      "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();

    const sampled = points.map(([name, fx, fy, size]) => {
      const rgb = box(Math.round(fx * img.naturalWidth), Math.round(fy * img.naturalHeight), size);
      const [r, g, b] = rgb;
      const max = Math.max(r, g, b) / 255;
      const min = Math.min(r, g, b) / 255;
      const l = (max + min) / 2;
      const s = max === min ? 0 : (max - min) / (l > 0.5 ? 2 - max - min : max + min);
      return { name, hex: hex(rgb), rgb, saturation: Math.round(s * 100), lightness: Math.round(l * 100) };
    });

    const series = [];
    if (falloff.vertical) {
      for (let y = falloff.from; y >= falloff.to; y -= falloff.step) {
        const rgb = box(Math.round(falloff.x * sx), Math.round(y * sy), 3);
        series.push({ x: y, hex: hex(rgb), rgb });
      }
    } else {
      for (let x = falloff.from; x <= falloff.to; x += falloff.step) {
        const rgb = box(Math.round(x * sx), Math.round(falloff.y * sy), 3);
        series.push({ x, hex: hex(rgb), rgb });
      }
    }
    return { size: [img.naturalWidth, img.naturalHeight], sampled, series };
  },
  { src: dataUrl, points: POINTS, falloff: FALLOFF, w: W, h: H },
);

await browser.close();

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`reference: ${IMAGE}`);
  console.log(`size: ${result.size[0]}x${result.size[1]}\n`);
  const pad = Math.max(...result.sampled.map((s) => s.name.length));
  for (const s of result.sampled) {
    console.log(
      `${s.name.padEnd(pad)}  ${s.hex}  rgb(${s.rgb.join(" ")})  sat ${String(s.saturation).padStart(3)}%  light ${String(s.lightness).padStart(3)}%`,
    );
  }
  console.log(`\nglow falloff: ${FALLOFF.label}`);
  for (const p of result.series) console.log(`  x=${String(p.x).padStart(4)}  ${p.hex}  rgb(${p.rgb.join(" ")})`);
}
