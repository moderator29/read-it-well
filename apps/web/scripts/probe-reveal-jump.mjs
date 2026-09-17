/*
 * A Reveal band is content gated behind an IntersectionObserver, and an
 * observer only fires for a band the viewport actually passes through.
 *
 * The probe that scrolls the page in steps reports every band opaque, because
 * stepping past a band still intersects it. This one asks the question a real
 * reader asks: what if the viewport ARRIVES somewhere without travelling there.
 * Scroll restoration on a back-navigation, an anchor link, and a deep link all
 * do exactly that.
 */
import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });

const report = async (label, fn) => {
  const page = await browser.newPage({ viewport: { width: 768, height: 900 } });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await fn(page);
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const bands = [...document.querySelectorAll("[data-reveal], .nf-reveal")];
    const hidden = bands.filter((el) => Number(getComputedStyle(el).opacity) < 0.99);
    return {
      total: bands.length,
      hidden: hidden.length,
      first: hidden.slice(0, 3).map((el) => (el.textContent || "").trim().slice(0, 46)),
    };
  });
  console.log(`${label.padEnd(34)} ${r.hidden} of ${r.total} bands invisible`);
  for (const t of r.first) console.log(`      "${t}"`);
  await page.close();
};

await report("stepped scroll to the bottom", async (page) => {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
  });
});
await report("jump straight to the bottom", async (page) => {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
});
await report("jump to the middle", async (page) => {
  await page.evaluate(() => window.scrollTo(0, Math.round(document.body.scrollHeight / 2)));
});
await browser.close();
