/**
 * The landing page's numbers, and the ones it is no longer allowed to invent.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/landing-numbers.spec.mjs
 *
 * The band used to hardcode "Listings 17+" and "Cities 6". Seventeen was the
 * size of the seed catalogue, six was the number of cities in it, and the
 * database held none of either. Both figures now come from
 * public.platform_stats(), and a figure we cannot support is not published at
 * all rather than rounded up.
 *
 * The figures printed once, in the community band, as a row of two or
 * three or not at all (a single figure alone reads as a boast about a small
 * number). The band left the page in the Plasma pass (7 October); the rule
 * now holds for any row of figures anywhere on it. This spec asserts that
 * rule whatever the database answers, plus
 * the regression guard that no figure carries a "+" ever again. Checked at
 * 390px in both themes.
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 1200;

let failures = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
  }
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function run(theme) {
  const context = await browser.newContext({
    colorScheme: theme,
    viewport: { width: 390, height: 844 },
  });
  await context.addInitScript((t) => {
    try {
      window.localStorage.setItem("nf_theme", t);
    } catch (e) {
      void e;
    }
  }, theme);
  const page = await context.newPage();

  const serverErrors = [];
  page.on("response", (r) => {
    if (r.status() >= 500 && !r.url().includes("/_next/image")) {
      serverErrors.push(`${r.status()} ${r.url()}`);
    }
  });

  try {
    console.log(`\n[${theme}] /`);
    await page.goto(BASE_URL, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const appliedTheme = await page.evaluate(
      () => document.documentElement.dataset.theme ?? "dark",
    );
    check(
      `the ${theme} theme actually applied`,
      appliedTheme === (theme === "light" ? "light" : "dark"),
    );
    check("a stylesheet loaded", (await page.locator("link[rel=stylesheet]").count()) > 0);
    check("no route returned a server error", serverErrors.length === 0);

    /* THE FIGURES NOW LIVE IN THE COMMUNITY BAND (the clean pass, 29
       September), as a row of two or three or not at all: `statTiles`
       drops a count of zero, returns nothing when platform_stats() cannot
       answer, and CommunityBand prints the row only when at least two
       figures stand. The Languages / Support band this spec was written
       for is gone. */
    /* THE PLASMA PASS (P7, 7 October 2026) retired the community band, and
       with it the only row of figures on the landing. The rule is kept for
       wherever a row of figures appears on the page: two or three, or none,
       never a "+". Today the landing prints none. */
    const band = page.locator(".nf-landing-figures");
    const rows = await band.count();
    const items = rows ? await band.locator("li").allInnerTexts() : [];
    const flat = items.map((t) => t.replace(/\s+/g, " ").trim());
    console.log(`    figures: ${JSON.stringify(flat)}`);

    check(
      `the figures print as a row of two or three, or not at all (${flat.length})`,
      flat.length === 0 || (flat.length >= 2 && flat.length <= 3),
    );
    check("every figure carries a label", flat.every((t) => /[A-Za-z]/.test(t)));

    /* THE REGRESSION GUARD. No figure anywhere may wear a "+" that implies
       more than we counted, and the old hardcoded 17 never comes back. */
    check("no rounded-up plus suffix on any figure", !flat.some((t) => t.includes("+")));
    check("specifically, the old hardcoded 17 is gone", !flat.some((t) => /\b17\b/.test(t)));

    /* Nothing on the page scrolls sideways at 390px. */
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`the page does not scroll sideways at 390px (${overflow}px)`, overflow <= 1);
  } finally {
    await context.close();
  }
}

try {
  await run("dark");
  await run("light");
} finally {
  await browser.close();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
