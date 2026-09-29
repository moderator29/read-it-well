/**
 * The two pickers, at signup and in settings.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/place-pickers.spec.mjs
 *
 * `public.occupations` holds 749 rows and `public.local_governments` holds all
 * 774, both with a public read policy. This spec guards the shape of the answer.
 *
 * 1. Sign-up is split, not stacked. `/sign-up` is the options page and
 *    `/sign-up/email` carries the form, now in TWO STEPS: "Your account"
 *    (names, email, password) and "A little about you" (nickname, place,
 *    occupation, how you found us, 18+ and terms). This spec used to expect
 *    four headed groups on one page and a "Continue with email" link beside
 *    Google and Apple; the options page now offers "Sign up with email" and
 *    the way back to it is the auth bar's Back control.
 * 2. The three place fields are pickers, not selects. A 774-row native select
 *    on a phone is a spinning wheel somebody scrolls for half a minute.
 * 3. The local government picker is disabled until a state is chosen, because a
 *    local government in the wrong state is refused by the database with
 *    SQLSTATE RM020 and the form should never let somebody reach that.
 * 4. Opening a picker gives a full-page drawer with a search field in it.
 * 5. `/settings/place` answers a signed-out visitor with the sign-in wall
 *    (since 23 September), and its form, read in the preview harness
 *    (`/preview/session-b/sweep-settings?v=place`, the real PlaceCard), carries
 *    the same three pickers.
 *
 * Nothing is submitted: step 1 is filled with an address at a reserved domain
 * (RFC 2606) only so Next can show step 2.
 */

import { chromium } from "playwright-core";
import { expectSignInWall, openPreview, signedOutContext } from "./_gate.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 900;

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}${detail ? `\n          ${detail}` : ""}`);
  }
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

/** Fill a field, retrying until hydration has stopped wiping it. */
async function fillHydrated(page, selector, value) {
  for (let i = 0; i < 40; i++) {
    await page.fill(selector, value);
    if ((await page.inputValue(selector)) === value) return;
    await page.waitForTimeout(250);
  }
}

/** The three pickers on whatever form is open, and the drawer behind one. */
async function pickers(page, { postsCodes }) {
  const statePicker = page.getByTestId("state-picker");
  const lgaPicker = page.getByTestId("lga-picker");
  const occupationPicker = page.getByTestId("occupation-picker");

  check("the state picker is on the form", await statePicker.isVisible());
  check("the local government picker is on the form", await lgaPicker.isVisible());
  check("the occupation picker is on the form", await occupationPicker.isVisible());

  if (postsCodes) {
    check("the local government picker waits for a state", await lgaPicker.isDisabled());
    /* Every choice is posted as a code, under the name the server validates. */
    for (const name of ["stateCode", "lgaCode", "occupationCode"]) {
      check(
        `the form posts ${name}`,
        (await page.locator(`input[type="hidden"][name="${name}"]`).count()) === 1,
      );
    }
  }

  /* None of the three may be a native select: that is the whole point. */
  check(
    "no native select is used for the long lists",
    (await page.locator('select[name="stateCode"], select[name="lgaCode"], select[name="occupationCode"]').count()) === 0,
  );

  await occupationPicker.click();
  await page.waitForTimeout(500);
  const drawer = page.getByTestId("occupation-picker-drawer");
  check("opening a picker opens a full-page drawer", (await drawer.count()) === 1);
  if ((await drawer.count()) === 1) {
    const box = await drawer.boundingBox();
    check(
      "the drawer covers the whole page, not part of it",
      !!box && box.width >= 380 && box.height >= 800,
      JSON.stringify(box),
    );
    check(
      "the drawer carries a search field",
      (await drawer.locator('input[type="search"]').count()) === 1,
    );
    const drawerText = await drawer.evaluate((node) => node.innerText);
    check(
      "the list, or the sentence saying it could not load, is on screen",
      drawerText.length > 0,
      drawerText.slice(0, 120),
    );
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
}

async function run(theme) {
  const context = await signedOutContext(
    browser,
    { viewport: { width: 390, height: 844 }, colorScheme: theme },
    BASE_URL,
  );
  await context.addInitScript((choice) => {
    try {
      window.localStorage.setItem("nf_theme", choice);
    } catch (error) {
      void error;
    }
  }, theme);
  const page = await context.newPage();

  const serverErrors = [];
  page.on("response", (r) => {
    if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`);
  });

  try {
    console.log(`\n[${theme} 390px] /sign-up`);
    await page.goto(`${BASE_URL}/sign-up`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const applied = await page.evaluate(() => document.documentElement.dataset.theme ?? "dark");
    check(`the ${theme} theme actually applied`, applied === theme);

    check(
      "no UI copy calls the product a demo",
      !(await page.evaluate(() => document.body.innerText)).toLowerCase().includes("demo"),
    );

    /* Email is a link, not an in-place expansion. */
    await page.getByRole("link", { name: /sign up with email/i }).click();
    await page.waitForURL("**/sign-up/email", { timeout: 20000 });
    await page.waitForTimeout(WAIT);

    check(
      "choosing email navigates rather than expanding in place",
      new URL(page.url()).pathname === "/sign-up/email",
      page.url(),
    );
    check(
      "no provider rows are stranded beneath the form",
      (await page.getByRole("button", { name: /continue with (google|apple)/i }).count()) === 0,
    );
    check(
      "there is a way back to the options page",
      (await page.locator('button[aria-label="Back"]').count()) >= 1,
    );

    let text = await page.evaluate(() => document.body.innerText);
    check('step 1 is "Your account"', text.includes("Step 1 of 2: Your account"));

    /* Step 1 filled only so Next shows step 2. Nothing is ever submitted. */
    await fillHydrated(page, "#firstName", "Ada");
    await fillHydrated(page, "#surname", "Obi");
    await fillHydrated(page, "#email", "nobody@example.invalid");
    await fillHydrated(page, "#password", "Str0ng-pass-phrase!");
    await fillHydrated(page, "#confirmPassword", "Str0ng-pass-phrase!");
    await page.getByRole("button", { name: /^Next$/ }).click();
    await page.waitForTimeout(WAIT);

    text = await page.evaluate(() => document.body.innerText);
    check('step 2 is "A little about you"', text.includes("Step 2 of 2: A little about you"));
    check("the country is fixed to Nigeria", text.includes("Nigeria"));
    await pickers(page, { postsCodes: true });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`no horizontal scroll at 390px (overflow ${overflow}px)`, overflow <= 1);

    console.log(`\n[${theme} 390px] /preview/session-b/sweep-settings?v=place (the /settings/place form)`);
    if (await openPreview(page, "/preview/session-b/sweep-settings?v=place", check, { base: BASE_URL, wait: WAIT })) {
      check("the place form renders", (await page.getByTestId("place-form").count()) === 1);
      await pickers(page, { postsCodes: false });
    }

    check("no route returned a server error", serverErrors.length === 0, serverErrors.join("\n"));
  } finally {
    await context.close();
  }
}

try {
  console.log("signed out");
  await expectSignInWall(check, "/settings/place", BASE_URL);
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
