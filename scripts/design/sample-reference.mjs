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
  /*
   * W2, 19 September: THE POINT ABOVE AVERAGES THE ARROW WITH THE PLATE.
   *
   * It reads #3C7CFC, and that number was being used as "the fill of the
   * submit button", which is what `compare-surface`'s home surface held our
   * plate against. It is a 6px box on the CENTRE of the control, and the
   * centre of the control is where the white arrow glyph is. A vertical scan
   * down x=798 walks #0275FE, #005BFD, #0055FD and then #6499FE at y=396,
   * which is the glyph; a horizontal scan clear of it at y=383 walks #0079FD
   * at the left shoulder through #005BFD at the centre to #0079FD at the
   * right, mean about #0068FD. So the plate is a saturated brand blue and
   * #3C7CFC is a plate-and-glyph average.
   *
   * The old point stays, because it is cited in the second audit and in the
   * ledger and a name that moves is a name nobody can check. This is the one
   * the fill check is held against: an 11px box on the plate, above the
   * glyph and inside both shoulders, and it reads #015FFD. Same lesson W3
   * found on ten of the twenty hero points, on the other reference.
   */
  ["search submit: the plate, clear of the arrow glyph", ...f(797, 384), 11],
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
/*
 * W3, 19 September: TEN OF THESE TWENTY POINTS WERE NOT MEASURING A TOKEN.
 *
 * Every coordinate below was cropped out of the PNG at 4x and looked at
 * before it was trusted, and half of them landed somewhere else entirely:
 * five sat on the LABEL of the control they claimed to sample (the primary
 * button's centre was on the "P" of Properties at 80 per cent lightness, the
 * Lagos chip's fill was on the "g", the stats tile's fill was on the word
 * Properties, the feature tile's fill was on "ed properties", the header's
 * Get Started was on the "S"), four sat OUTSIDE the element on its own bloom
 * or on the photograph a few pixels above it (the Lagos chip's "top border"
 * was ten pixels above the chip, the search container's was on the pool), and
 * one sat on a PHOTOGRAPH inside a card and called it the card's fill.
 *
 * A number read off a glyph is not a colour the token system can be held to,
 * and a target that cannot be hit is worse than no target. The names are
 * unchanged so the history still reads; the coordinates are the ones that
 * measure the thing the name says.
 *
 * AND THE PRIMARY BUTTON'S GRADIENT RUNS TOP TO BOTTOM, NOT LEFT TO RIGHT.
 * The three points spelled "left end / centre / right end of the gradient"
 * read #0167FE, ink, and #006DFE: the two clean ones differ by six on one
 * channel, because there is no horizontal gradient in that button at all. A
 * vertical scan down its clean right shoulder walks #009DFE at the top to
 * #0055FE at the foot, which is a 72-step ramp on green. So the three points
 * are now top, centre and foot of the ramp that is actually there.
 */
const HERO_POINTS = [
  ["canvas: the page ground below the fold", ...f(40, 1010), 9],
  ["header: the bar's own fill, over the photo", ...f(700, 18), 5],
  ["primary button: fill, top of the vertical ramp", ...f(340, 401), 3],
  ["primary button: fill, centre height", ...f(340, 417), 3],
  ["primary button: fill, foot of the vertical ramp", ...f(340, 433), 3],
  ["primary button: the header's Get Started, fill under the label", ...f(1346, 56), 3],
  ["secondary button: Explore Stays, fill", ...f(440, 424), 5],
  ["secondary button: Explore Stays, top border", ...f(440, 398), 2],
  ["chip: Lagos, fill", ...f(248, 477), 3],
  ["chip: Lagos, top border", ...f(248, 461), 2],
  ["search container: fill, right of the segments", ...f(1085, 570), 6],
  ["search container: top border", ...f(1085, 547), 2],
  ["search segment: Buy, active fill", ...f(760, 570), 5],
  ["search segment: Rent, resting fill", ...f(848, 570), 5],
  ["card: stats tile fill", ...f(660, 720), 5],
  ["card: stats tile top border", ...f(660, 686), 2],
  ["card: the band behind the tiles", ...f(300, 770), 6],
  ["tile: feature tile fill", ...f(600, 840), 5],
  ["tile: feature tile top border", ...f(600, 808), 2],
  ["listing card: fill", ...f(1228, 427), 3],
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
      /*
       * W3: two pixels, not five, and starting one pixel inside the button.
       * The founder's ruling is that ours is "hotter, wider and more
       * saturated", and wider is a question about the SHAPE of this series.
       * At a five pixel step there are four samples between the button edge
       * and the ground, which cannot tell a tight bloom from a broad one.
       */
      label: "primary button, rightward from its edge at y=417",
      y: 417,
      from: 358,
      to: 420,
      step: 2,
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
