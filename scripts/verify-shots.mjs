// Lead verification harness: screenshot routes at the canonical phone frame.
//
// Usage: node scripts/verify-shots.mjs [--light] [--base http://localhost:3210] route [route...]
// Writes PNGs to scripts/.shots/<route-slug>-<dark|light>.png at 390x844.
// Chromium lives at /opt/pw-browsers/chromium in this environment; dark is the
// platform default so dark shots are the default here too.

import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const light = args.includes("--light");
const baseIdx = args.indexOf("--base");
const base = baseIdx >= 0 ? args[baseIdx + 1] : "http://localhost:3210";
const routes = args.filter(
  (a, i) => !a.startsWith("--") && (baseIdx < 0 || i !== baseIdx + 1),
);

if (routes.length === 0) {
  console.error("No routes given.");
  process.exit(1);
}

const outDir = join(process.cwd(), "scripts", ".shots");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: light ? "light" : "dark",
  deviceScaleFactor: 2,
});

for (const route of routes) {
  const page = await context.newPage();
  const url = base + (route.startsWith("/") ? route : "/" + route);
  try {
    await page.goto(url, { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(2500);
    const slug = route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "root";
    const file = join(outDir, `${slug}-${light ? "light" : "dark"}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log("shot", route, "->", file);
  } catch (err) {
    console.error("FAILED", route, String(err).split("\n")[0]);
  } finally {
    await page.close();
  }
}

await browser.close();
