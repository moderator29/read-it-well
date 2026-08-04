// Lead verification harness: screenshot routes at the canonical phone frame.
//
// Usage: node scripts/verify-shots.mjs [--light] [--base http://localhost:3210] route [route...]
// Writes PNGs to scripts/.shots/<route-slug>-<dark|light>.png at 390x844.
// Chromium lives at /opt/pw-browsers/chromium in this environment; dark is the
// platform default so dark shots are the default here too.
//
// Why this writes localStorage rather than only setting Playwright's
// colorScheme: this product deliberately ignores the operating system. The
// before-paint script in app/layout.tsx moves the theme only for an explicit
// stored choice ("light", or "system" when the OS agrees), so a browser context
// created with colorScheme "light" and nothing in storage renders DARK.
//
// That is not hypothetical. Every `--light` shot taken before this fix came back
// byte-identical to its dark twin, which means the "look at it in both themes"
// ritual had been checking dark twice for everyone since the theme default
// changed. The assertion below is the part that matters: the harness now refuses
// to write a file it cannot prove is the theme that was asked for, so this can
// never fail silently again.

import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

const theme = light ? "light" : "dark";

// Resolved from this file, never from the caller's cwd. Running the harness from
// apps/web (which is where the specs are served from, so it is the natural place
// to run it) used to create a second, untracked apps/web/scripts/.shots that the
// root .gitignore does not cover, and those PNGs then showed up as changes to
// commit. One output directory, wherever you run this from.
const outDir = join(dirname(fileURLToPath(import.meta.url)), ".shots");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: theme,
  deviceScaleFactor: 2,
});

// Runs before any page script on every navigation, so the before-paint reader in
// app/layout.tsx sees the choice a real visitor would have stored by using the
// toggle. No flash, no OS dependency.
await context.addInitScript((choice) => {
  try {
    window.localStorage.setItem("nf_theme", choice);
  } catch {
    /* storage can be unavailable; the assertion below will catch the result */
  }
}, theme);

let failures = 0;

for (const route of routes) {
  const page = await context.newPage();
  const url = base + (route.startsWith("/") ? route : "/" + route);
  try {
    await page.goto(url, { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(2500);

    // Prove the theme took before writing a file that claims it did.
    const applied = await page.evaluate(
      () => document.documentElement.dataset.theme ?? "dark",
    );
    if (applied !== theme) {
      failures += 1;
      console.error(
        `FAILED ${route}: asked for ${theme}, the page rendered ${applied}. No file written.`,
      );
      continue;
    }

    const slug = route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "root";
    const file = join(outDir, `${slug}-${theme}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log("shot", route, `(${theme})`, "->", file);
  } catch (err) {
    failures += 1;
    console.error("FAILED", route, String(err).split("\n")[0]);
  } finally {
    await page.close();
  }
}

await browser.close();

if (failures > 0) {
  console.error(`${failures} route(s) produced no screenshot.`);
  process.exit(1);
}
