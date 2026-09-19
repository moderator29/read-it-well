// Desktop verification harness: node scripts/verify-desktop.mjs <base> <route> <out.png> [dark|light] [fullpage]
// The 1440x900 twin of verify-shots.mjs, writing the theme the same way so a light shot is really light.
import { chromium } from "playwright-core";

const [base, route, out, theme = "dark", full = ""] = process.argv.slice(2);
const fullPage = full === "fullpage";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
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
await page.waitForTimeout(600);

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
  for (let y = 0, guard = 0; guard < 80; guard += 1) {
    const height = await page.evaluate(() => document.body.scrollHeight);
    if (y > height) break;
    await page.evaluate((to) => window.scrollTo(0, to), y);
    await page.waitForTimeout(220);
    y += 450;
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

await page.screenshot({ path: out, fullPage });
await browser.close();
console.log("shot", route, "->", out);
