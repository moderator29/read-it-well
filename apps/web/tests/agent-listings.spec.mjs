/**
 * Agent listings golden-path checks: the supply loop's front door.
 *
 * Run with the dev or production server already listening:
 *   node apps/web/tests/agent-listings.spec.mjs
 *
 * Covers three things at phone size (390x844, dark), which is where an agent
 * actually lists a property:
 *   1. /agent/list resolves to one of its two honest states: step one of the
 *      wizard for an approved agent, or the pitch for everyone else.
 *   2. When the wizard renders, the title requirement fires inline, in the same
 *      words the submit checklist uses, and the step does not advance.
 *   3. /agent/listings renders the workspace shell (or the same pitch), never a
 *      dead end.
 *
 * The sandbox has no Supabase keys, so the signed-out and unconfigured paths
 * are the ones exercised here; both are real product states, not stand-ins.
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE = "/opt/pw-browsers/chromium";

const failures = [];
function check(label, condition) {
  if (condition) {
    console.log(`  ok    ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}`);
  }
}

const browser = await chromium.launch({ executablePath: EXECUTABLE });
const context = await browser.newContext({
  colorScheme: "dark",
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

try {
  /* ------------------------------------------------ 1. the wizard or pitch */
  console.log("agent list");
  await page.goto(`${BASE_URL}/agent/list`, { waitUntil: "load" });
  await page.waitForTimeout(1200);

  const titleInput = page.locator('input[placeholder="Bright 2 bedroom flat in Lekki Phase 1"]');
  const wizardVisible = await titleInput.isVisible().catch(() => false);
  const pitchVisible = await page
    .locator("text=List your property on RentMe")
    .first()
    .isVisible()
    .catch(() => false);

  check("step one or the pitch renders", wizardVisible || pitchVisible);

  if (wizardVisible) {
    check("step one is named", await page.locator("text=Basic info").first().isVisible());
    check(
      "the step counter reads one of seven",
      await page.locator("text=Step 1 of 7").first().isVisible(),
    );
    check(
      "the sticky footer offers the way forward",
      await page.locator('button:has-text("Next")').first().isVisible(),
    );

    /* ------------------------------------------- 2. inline title validation */
    console.log("title validation");
    await titleInput.fill("Flat");
    await page.locator('button:has-text("Next")').first().click();
    await page.waitForTimeout(900);

    check(
      "a short title is refused in the gate's own words",
      await page
        .locator("text=Give the listing a title of at least 8 characters.")
        .first()
        .isVisible(),
    );
    check(
      "the wizard stays on step one",
      await page.locator("text=Step 1 of 7").first().isVisible(),
    );

    await titleInput.fill("Bright 2 bedroom flat in Lekki Phase 1");
    await page.locator('button:has-text("Next")').first().click();
    await page.waitForTimeout(900);
    check(
      "a good title moves the wizard on",
      await page.locator("text=Step 2 of 7").first().isVisible(),
    );
  } else {
    check(
      "the pitch routes to the application",
      await page.locator('a[href="/agents/apply"]').first().isVisible(),
    );
  }

  /* --------------------------------------------------- 3. the workspace */
  console.log("agent listings");
  await page.goto(`${BASE_URL}/agent/listings`, { waitUntil: "load" });
  await page.waitForTimeout(1200);

  const workspaceHeading = await page
    .locator("h1, h2")
    .filter({ hasText: /My listings|List your property on RentMe/ })
    .first()
    .isVisible()
    .catch(() => false);
  check("the workspace shell renders", workspaceHeading);

  // Visible-only, for the same reason as elsewhere: the agent rail carries
  // these hrefs and is hidden at 390px, so a .first() match proves nothing
  // about what someone on a phone can actually reach.
  check(
    "there is always a way into the wizard",
    (await page.locator('a[href="/agent/list"]:visible').count()) > 0 ||
      (await page.locator('a[href="/agents/apply"]:visible').count()) > 0,
  );

  check(
    "no horizontal overflow at 390px",
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  );
} finally {
  await browser.close();
}

console.log("");
if (failures.length > 0) {
  console.log(`${failures.length} check(s) failed:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("all agent listing checks passed");
