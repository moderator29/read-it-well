/*
 * Does the browser chrome colour follow the PAGE, or the operating system?
 *
 * The four cases that matter are the cross product of "what has this person
 * stored" and "what is their phone set to". Three of the four used to be
 * right by accident and the fourth, a first-time visitor on a light phone,
 * was the whole bug: dark canvas, pale chrome.
 */
import { chromium } from "playwright-core";
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: EXE });

const CASES = [
  ["nothing stored", null, "dark"],
  ["nothing stored", null, "light"],
  ["chose dark", "dark", "light"],
  ["chose light", "light", "dark"],
  ["chose system", "system", "light"],
  ["chose system", "system", "dark"],
];

/*
 * THE SANITY CASE, RUN BEFORE ANY OF THE CASES BELOW.
 *
 * This probe's verdict rests on two things that are easy to get wrong and
 * silent when they are: that a `theme-color` meta tag exists at all, and that
 * the two hex values it is compared against are still the values the product
 * ships. `chromeTheme` maps the content string to "light" or "dark" by
 * comparing it to `#F4F5F7` and `#010118`. If either literal drifts, every row
 * reports "?" and then MISMATCH, which reads as a product fault and is a stale
 * expectation in this file.
 *
 * Those two values live in `src/lib/theme/chrome.ts` now, which is the one file
 * in `src/lib` scoped out of `nf/no-raw-colour` because it IS the definition
 * layer for the four places that paint the chrome. So the check is: does the
 * page ship a theme-color at all, and do the values this probe expects still
 * appear in the document. Anything else and the probe is wrong, not the product.
 *
 * Four instruments in this directory have been confidently wrong about a
 * `getComputedStyle` or a DOM read, so nothing here is believed until a case
 * with a known answer has gone through the same code path.
 */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  const probe = await page.evaluate(() => {
    const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
    return { count: metas.length, contents: metas.map((m) => m.getAttribute("content")) };
  });
  await ctx.close();
  const EXPECTED = ["#F4F5F7", "#010118"];
  const unknown = probe.contents.filter((c) => !EXPECTED.includes(c));
  if (probe.count === 0 || unknown.length > 0) {
    console.error(
      "\nTHIS PROBE IS BROKEN, NOT THE PRODUCT. Sanity case failed:\n" +
        `  theme-color meta tags found: ${probe.count}\n` +
        `  contents: ${probe.contents.join(", ") || "(none)"}\n` +
        `  this probe only recognises: ${EXPECTED.join(", ")}\n\n` +
        "If the count is zero, the page is not shipping a theme colour and every\n" +
        "row below would say MISMATCH for a reason that has nothing to do with\n" +
        "the theme. If a content string is unrecognised, the chrome colour has\n" +
        "moved and THIS FILE is out of date: the values live in\n" +
        "src/lib/theme/chrome.ts. Update the expectation here, then re-run.\n",
    );
    process.exit(1);
  }
}

console.log("stored          OS      page    chrome     verdict");
for (const [label, stored, os] of CASES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: os });
  if (stored) await ctx.addInitScript(`try{localStorage.setItem('nf_theme', ${JSON.stringify(stored)})}catch(e){}`);
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  const r = await page.evaluate(() => {
    const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
    const applicable = metas.find((m) => {
      const q = m.getAttribute("media");
      return !q || window.matchMedia(q).matches;
    });
    return {
      page: document.documentElement.dataset.theme === "light" ? "light" : "dark",
      chrome: applicable ? applicable.getAttribute("content") : "(none)",
      count: metas.length,
    };
  });
  const chromeTheme = r.chrome === "#F4F5F7" ? "light" : r.chrome === "#010118" ? "dark" : "?";
  const verdict = chromeTheme === r.page ? "match" : "MISMATCH";
  console.log(
    `${label.padEnd(15)} ${os.padEnd(7)} ${r.page.padEnd(7)} ${r.chrome.padEnd(10)} ${verdict}`,
  );
  await ctx.close();
}
await browser.close();
