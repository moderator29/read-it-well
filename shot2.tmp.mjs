import { chromium } from "playwright-core";
const dir = "/tmp/claude-0/-home-user-read-it-well/9aa8c30d-e76a-54aa-a47f-086f8450029c/scratchpad/";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
for (const theme of ["dark", "light"]) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  const p = await ctx.newPage();
  await p.goto("http://localhost:3122/", { waitUntil: "load", timeout: 60000 });
  await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
  await p.waitForTimeout(800);
  const band = p.locator("section", { hasText: "List your property" }).last();
  await band.scrollIntoViewIfNeeded();
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${dir}agents-${theme}.png` });
  // and the foot
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${dir}foot-${theme}.png` });
  await ctx.close();
}
await b.close();
console.log("ok");
