/*
 * The whole landing page, at three widths, in dark.
 *
 * Exists to prove a spacing migration moves NOTHING. `src/app/page.tsx` is the
 * one file the spacing rule does not cover, because the owner asked for this
 * page to be restored to its pre-scale state and the honest answer at the time
 * was to say so rather than restyle the page he had just asked to be put back.
 * A named rung that resolves to the same pixel value is not a restyle, and this
 * is how that gets proven rather than asserted: same bytes before and after.
 */
import { chromium } from "playwright-core";
const OUT = process.argv[2] || ".";
const TAG = process.argv[3] || "shot";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const w of [390, 768, 1280]) {
  /*
   * `reducedMotion: "reduce"` is what makes this diffable at all.
   *
   * Without it the page is NOT deterministic: the reveal bands animate in, the
   * full-page capture stitches while some are mid-transition, and the same file
   * produces two different page heights and a section that is blank in one shot
   * and present in the next. Two captures of the SAME commit differed by 25px
   * at 1280 and by 0.44 per cent of pixels at 768, which is enough to make a
   * screenshot diff report anything you like.
   *
   * The product already promises that `prefers-reduced-motion: reduce` turns
   * all motion off and leaves the page complete, so this is not a special
   * capture mode, it is the state the standard says must already work.
   */
  const page = await browser.newPage({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${TAG}-${w}.png`, fullPage: true });
  const h = await page.evaluate(() => document.body.scrollHeight);
  console.log(`${w}px  page height ${h}`);
  await page.close();
}
await browser.close();
