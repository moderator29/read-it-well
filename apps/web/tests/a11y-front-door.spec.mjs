/**
 * A16. THE ACCESSIBILITY GATE ON THE FRONT DOOR, IN FOUR LANGUAGES.
 *
 * axe-core (the engine behind @axe-core/playwright, run here directly so the
 * spec needs nothing but playwright-core) over every public page a stranger
 * meets: the landing, sign in and sign up, the welcome, the two checks, the
 * calculator, the supply doors, help, safety and a guide. Each page is loaded
 * in en, ha, yo and ig, in dark and light, with motion off (the Calm/Off
 * setting and `prefers-reduced-motion`), so nothing is mid-animation when
 * axe reads it. SERIOUS and CRITICAL violations fail the run; moderate and
 * minor are printed and do not.
 *
 * Checks axe cannot make, scripted beside it:
 *   - `<html lang>` is the locale that was asked for;
 *   - the page reflows at 320 CSS px (200% zoom of a 640 window) with no
 *     horizontal scroll;
 *   - every page has exactly one `<h1>` and a `main` landmark.
 *
 * NOT FLAKY BY CONSTRUCTION: motion is off and reduced motion is emulated, the
 * page waits for the network to settle and for fonts, axe runs once per page
 * on a settled DOM, and a navigation that times out is retried once before it
 * counts. The CSP is bypassed in the test browser only so axe can be
 * injected; the policy itself is walked by `csp.spec.mjs`.
 *
 * Self-contained, like the other specs. With a server already listening:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/a11y-front-door.spec.mjs
 *   A11Y_MATRIX=quick ...   one theme, 390 only (a fast local pass)
 *   A11Y_LOCALES=en ...     a subset of the four locales
 */

import { chromium } from "playwright-core";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
/* The sandbox's preinstalled Chromium, or the one `playwright-core install` fetched in CI. */
const EXECUTABLE = process.env.CHROMIUM_PATH ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const QUICK = process.env.A11Y_MATRIX === "quick";
const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

export const ROUTES = [
  "/",
  "/sign-in",
  "/sign-in/code",
  "/sign-up",
  "/sign-up/email",
  "/welcome",
  "/check",
  "/r",
  "/move-in-cost",
  "/for-agents",
  "/for-hosts",
  "/for-landlords",
  "/guides",
  "/guides/avoiding-rental-scams",
  "/help",
  "/safety",
];
export const LOCALES = (process.env.A11Y_LOCALES ?? "en,ha,yo,ig").split(",").filter(Boolean);
const THEMES = QUICK ? ["dark"] : ["dark", "light"];
const WIDTHS = QUICK ? [390] : [390, 1440];
export const FAILING_IMPACTS = new Set(["serious", "critical"]);

const failures = [];
const notes = [];

async function load(page, url) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
      await page.evaluate(() => document.fonts?.ready);
      return true;
    } catch (error) {
      if (attempt === 2) {
        failures.push(`${url}: did not load (${String(error).slice(0, 120)})`);
        return false;
      }
    }
  }
  return false;
}

async function audit(browser, { locale, theme, width }) {
  const context = await browser.newContext({
    viewport: { width, height: width < 600 ? 844 : 900 },
    reducedMotion: "reduce",
    bypassCSP: true,
    locale: `${locale}-NG`,
  });
  await context.addCookies(
    [
      ["nf_locale", locale],
      ["nf_theme", theme],
      ["nf_motion", "off"],
      ["vallo_first_run", "seen"],
    ].map(([name, value]) => ({ name, value, url: BASE_URL })),
  );
  const page = await context.newPage();
  for (const route of ROUTES) {
    const where = `${route} [${locale} ${theme} ${width}]`;
    if (!(await load(page, BASE_URL + route))) continue;

    const lang = await page.evaluate(() => document.documentElement.lang);
    if (lang !== locale) failures.push(`${where}: <html lang="${lang}">, expected "${locale}"`);

    const shape = await page.evaluate(() => ({
      h1: document.querySelectorAll("h1").length,
      main: document.querySelectorAll("main, [role=main]").length,
    }));
    if (shape.h1 !== 1) failures.push(`${where}: ${shape.h1} <h1> elements, expected exactly one`);
    if (shape.main < 1) failures.push(`${where}: no main landmark`);

    await page.addScriptTag({ content: AXE_SOURCE });
    const result = await page.evaluate(async () => {
      const r = await window.axe.run(document, { resultTypes: ["violations"] });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }));
    });
    for (const v of result) {
      const line = `${where}: [${v.impact}] ${v.id}: ${v.help} (${v.nodes.join(" | ")})`;
      if (FAILING_IMPACTS.has(v.impact ?? "")) failures.push(line);
      else notes.push(line);
    }

    /* Reflow at 200% zoom: 320 CSS px wide. Only once per locale and theme. */
    if (width === 390) {
      await page.setViewportSize({ width: 320, height: 640 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) failures.push(`${where}: scrolls sideways by ${overflow}px at 320px (200% zoom)`);
      await page.setViewportSize({ width, height: 844 });
    }
  }
  await context.close();
}

async function main() {
  const browser = await chromium.launch({ executablePath: EXECUTABLE });
  try {
    for (const locale of LOCALES) {
      for (const theme of THEMES) {
        for (const width of WIDTHS) {
          console.log(`a11y: ${locale} ${theme} ${width}`);
          await audit(browser, { locale, theme, width });
        }
      }
    }
  } finally {
    await browser.close();
  }
  if (notes.length > 0) {
    console.log(`\n${notes.length} moderate or minor finding(s), not failing:`);
    for (const note of notes.slice(0, 40)) console.log(`  note  ${note}`);
  }
  if (failures.length > 0) {
    console.error(`\n${failures.length} serious or critical finding(s):`);
    for (const failure of failures) console.error(`  FAIL  ${failure}`);
    process.exit(1);
  }
  console.log("\na11y: the front door passes (no serious or critical findings).");
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  main().catch((error) => {
    console.error(error);
    process.exit(2);
  });
}
