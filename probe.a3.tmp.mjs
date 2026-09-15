import { chromium } from "playwright-core";
const routes = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
for (const r of routes) {
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0,180)); });
  page.on("pageerror", (e) => errs.push("PAGEERROR " + String(e).slice(0,180)));
  try {
    await page.goto("http://localhost:3210" + r, { waitUntil: "networkidle", timeout: 45000 });
  } catch (e) { console.log(r, "NAV FAIL", String(e).slice(0,120)); await page.close(); continue; }
  await page.waitForTimeout(600);
  const res = await page.evaluate(() => {
    const de = document.documentElement;
    const out = { scrollW: de.scrollWidth, clientW: de.clientWidth, offenders: [], zero: [], tinyTap: [] };
    const vw = de.clientWidth;
    for (const el of document.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right > vw + 1 || r.left < -1) {
        const cs = getComputedStyle(el);
        out.offenders.push({ t: el.tagName, c: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : String(el.className||"")).slice(0,70), l: Math.round(r.left), r: Math.round(r.right), ov: cs.overflowX });
      }
    }
    for (const img of document.querySelectorAll("img")) {
      const r = img.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) out.zero.push({ src: img.getAttribute("src"), w: Math.round(r.width), h: Math.round(r.height) });
    }
    for (const el of document.querySelectorAll("button,a,[role=button],input[type=checkbox],input[type=radio]")) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)) {
        out.tinyTap.push({ t: el.tagName, txt: (el.textContent||"").trim().slice(0,28), w: Math.round(r.width), h: Math.round(r.height) });
      }
    }
    return out;
  });
  console.log("=== " + r + " ===");
  console.log(" scrollW/clientW:", res.scrollW, "/", res.clientW, res.scrollW > res.clientW ? "  *** H-SCROLL ***" : "");
  if (res.offenders.length) console.log(" overflow els:", JSON.stringify(res.offenders.slice(0,8)));
  if (res.zero.length) console.log(" zero-size imgs:", JSON.stringify(res.zero.slice(0,8)));
  console.log(" sub-44 targets:", res.tinyTap.length, JSON.stringify(res.tinyTap.slice(0,6)));
  if (errs.length) console.log(" console errors:", errs.slice(0,4));
  await page.close();
}
await browser.close();
