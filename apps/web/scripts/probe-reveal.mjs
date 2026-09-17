/*
 * Does every `Reveal` band actually reveal on a scroll down the landing page?
 *
 * `threshold: 0.12` is a fraction of the TARGET, not of the viewport, so a
 * section had to get 12 per cent of ITSELF on screen. The taller the section
 * the further it must travel, and past about eight viewports it can never
 * satisfy it at all: the callback never fires and the band sits at opacity 0
 * for ever. This walks the page and reports any band still transparent after
 * it has been scrolled past, which is the failure that bug produces.
 */
import { chromium } from "playwright-core";
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });

const height = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < height; y += 600) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(90);
}
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(700);

const r = await page.evaluate(() => {
  const bands = [...document.querySelectorAll("[data-reveal], .nf-reveal")];
  const hidden = bands
    .map((el, i) => ({ i, o: getComputedStyle(el).opacity, text: (el.textContent || "").trim().slice(0, 40) }))
    .filter((b) => Number(b.o) < 0.99);
  return { count: bands.length, hidden };
});
console.log(`page height ${height}px, ${r.count} reveal bands found`);
if (!r.hidden.length) console.log("every band is fully opaque after the scroll");
else for (const b of r.hidden) console.log(`  STILL HIDDEN opacity=${b.o}  "${b.text}"`);
await browser.close();
