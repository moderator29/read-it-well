/**
 * How many guests a place takes, said once and said the same everywhere.
 *
 *   BASE_URL=http://localhost:3213 node apps/web/tests/capacity.spec.mjs
 *
 * Agent inventory has carried listings.max_guests since the listings_core
 * migration. The wizard collects it at step 5, the admin reviewer reads it, and
 * discovery ignored it completely: the detail page derived "sleeps up to N"
 * from bedrooms at two a bedroom, the reserve steppers let a party of
 * twenty-six be assembled on a studio, and reserve() never checked the number
 * at all. A host who wrote "sleeps 4" on a one-bedroom flat had it advertised
 * as sleeping two, and was hidden from every search for four guests.
 *
 * Capacity is now one function, `sleeps` in lib/listings/filter.ts: the host's
 * declared number where there is one, two a bedroom where there is not.
 *
 * This sandbox has no route to the Supabase host, so the catalogue is the seed
 * half, which declares no capacity. That is the fallback branch, and it is
 * worth proving too: a two-bedroom seed listing must read as four, the panel
 * must say so, and the steppers must be bounded by it. Checked at 390px.
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3213";
const WAIT = 1400;

/* Eko Pearl Waterfront Apartment: two bedrooms, no declared capacity, so the
   convention applies and it sleeps four. */
const LISTING = "seed-1";
const EXPECTED_CAPACITY = 4;

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
    console.log(`\n[${theme}] /listing/${LISTING}`);
    await page.goto(`${BASE_URL}/listing/${LISTING}`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const appliedTheme = await page.evaluate(
      () => document.documentElement.dataset.theme ?? "dark",
    );
    check(
      `the ${theme} theme actually applied`,
      appliedTheme === (theme === "light" ? "light" : "dark"),
    );
    check("no route returned a server error", serverErrors.length === 0);

    /* The capacity sentence lives in the About disclosure, which is a real
       one: the rest of the description is added to the document when it opens
       rather than hidden with CSS. So it has to be opened to be read. */
    const aboutToggle = page.locator('[data-testid="about-toggle"]');
    if ((await aboutToggle.count()) > 0) {
      await aboutToggle.first().click();
      await page.waitForTimeout(200);
    }

    const text = await page.locator("body").innerText();

    check(
      `the description states the capacity (sleeps up to ${EXPECTED_CAPACITY} guests)`,
      new RegExp(`sleeps up to ${EXPECTED_CAPACITY} guests`, "i").test(text),
    );
    check(
      `the reserve panel states the same number`,
      new RegExp(`takes up to ${EXPECTED_CAPACITY} guests`, "i").test(text),
    );

    /* The two must agree. A page that says four in one place and six in
       another is the exact defect this closes. */
    const stated = [...text.matchAll(/up to (\d+) guests?/gi)].map((m) => Number(m[1]));
    check(
      `every capacity sentence on the page agrees (${JSON.stringify(stated)})`,
      stated.length > 0 && stated.every((n) => n === EXPECTED_CAPACITY),
    );

    /* The steppers are bounded by it. Adults starts at 2, so More adults may
       be pressed twice and must then refuse: 2 + 1 + 1 is the ceiling. */
    const panel = page.locator('[data-testid="reserve-panel"]').first();
    check("the reserve panel is present", (await panel.count()) === 1);

    const moreAdults = panel.getByRole("button", { name: /more adults/i });
    const moreChildren = panel.getByRole("button", { name: /more children/i });

    await moreAdults.click();
    await page.waitForTimeout(120);
    await moreAdults.click();
    await page.waitForTimeout(200);

    check(
      "the adults stepper stops at the declared capacity",
      await moreAdults.isDisabled(),
    );
    check(
      "and a child cannot be added past it either",
      await moreChildren.isDisabled(),
    );

    /* Coming back down releases the other stepper again, so the ceiling is
       shared rather than each control having its own. */
    await panel.getByRole("button", { name: /fewer adults/i }).click();
    await page.waitForTimeout(200);
    check("lowering adults frees a place for a child", !(await moreChildren.isDisabled()));
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
