import { chromium } from "playwright-core";
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = process.argv[2];
const browser = await chromium.launch({ executablePath: EXE });

for (const theme of ["dark", "light"]) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 1400 },
    deviceScaleFactor: 2,
    colorScheme: theme,
  });
  await page.goto("http://localhost:3000/gallery", { waitUntil: "networkidle" });
  await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
  await page.waitForTimeout(400);

  for (const [name, heading] of [
    ["queue", "An empty queue, all three of them"],
    ["wait", "A money call that is taking too long"],
  ]) {
    const section = page.locator("section", { has: page.locator(`h2:text-is("${heading}")`) });
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await section.screenshot({ path: `${OUT}/${name}-${theme}.png` });
    console.log(`${name}-${theme}.png`);
  }
  await page.close();
}
await browser.close();
