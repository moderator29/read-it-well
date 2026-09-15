import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto("http://localhost:3210/home", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(700);
const out = await page.evaluate(() => {
  const pick = (sel) => [...document.querySelectorAll(sel)].map((el) => {
    const r = el.getBoundingClientRect();
    return { c: String(el.className.baseVal ?? el.className).slice(0,60), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
  const inputs = pick("input[type=search], input[type=text], form");
  const dock = pick("[class*='dock'], [class*='tabbar'], [class*='tab-bar'], nav");
  const cats = pick(".nf-cat");
  return { inputs, dock, cats };
});
console.log("INPUTS/FORMS:"); for (const i of out.inputs) console.log("  ", JSON.stringify(i));
console.log("DOCK/NAV:"); for (const i of out.dock) console.log("  ", JSON.stringify(i));
console.log("CATS:"); for (const i of out.cats) console.log("  ", JSON.stringify(i));
await browser.close();
