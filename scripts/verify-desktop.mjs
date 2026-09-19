// Desktop verification harness: node scripts/verify-desktop.mjs <base> <route> <out.png> [dark|light] [fullpage]
// The 1440x900 twin of verify-shots.mjs, writing the theme the same way so a light shot is really light.
import { chromium } from "playwright-core";

const [base, route, out, theme = "dark", full = ""] = process.argv.slice(2);
const fullPage = full === "fullpage";

/*
 * THE BLUR FLAGS, AND WHY THIS HARNESS WAS LYING TO EVERY WORKER.
 *
 * Headless Chromium in this container has no GPU, and `backdrop-filter` is
 * silently DROPPED rather than approximated: it does not warn, it does not
 * fall back, it simply paints nothing. Every `.nf-glass` surface in this
 * product is built on that property, so every proof this harness has ever
 * written showed the glass as a flat low-alpha wash with the page legible
 * straight through it. Workers judged glass depth, the dock capsule, the lit
 * edge and a pinned bar's separation from the page against pictures that did
 * not contain the material they were judging, and at least three phantom
 * faults ("text painted over text under a sticky bar") were nearly filed off
 * these files.
 *
 * SwiftShader is a software rasteriser, so the effect is composited on the
 * CPU and the shot is what a phone would actually draw. It costs seconds per
 * page and buys the only thing a proof is for.
 */
const LAUNCH_ARGS = ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"];

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: LAUNCH_ARGS,
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: theme,
});
await ctx.addInitScript((choice) => {
  try {
    localStorage.setItem("nf_theme", choice);
  } catch {}
}, theme);
const page = await ctx.newPage();

/*
 * `networkidle` on a route that holds an open connection never settles, and
 * on this product several do. `load` plus the settle below is what the phone
 * harness already does, and it is what made a landing shot possible at all.
 */
await page.goto(base + route, { waitUntil: "load", timeout: 90_000 });

/*
 * THE SETTLE, AND WHY 600ms WAS A LIE ON THIS BOX.
 *
 * A proof taken 600ms after `load` on a machine carrying twenty other dev
 * servers catches the page before its photography has decoded and before the
 * entrance animation has run, so the shot shows an empty frame where the hero
 * image belongs and a band mid-rise. F2 threw away a desktop hero proof for
 * exactly this and said so rather than filing findings off it.
 *
 * Waiting for every image to actually decode is the honest version of a
 * settle: it is bounded, it is about the thing being judged, and on a quiet
 * box it costs almost nothing. The timeout is generous because a cold
 * Turbopack compile on four saturated cores is measured in minutes, not
 * milliseconds, and a shot that times out is better than a shot that lies.
 */
await page
  .waitForFunction(
    () => Array.from(document.images).every((img) => img.complete),
    null,
    { timeout: 60_000 },
  )
  .catch(() => {});
await page.waitForTimeout(1_500);

/*
 * THE SCROLL PRIME, and why a fullpage shot is worthless without it.
 *
 * Every band below the fold on the marketing pages is wrapped in `Reveal`,
 * which fades a block in only when an IntersectionObserver sees it. Playwright
 * never scrolls for a fullPage screenshot: it resizes the capture and shoots.
 * So a fullpage shot of a Reveal page came back as the hero and then four and
 * a half thousand pixels of empty navy, and a worker reading that shot would
 * report the whole middle of the page missing. Walking a viewport at a time to
 * the foot fires every observer, and returning to the top leaves the page in
 * the state a reader actually meets.
 */
if (fullPage) {
  /*
   * The height is re-read every step, because a band that has just revealed
   * can change it, and a loop that trusted one measurement taken while the
   * page was still folded stopped short and left the last four bands dark.
   * Half a viewport a step with a real dwell, because an IntersectionObserver
   * fires on a frame the element is actually visible for, not on a scroll
   * position flicked past.
   */
  /*
   * `behavior: "instant"`, AND THIS IS THE THIRD REASON THIS HARNESS HAS LIED
   * TODAY.
   *
   * `base.css` sets `html { scroll-behavior: smooth }`. A smooth scroll is an
   * animation, and in headless Chromium with no compositor that animation
   * never advances, so `window.scrollTo(0, y)` RETURNS HAVING DONE NOTHING.
   * It does not throw and it does not warn: `window.scrollY` is measured at
   * 0 after the call, at 80ms and at 500ms, while a real wheel gesture of the
   * same distance moves the page normally. F2 measured exactly that.
   *
   * So the prime below primed nothing, no IntersectionObserver below the fold
   * ever fired, and a fullpage capture came back with 20 of its 21 `Reveal`
   * bands still at `opacity: 0`. That is the same picture the blur fault and
   * the Content Security Policy fault each produced on their own, which is
   * why two fixes went in before anybody found this one: three separate
   * causes, one indistinguishable symptom.
   *
   * `behavior: "instant"` opts out of the CSS smooth behaviour for this call
   * only and jumps the page. Nothing else changes.
   */
  const jump = (to) => window.scrollTo({ top: to, left: 0, behavior: "instant" });

  for (let y = 0, guard = 0; guard < 80; guard += 1) {
    const height = await page.evaluate(() => document.body.scrollHeight);
    if (y > height) break;
    await page.evaluate(jump, y);
    await page.waitForTimeout(220);
    y += 450;
  }
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, left: 0, behavior: "instant" }));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  await page.waitForTimeout(500);

  /*
   * And prove the prime actually moved the page, rather than trusting it a
   * fourth time. A harness that cannot tell whether it primed is a harness
   * that will lie again, so it says so on stderr and the shot is suspect.
   */
  const reveals = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll(".nf-reveal"));
    return { total: all.length, shown: all.filter((el) => Number(getComputedStyle(el).opacity) > 0.5).length };
  });
  if (reveals.total > 0 && reveals.shown < reveals.total) {
    console.error(
      `WARNING: ${reveals.total - reveals.shown} of ${reveals.total} Reveal bands are still hidden. ` +
        "This shot does not show the page a reader meets. Do not judge anything below the fold from it.",
    );
  }
}

await page.screenshot({ path: out, fullPage });
await browser.close();
console.log("shot", route, "->", out);
