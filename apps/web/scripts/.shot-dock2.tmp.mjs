import { chromium } from "playwright-core";
const OUT = process.argv[2];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const theme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  await ctx.addCookies([{ name: "nf_theme", value: theme, url: "http://localhost:3210" }]);
  const page = await ctx.newPage();
  await page.goto("http://localhost:3210/preview/f1/chrome", { waitUntil: "networkidle", timeout: 180000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/dock-${theme}-390.png` });
  await page.screenshot({ path: `${OUT}/dockzoom-${theme}-390.png`, clip: { x: 0, y: 744, width: 390, height: 100 } });
  await page.screenshot({ path: `${OUT}/headerzoom-${theme}-390.png`, clip: { x: 0, y: 0, width: 390, height: 64 } });
  await page.click(".nf-dockmore__button");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/tray-${theme}-390.png` });
  await page.click(".nf-dockmore__button");
  await page.waitForTimeout(300);
  await page.click("[data-dock-create]");
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/create-sheet-${theme}-390.png` });
  await ctx.close();
}
await browser.close();
