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

  // Signed in, the profile wears the social header: a cover band, the avatar on
  // the stride ring, and both changeable in place. Signed out it is the
  // on-device identity card, which is a different component on purpose.
  const hero = page.locator('[data-testid="account-hero"]');
  const signedIn = (await hero.count()) > 0;

  if (signedIn) {
    check("the account hero renders", await hero.isVisible());
    check(
      "the cover band is present",
      (await page.locator(".nf-social-cover").count()) > 0,
    );
    check(
      "the avatar opens a picker",
      await page.locator('[data-testid="account-avatar-button"]').isVisible(),
    );
    check(
      "both tabs render",
      (await page.locator('[data-testid="account-tab-account"]').count()) > 0 &&
        (await page.locator('[data-testid="account-tab-posts"]').count()) > 0,
    );
    check(
      "the account tab lists what you have here",
      await page.locator('[data-testid="row-bookings"]').isVisible(),
    );

    // Your details open in a sheet rather than expanding the page under your
    // thumb. Escape must close it: this is the one modal on the account.
    await page.locator('[data-testid="row-details"]').click();
    await page.waitForTimeout(500);
    const sheet = page.locator('[role="dialog"]');
    check("your details open in a sheet", await sheet.isVisible());
    check(
      "the sheet carries a name field",
      await page.getByLabel(/First name/).first().isVisible(),
    );
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    check("escape closes the sheet", (await sheet.count()) === 0);

    // The Posts tab is the public page's own panel, so a post looks the same
    // wherever it is read.
    await page.locator('[data-testid="account-tab-posts"]').click();
    await page.waitForTimeout(500);
    check(
      "the posts tab renders its panel",
      await page.locator("#account-panel-posts").isVisible(),
    );
    await page.locator('[data-testid="account-tab-account"]').click();
    await page.waitForTimeout(300);
  } else {
    // Signed out, the same header shape stands with only what is actually
    // known on it. It used to state 8 trips, 23 saved and 5 reviews to
    // somebody who had never booked anything, as three constants in the file.
    const signedOut = page.locator('[data-testid="signed-out-hero"]');
    check("the signed-out hero renders", await signedOut.isVisible());
    check(
      "it wears the same cover band as a real profile",
      (await page.locator(".nf-social-cover").count()) > 0,
    );
    check(
      "no invented activity counts",
      (await page.getByText("23", { exact: true }).count()) === 0 &&
        (await page.getByText("Trips", { exact: true }).count()) === 0,
    );

    // The two device keys the support chat prefills from must stay writable.
    // Removing their only editor would leave anybody who had set a name stuck
    // with it forever.
    await page.locator('[data-testid="device-name-row"]').click();
    await page.waitForTimeout(500);
    const sheet = page.locator('[role="dialog"]');
    check("the device details open in a sheet", await sheet.isVisible());

    const nameInput = page.locator('[data-testid="device-name-input"]');
    await nameInput.fill("Chidi");
    await page.locator('[data-testid="device-name-save"]').click();
    await page.waitForTimeout(500);
    check("saving closes the sheet", (await sheet.count()) === 0);
    check(
      "the new name is on the page",
      (await page.getByText("Chidi", { exact: true }).count()) > 0,
    );

    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(1200);
    check(
      "the name survives a reload",
      (await page.getByText("Chidi", { exact: true }).count()) > 0,
    );

    await page.locator('[data-testid="device-name-row"]').click();
    await page.waitForTimeout(400);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    check("escape closes the sheet", (await page.locator('[role="dialog"]').count()) === 0);
  }

  // Match only visible links: the desktop rail also carries this href and is
  // hidden at 390px, so .first() would test an element no phone user can tap.
  check(
    "the account reaches settings",
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
