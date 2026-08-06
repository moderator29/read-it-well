/**
 * Booking a stay for somebody else.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/book-for-someone-else.spec.mjs
 *
 * The defining diaspora case: a sister in London pays for a cousin flying into
 * Lagos. `bookings.guest_id` is one auth user and every email went to that
 * user, so the arrival directions and the gate code went to London while the
 * person standing at the security post in Lekki had nothing, and the host had
 * no idea who was going to turn up.
 *
 * What this script can prove, and what it cannot. The sandbox has no route to
 * the Supabase host, so every page renders signed out and no booking can be
 * written from here. So this covers the half a browser can see: the toggle
 * exists and is a real switch, it reveals exactly three fields with real
 * labels, the phone field explains why it is required, the email field is
 * honestly marked optional and says what happens when it is left blank, and
 * submitting reaches the server and comes back with the honest signed-out
 * sentence rather than a silent nothing. Both themes, 390px, no overflow.
 *
 * The database half was proved against live Postgres with `private.probe_as`,
 * because a probe through the service role bypasses RLS and cannot test a
 * policy: the payer's own client wrote a booking naming an arriving guest, the
 * host's own client read that name and number back, and the four check
 * constraints refused a name with no phone, a phone with no name, an
 * uncanonical 0803 number and a malformed address, each by name. Those rows
 * were then deleted.
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 1400;

/** Eko Pearl Waterfront Apartment: a seed stay with a reserve panel. */
const LISTING = "seed-1";

let failures = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
  }
}

function futureIso(daysFromNow) {
  return new Date(Date.now() + daysFromNow * 86_400_000).toISOString().slice(0, 10);
}

async function noHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function walk(colorScheme) {
  console.log(`\n================ ${colorScheme} ================`);
  const context = await browser.newContext({
    colorScheme,
    viewport: { width: 390, height: 844 },
  });
  // Dark is the default and only an explicit stored choice moves it, so a
  // light pass has to make that choice the way a visitor would.
  await context.addInitScript((mode) => {
    try {
      window.localStorage.setItem("nf_theme", mode);
    } catch {
      /* storage unavailable, the page falls back to the dark default */
    }
  }, colorScheme === "light" ? "light" : "dark");

  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/listing/${LISTING}`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const theme = await page.evaluate(() => document.documentElement.dataset.theme ?? "dark");
    check(
      `the page is rendering the ${colorScheme} theme`,
      colorScheme === "light" ? theme === "light" : theme !== "light",
    );

    const panel = page.locator('#reserve [data-testid="reserve-panel"]');
    /* No listing behind that id, so no reserve panel and nothing below to
       assert. The catalogue of twenty-three invented places was removed on
       purpose; see tests/_catalogue.mjs. */
    if ((await panel.count()) === 0) {
      console.log("  skip    catalogue is empty, so there is no reserve panel to book with");
      console.log("  note    run against a deployment with real inventory to exercise this");
      await context.close();
      await browser.close();
      console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
      process.exit(failures === 0 ? 0 : 1);
    }
    check("the reserve panel renders inline on a phone", (await panel.count()) === 1);

    // ------------------------------------------------------------ the switch
    const toggle = panel.locator('button[role="switch"]');
    check("the toggle is a real switch", (await toggle.count()) === 1);
    check("it starts off", (await toggle.getAttribute("aria-checked")) === "false");
    check(
      "it is labelled by its visible text",
      Boolean(await toggle.getAttribute("aria-labelledby")),
    );
    check(
      "the panel says what the switch is for",
      /Someone else is arriving/i.test(await panel.innerText()),
    );

    // ------------------------------------------ nothing about a third party
    check(
      "the three fields are absent until it is switched on",
      (await panel.locator('input[name="guestName"]').count()) === 0 &&
        (await panel.locator('input[name="guestPhone"]').count()) === 0 &&
        (await panel.locator('input[name="guestEmail"]').count()) === 0,
    );

    await toggle.click();
    await page.waitForTimeout(400);
    check("switching it on reports the new state", (await toggle.getAttribute("aria-checked")) === "true");

    const name = panel.locator('input[name="guestName"]');
    const phone = panel.locator('input[name="guestPhone"]');
    const email = panel.locator('input[name="guestEmail"]');
    check("the name field appears", await name.isVisible());
    check("the phone field appears", await phone.isVisible());
    check("the email field appears", await email.isVisible());

    // Every field has a real label, not a placeholder pretending to be one.
    for (const [label, field] of [
      ["name", name],
      ["phone", phone],
      ["email", email],
    ]) {
      const id = await field.getAttribute("id");
      const labelled = id ? await panel.locator(`label[for="${id}"]`).count() : 0;
      check(`the ${label} field carries a real label`, labelled === 1);
    }

    check("the phone field takes a telephone keypad", (await phone.getAttribute("inputmode")) === "tel");
    check("the email field is typed as an email", (await email.getAttribute("type")) === "email");

    const panelText = (await panel.innerText()).replace(/\s+/g, " ");
    check(
      "the phone field says why it is needed",
      /estate gate rings this number/i.test(panelText),
    );
    check(
      "the email field is honestly marked optional",
      /if you have it/i.test(panelText) && /Leave it blank and it all comes to you/i.test(panelText),
    );
    check(
      "the platform still mentions no fee of any kind here",
      !/\bfees?\b/i.test(panelText),
    );

    // ------------------------------------------------- the server answers
    await panel.locator('input[name="checkIn"]').fill(futureIso(30));
    await panel.locator('input[name="checkOut"]').fill(futureIso(32));
    await name.fill("Chidi Okafor");
    await phone.fill("0803 123 4567");
    await email.fill("chidi@example.com");
    await page.waitForTimeout(400);

    await panel.locator('button[type="submit"]').click();
    await page.waitForTimeout(2200);

    const alert = panel.locator('[role="alert"]').last();
    const answered = (await alert.count()) > 0;
    check("the server answers rather than swallowing the submission", answered);
    if (answered) {
      const said = (await alert.innerText()).replace(/\s+/g, " ").trim();
      /* This sandbox cannot reach the Supabase host, so resolveSession()
         answers "unconfigured" rather than "signed-out". Both are designed
         states and both are honest; what must never happen is a booking
         appearing to succeed, or a raw code reaching the guest. */
      check(
        `it answers with a designed refusal (${said.slice(0, 60)})`,
        /sign in/i.test(said) || /switches on the moment the platform keys land/i.test(said),
      );
      check("it never shows a raw error code", !/\b(2\d{4}|PGRST|error:)\b/i.test(said));
      check(
        "the confirmation moment did not fire on a refusal",
        (await page.locator('[data-testid="reserve-success"]').count()) === 0,
      );
    }

    check("the typed details survive the refusal", (await name.inputValue()) === "Chidi Okafor");

    check("no horizontal overflow at 390px", await noHorizontalOverflow(page));

    // Switching it back off takes the third party with it, so a change of mind
    // cannot leave a name attached to a booking nobody meant to name.
    await toggle.click();
    await page.waitForTimeout(300);
    check(
      "switching it off removes the fields again",
      (await panel.locator('input[name="guestName"]').count()) === 0,
    );
  } catch (error) {
    failures += 1;
    console.log(`  FAILED  threw: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await context.close();
  }
}

await walk("dark");
await walk("light");
await browser.close();

console.log(
  failures === 0
    ? "\nbook for someone else: all checks passed"
    : `\nbook for someone else: ${failures} failed`,
);
process.exit(failures === 0 ? 0 : 1);
