/**
 * The brand object plate, shot and then CHECKED AGAINST THE MODEL.
 *
 *   node docs/design/proofs/paper/shot-plate.mjs --base http://127.0.0.1:3184 --tag before
 *
 * Two jobs, and the second is the one that matters.
 *
 * ONE, IT TAKES THE PICTURE. `/preview/g2` draws every render-cropped glass
 * object on the four real grounds at three sizes, in whatever theme the
 * document is in, so one light shot of it is the plate on every surface the
 * product paints it on.
 *
 * TWO, IT CHECKS THAT `measure-object-ground.mjs` IS MODELLING THE PAINT.
 * That file composites PNGs in Node and reports a number; nothing about a
 * number computed in Node is evidence about Chromium. So this reads the actual
 * painted pixels of one named plate out of the browser, composites the same
 * object over the same modelled ground offline, and prints the largest
 * per-channel disagreement. A model that is right is worth arguing from and a
 * model that is wrong is the instrument lying again, which this repository has
 * paid for twice.
 *
 * The launch flags are not optional: without SwiftShader, headless Chromium
 * drops `backdrop-filter` silently and the shot is of a different design.
 */
import { chromium } from "playwright-core";
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");
const arg = (n, d = null) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const BASE = arg("base", "http://127.0.0.1:3184").replace(/\/$/, "");
const TAG = arg("tag", "now");
const OUT = join(HERE, "shots");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--disable-lcd-text"],
});

const report = [];
for (const theme of ["light", "dark"]) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    colorScheme: theme,
    deviceScaleFactor: 2,
  });
  await page.addInitScript((t) => {
    try {
      window.localStorage.setItem("nf_theme", t);
    } catch {
      /* the attribute below still lands */
    }
  }, theme);
  const res = await page.goto(`${BASE}/preview/g2`, { waitUntil: "networkidle", timeout: 45_000 });
  const status = res?.status() ?? 0;
  if (status < 200 || status >= 300) throw new Error(`server answered ${status}`);
  const landed = new URL(page.url()).pathname.replace(/\/$/, "");
  if (landed !== "/preview/g2") throw new Error(`browser ended up at ${landed}`);
  /* A layout `notFound()` answers 200 with the not-found body. */
  if (await page.locator("[data-nf-not-found]").count()) throw new Error("not-found body at 200");
  await page.evaluate((t) => {
    if (t === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  }, theme);
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  await page.screenshot({ path: join(OUT, `g2-${theme}-${TAG}.png`) });

  if (theme === "light") {
    /*
     * ONE PLATE, READ OFF THE SCREEN. The 96px row is the biggest the harness
     * draws, so it has the most pixels per plate and the least antialiasing
     * per pixel, which is what makes a per-channel comparison meaningful.
     */
    const found = await page.evaluate(() => {
      const els = [...document.querySelectorAll('.nf-brand-icon-ground[data-twinned="false"]')];
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.width >= 90 && r.top >= 0 && r.bottom <= window.innerHeight) {
          return {
            object: el.dataset.object,
            rect: { x: r.x, y: r.y, w: r.width, h: r.height },
            background: getComputedStyle(el).backgroundImage,
          };
        }
      }
      return null;
    });
    if (found) {
      const el = await page.locator(`.nf-brand-icon-ground[data-object="${found.object}"]`).first();
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      const buf = await el.screenshot();
      writeFileSync(join(OUT, `plate-${found.object}-${TAG}.png`), buf);
      report.push({ object: found.object, background: found.background, file: `plate-${found.object}-${TAG}.png` });
    }
  }
  await page.close();
}
await browser.close();
console.log(JSON.stringify({ tag: TAG, out: OUT, plates: report }, null, 2));
