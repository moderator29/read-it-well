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
 * This sandbox has no route to the Supabase host, so the read returns null and
 * the honest band is the two facts that are true without any inventory:
 * Languages 4 and Support 24/7. That is exactly the state this spec asserts,
 * plus the regression guard that no inventory claim carries a "+" ever again.
 * Checked at 390px in both themes.
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

    const band = page.locator('[data-testid="numbers-band"]');
    check("the numbers band renders", (await band.count()) === 1);

    const items = await band.locator("li").allInnerTexts();
    const flat = items.map((t) => t.replace(/\s+/g, " ").trim());
    console.log(`    band: ${JSON.stringify(flat)}`);

    check("every figure carries a label", flat.every((t) => /[A-Za-z]/.test(t)));

    /* THE REGRESSION GUARD. An inventory count is a claim. With nothing
       published there must be no Listings or Cities figure at all, and no
       figure anywhere may wear a "+" that implies more than we counted. */
    const labels = flat.map((t) => t.replace(/[\d/+,\s]/g, ""));
    check(
      `no unsupported inventory claim (labels ${JSON.stringify(labels)})`,
      !labels.includes("Listings") && !labels.includes("Cities"),
    );
    check("no rounded-up plus suffix on any figure", !flat.some((t) => t.includes("+")));
    check("specifically, the old hardcoded 17 is gone", !flat.some((t) => /\b17\b/.test(t)));

    check("the two true facts are still stated", flat.length === 2);
    check(
      "languages, which is true because four locales ship",
      flat.some((t) => /Languages/.test(t) && /4/.test(t)),
    );
    check(
      "support, stated as 24/7",
      flat.some((t) => /Support/.test(t) && t.includes("24/7")),
    );

    /* The band is inside a card at 390px and must not overflow it. */
    const overflow = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="numbers-band"]');
      if (!el) return 0;
      return el.scrollWidth - el.clientWidth;
    });
    check(`the band does not scroll sideways at 390px (${overflow}px)`, overflow <= 1);
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
