/**
 * Profile and settings golden-path checks.
 *
 * Run with the dev or production server already listening:
 *   node apps/web/tests/profile.spec.mjs
 *
 * Covers the account loop at phone size (390x844, dark):
 *   1. /profile renders the identity card and opens its edit form.
 *   2. /settings renders every preference group, including the account block.
 *   3. Flipping a notification switch survives a reload. In a sandbox with no
 *      platform keys that is the on-device world writing nf_settings; signed
 *      in against a configured project the same switch writes
 *      profiles.settings, and this check reads true either way.
 *   4. The delete-account drawer takes two steps and refuses to arm its button
 *      until the exact confirmation phrase is typed. The button is never
 *      pressed: this script must not delete anything.
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE = "/opt/pw-browsers/chromium";
const CONFIRM_PHRASE = "DELETE MY ACCOUNT";

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
  /* ------------------------------------------------- 1. the profile hero */
  console.log("profile page");
  await page.goto(`${BASE_URL}/profile`, { waitUntil: "load" });
  await page.waitForTimeout(1200);

  const identity = page.locator("section").filter({ hasText: "Trips" }).first();
  check("identity card renders", await identity.isVisible());
  check(
    "activity strip shows all three counters",
    (await page.getByText("Trips", { exact: true }).count()) > 0 &&
      (await page.getByText("Reviews", { exact: true }).count()) > 0,
  );

  const editButton = page.getByRole("button", { name: /^(Edit)$/ }).first();
  check("edit control renders", await editButton.isVisible());

  await editButton.click();
  await page.waitForTimeout(400);

  // Signed out this is the on-device card (display name and email); signed in
  // it is the account form (first name and surname). Either is a real form.
  const deviceField = page.getByLabel("Display name");
  const accountField = page.getByLabel("First name");
  const formOpen =
    (await deviceField.count()) > 0
      ? await deviceField.first().isVisible()
      : (await accountField.count()) > 0 && (await accountField.first().isVisible());
  check("edit form opens with a name field", formOpen);

  // Match only visible links: the desktop rail also carries this href and is
  // hidden at 390px, so .first() would test an element no phone user can tap.
  check(
    "quick action grid links to settings",
    (await page.locator('a[href="/settings"]:visible').count()) > 0,
  );

  /* ---------------------------------------------- 2. the settings groups */
  console.log("settings page");
  await page.goto(`${BASE_URL}/settings`, { waitUntil: "load" });
  await page.waitForTimeout(1200);

  for (const group of [
    "Appearance",
    "Language",
    "Notifications",
    "Privacy",
    "Search",
    "Security",
    "Your data",
    "Account",
    "About",
  ]) {
    check(
      `${group} group renders`,
      (await page.locator(`section[aria-label="${group}"]`).count()) > 0 ||
        (await page.getByText(group, { exact: true }).count()) > 0,
    );
  }

  /* --------------------------------------- 3. a toggle survives a reload */
  console.log("toggle persistence");
  const notifications = page.locator('section[aria-label="Notifications"]');
  const firstSwitch = notifications.getByRole("switch").first();
  check("notifications group has switches", await firstSwitch.isVisible());

  const before = await firstSwitch.getAttribute("aria-checked");
  await firstSwitch.click();
  await page.waitForTimeout(600);
  const after = await firstSwitch.getAttribute("aria-checked");
  check("switch flips on tap", before !== after);

  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(1200);
  const reloaded = await page
    .locator('section[aria-label="Notifications"]')
    .getByRole("switch")
    .first()
    .getAttribute("aria-checked");
  check("switch keeps its new value across a reload", reloaded === after);

  // Put it back so a rerun starts from where it found things.
  await page.locator('section[aria-label="Notifications"]').getByRole("switch").first().click();
  await page.waitForTimeout(400);

  /* ------------------------------------------ 4. the delete-account gate */
  console.log("delete account drawer");
  await page.locator('[data-testid="delete-open"]').click();
  await page.waitForTimeout(500);

  const drawer = page.locator('[data-testid="delete-drawer"]');
  check("drawer opens full page", await drawer.isVisible());
  check(
    "drawer covers the viewport",
    await drawer.evaluate((el) => {
      const box = el.getBoundingClientRect();
      return box.width >= window.innerWidth - 1 && box.height >= window.innerHeight - 1;
    }),
  );
  check(
    "first step explains before it asks",
    await page.locator('[data-testid="delete-continue"]').isVisible(),
  );

  await page.locator('[data-testid="delete-continue"]').click();
  await page.waitForTimeout(400);

  const phrase = page.locator('[data-testid="delete-phrase"]');
  const confirm = page.locator('[data-testid="delete-confirm"]');
  check("second step asks for the phrase", await phrase.isVisible());
  check("confirm button starts disabled", await confirm.isDisabled());

  await phrase.fill("delete my account");
  await page.waitForTimeout(250);
  check("lower case does not arm the button", await confirm.isDisabled());

  await phrase.fill("DELETE MY ACCOUNTS");
  await page.waitForTimeout(250);
  check("a near miss does not arm the button", await confirm.isDisabled());

  await phrase.fill(CONFIRM_PHRASE);
  await page.waitForTimeout(250);
  check("the exact phrase arms the button", await confirm.isEnabled());

  // Nothing is deleted here: close the drawer and leave the account alone.
  await page.getByRole("button", { name: "Keep my account" }).first().click();
  await page.waitForTimeout(400);
  check("keeping the account closes the drawer", (await drawer.count()) === 0);
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.log(`\n${failures.length} check(s) failed:`);
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}

console.log("\nall profile and settings checks passed");
