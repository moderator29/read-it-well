/**
 * Reporting a listing.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/report.spec.mjs
 *
 * public.reports has had a correct owner policy and an admin queue since the
 * trust migration, and exactly one writer: the social layer's report-a-post
 * action. Nothing let anyone report a LISTING, which is the object money moves
 * against and therefore the one worth faking.
 *
 * The database half is proven against live Postgres rather than through a
 * browser: the reporter files under their own policy, the acknowledgement
 * notification and the high-severity risk alert both arrive by trigger, a
 * second open report on the same target is refused by the partial unique
 * index, a different person may still report the same thing, an impersonated
 * report is refused 42501 and an invented category 23514.
 *
 * This spec covers the half a browser can: the control exists on a listing, it
 * opens a full-page dialog, the categories are the ones the database accepts,
 * Send is refused until a reason is chosen, and signed out is a designed state
 * rather than a missing control. Checked at 390px in both themes.
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 1400;

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
    console.log(`\n[${theme}] /listing/seed-1`);
    await page.goto(`${BASE_URL}/listing/seed-1`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const appliedTheme = await page.evaluate(
      () => document.documentElement.dataset.theme ?? "dark",
    );
    check(
      `the ${theme} theme actually applied`,
      appliedTheme === (theme === "light" ? "light" : "dark"),
    );
    check("no route returned a server error", serverErrors.length === 0);

    const opener = page.locator('[data-testid="report-opener"]');
    check("the listing offers a way to report it", (await opener.count()) === 1);

    await opener.click();
    await page.waitForTimeout(400);

    const sheet = page.locator('[data-testid="report-sheet"]');
    check("it opens a full-page sheet", (await sheet.count()) === 1);

    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    check("the sheet is a real dialog", (await dialog.count()) >= 1);

    const box = await sheet.boundingBox();
    check(
      `the sheet fills the phone rather than half of it (${box ? Math.round(box.height) : 0}px)`,
      box !== null && box.height >= 800 && box.width >= 380,
    );

    const text = await sheet.innerText();

    /* Signed out is a designed state, not a hidden control: this sandbox has no
       route to the Supabase host, so that is the branch under test here. */
    const signedOut = /Sign in to report this/i.test(text);
    if (signedOut) {
      check("signed out says why, rather than hiding the control", /belongs to somebody/i.test(text));
      check(
        "and offers the way in",
        (await sheet.locator('a[href="/sign-in"]').count()) > 0,
      );
    } else {
      const options = await sheet.locator('input[name="category"]').count();
      check(`every category is offered (${options})`, options === 8);
      check(
        "the serious one is named plainly",
        /pay outside RentMe/i.test(text),
      );
      const submit = sheet.locator('button[type="submit"]');
      check("send is refused until a reason is chosen", await submit.isDisabled());
      await sheet.locator('input[name="category"]').first().check();
      await page.waitForTimeout(150);
      check("and allowed once one is", !(await submit.isDisabled()));
    }

    check("the sheet says the host is never told who reported", /never told who/i.test(text));

    /* Escape closes it and hands focus back, the same contract the filter
       drawer keeps. */
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    check("escape closes the sheet", (await page.locator('[data-testid="report-sheet"]').count()) === 0);

    check("no route returned a server error while reporting", serverErrors.length === 0);
    if (serverErrors.length > 0) console.log("   ", serverErrors.join("\n    "));
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
