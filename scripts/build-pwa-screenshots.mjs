/**
 * The install card's screenshots.
 *
 * Without a `screenshots` array, an install prompt is a browser dialogue with a
 * name and an icon in it. With one, Chrome on Android renders a store-style
 * card carrying real screens, which is the difference between "a site wants to
 * install something" and "this is the app". It is the cheapest thing on the
 * PWA surface and it was the only part of the manifest missing.
 *
 * These are rendered from the running application rather than drawn, so they
 * cannot drift from what a person actually meets. Narrow is 390x844, the phone
 * this product is built for. Wide is 1280x800, which Chrome requires at least
 * one of before it will use the richer card at all.
 *
 * THEY ARE COMPRESSED, and that is not an optimisation, it is the brief. Raw
 * 2x PNGs of these four screens came to 7.1MB, and the stated audience is a
 * mid-range Android on a metered Nigerian data bundle. The install prompt
 * fetches every one of them. JPEG at 90 brings the set to about 0.7MB with no
 * visible loss on this artwork, because the canvas is a smooth dark gradient
 * and the type is large: exactly the content JPEG handles well. The capture
 * stays at 2x so the card is crisp on a high-density screen, and the
 * compression happens after, on the way to disk.
 *
 * Run against a dev or preview server: node scripts/build-pwa-screenshots.mjs [origin]
 */
import { chromium } from "playwright-core";
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ORIGIN = process.argv[2] ?? "http://localhost:3000";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "apps", "web", "public", "pwa", "shots");
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

/**
 * Dark, deliberately. The install card sits on the launcher and the product's
 * own canvas is the night one; a white screenshot in that context reads as a
 * different application.
 *
 * `anchor`, when a shot carries one, is a CSS selector the shot scrolls to,
 * NOT a pixel offset. The first cut used a pixel offset and produced exactly
 * what a pixel offset always produces eventually: a card sliced in half at the
 * top of the frame and a band of empty canvas at the bottom, because the page
 * had grown by a section since the number was chosen. A selector survives the
 * page being edited, and a missing selector refuses the shot rather than
 * framing whatever the page happened to show. No shot in the current set
 * needs one; the mechanism stays for the next one that does.
 */
const SHOTS = [
  { file: "narrow-home.jpg", route: "/", width: 390, height: 844, form: "narrow" },
  { file: "narrow-search.jpg", route: "/search", width: 390, height: 844, form: "narrow" },
  /*
   * The Stays side replaced the markets band. `narrow-markets` scrolled the
   * landing to `#nf-markets-title`, an anchor the rebuilt landing no longer
   * carries, and the second world of the product had no screen on the card
   * at all. The Stays home is the third thing a stranger meets and it is a
   * route of its own, so no anchor is needed and nothing can be reframed.
   */
  { file: "narrow-stays.jpg", route: "/stays", width: 390, height: 844, form: "narrow" },
  { file: "wide-home.jpg", route: "/", width: 1280, height: 800, form: "wide" },
];

const JPEG_QUALITY = 90;

const browser = await chromium.launch({ executablePath: CHROME });
let failures = 0;
for (const shot of SHOTS) {
  const ctx = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    try {
      /* `nf_theme`, with the underscore: the key the before-paint reader in
         app/layout.tsx and scripts/verify-shots.mjs both use. This wrote
         `nf-theme`, which nothing reads; the shots came out dark anyway only
         because dark is the default. */
      localStorage.setItem("nf_theme", "dark");
    } catch {
      /* private mode, and the default is dark anyway */
    }
  });
  await page.goto(ORIGIN + shot.route, { waitUntil: "networkidle", timeout: 180000 });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  if (shot.anchor) {
    const found = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      // Clear the sticky header by MEASURING it, not by guessing. A fixed 40px
      // offset put the heading's first line behind the bar, because the bar is
      // 61px at this width and 73px above `sm`.
      const bar = document.querySelector("header");
      const clearance = (bar ? bar.getBoundingClientRect().height : 0) + 28;
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - clearance);
      return true;
    }, shot.anchor);
    if (!found) {
      // A selector that no longer matches is a silent reframing, which is the
      // fault the pixel offset had. Refuse rather than ship a shot of wherever
      // the page happened to be.
      console.error(`  ${shot.file}  ANCHOR NOT FOUND: ${shot.anchor}`);
      failures += 1;
      await ctx.close();
      continue;
    }
  }
  // Long enough for the entrance choreography to settle. A screenshot caught
  // mid-reveal shows half-faded cards, which looks like a rendering fault.
  await page.waitForTimeout(1800);
  const raw = await page.screenshot({ type: "png" });
  if (errors.length > 0) {
    // Nothing is written. A screenshot of a broken screen on the install card
    // is worse than no install card.
    failures += 1;
    console.error(`  ${shot.file}  PAGE ERRORS: ${errors.length}  ${errors[0]}`);
  } else {
    const out = await sharp(raw)
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toFile(path.join(OUT, shot.file));
    console.log(
      `  ${shot.file}  ${out.width}x${out.height}  ${(out.size / 1024).toFixed(0)}kB  clean`,
    );
  }
  await ctx.close();
}
await browser.close();
if (failures > 0) {
  console.error(`${failures} screenshot(s) captured a page error. Not fit to ship.`);
  process.exit(1);
}
console.log("pwa screenshots: all clean");
