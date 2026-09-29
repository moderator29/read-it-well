/**
 * How many guests a place takes, said once and said the same everywhere.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/capacity.spec.mjs
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
 * Since 23 September a listing page answers a signed-out visitor with the
 * sign-in wall (asserted first). The reserve panel's half is then read in the
 * preview harness (`/preview/session-b/sweep-home/listing-parts`, the real
 * ReservePanel for a place that takes four): the panel states the number and
 * the steppers are bounded by it, shared between adults and children. The
 * detail page's own sentence ("It sleeps up to N", `listing/[id]/page.tsx`)
 * and its agreement with the panel need a real listing and a session: they
 * run signed in as the QA member against `/listing/${LISTING}` and SKIP
 * without QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD, or when no listing is behind
 * the id. Checked at 390px in both themes.
 */

import { chromium } from "playwright-core";
import { expectSignInWall, openPreview, qaContext, signInAsQa, skip } from "./_gate.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 1400;

/* Eko Pearl Waterfront Apartment: two bedrooms, no declared capacity, so the
   convention applies and it sleeps four. */
const LISTING = process.env.CAPACITY_LISTING ?? "seed-1";
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

async function themed(theme, state) {
  const options = { colorScheme: theme, viewport: { width: 390, height: 844 } };
  const context = state ? await qaContext(browser, state, options) : await browser.newContext(options);
  await context.addInitScript((t) => {
    try {
      window.localStorage.setItem("nf_theme", t);
    } catch (e) {
      void e;
    }
  }, theme);
  return context;
}

/** The steppers are bounded by the stated capacity, shared by both. */
async function steppers(page, panel) {
  const moreAdults = panel.getByRole("button", { name: /more adults/i });
  const moreChildren = panel.getByRole("button", { name: /more children/i });

  /* Adults starts at 2, so More adults may be pressed twice and must then
     refuse: 2 + 1 + 1 is the ceiling. */
  await moreAdults.click();
  await page.waitForTimeout(120);
  await moreAdults.click();
  await page.waitForTimeout(200);

  check("the adults stepper stops at the declared capacity", await moreAdults.isDisabled());
  check("and a child cannot be added past it either", await moreChildren.isDisabled());

  /* Coming back down releases the other stepper again, so the ceiling is
     shared rather than each control having its own. */
  await panel.getByRole("button", { name: /fewer adults/i }).click();
  await page.waitForTimeout(200);
  check("lowering adults frees a place for a child", !(await moreChildren.isDisabled()));
}

async function preview(theme) {
  const context = await themed(theme, null);
  const page = await context.newPage();
  try {
    console.log(`\n[${theme}] /preview/session-b/sweep-home/listing-parts (reserve panel)`);
    if (!(await openPreview(page, "/preview/session-b/sweep-home/listing-parts", check, { wait: WAIT }))) return;
    const appliedTheme = await page.evaluate(() => document.documentElement.dataset.theme ?? "dark");
    check(`the ${theme} theme actually applied`, appliedTheme === (theme === "light" ? "light" : "dark"));
    const panel = page.locator('[data-testid="reserve-panel"]').first();
    check("the reserve panel is present", (await panel.count()) === 1);
    check(
      `the reserve panel states the capacity (takes up to ${EXPECTED_CAPACITY} guests)`,
      new RegExp(`takes up to ${EXPECTED_CAPACITY} guests`, "i").test(await panel.innerText()),
    );
    await steppers(page, panel);
  } finally {
    await context.close();
  }
}

async function live(theme, state) {
  const context = await themed(theme, state);
  const page = await context.newPage();
  const serverErrors = [];
  page.on("response", (r) => {
    if (r.status() >= 500 && !r.url().includes("/_next/image")) {
      serverErrors.push(`${r.status()} ${r.url()}`);
    }
  });

  try {
    console.log(`\n[${theme}] /listing/${LISTING} (signed in)`);
    await page.goto(`${BASE_URL}/listing/${LISTING}`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    check("no route returned a server error", serverErrors.length === 0);

    /* Every check below needs a listing to exist, and the catalogue of
       twenty-three invented places was removed on purpose (tests/_catalogue.mjs). */
    if ((await page.locator('[data-testid="listing-gallery"]').count()) === 0) {
      skip(`no listing behind /listing/${LISTING}, so there is no capacity to state (set CAPACITY_LISTING to a two-bedroom stay with no declared capacity)`);
      return;
    }

    /* The capacity sentence lives in the About disclosure, which is a real
       one: the rest of the description is added to the document when it opens. */
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
    /* The two must agree. */
    const stated = [...text.matchAll(/up to (\d+) guests?/gi)].map((m) => Number(m[1]));
    check(
      `every capacity sentence on the page agrees (${JSON.stringify(stated)})`,
      stated.length > 0 && stated.every((n) => n === EXPECTED_CAPACITY),
    );
    const panel = page.locator('[data-testid="reserve-panel"]').first();
    check("the reserve panel is present", (await panel.count()) === 1);
    await steppers(page, panel);
  } finally {
    await context.close();
  }
}

try {
  console.log("signed out");
  await expectSignInWall(check, `/listing/${LISTING}`);
  await preview("dark");
  await preview("light");
  console.log("\nsigned in as the QA member");
  const state = await signInAsQa(browser);
  if (state) {
    await live("dark", state);
    await live("light", state);
  }
} finally {
  await browser.close();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
