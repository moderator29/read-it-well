/**
 * Bookings loop walkthrough.
 *
 * Self-contained Playwright script: no runner, no config. It walks the three
 * booking surfaces at phone size in dark mode and exits non-zero on the first
 * broken expectation. Run with the dev server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/bookings.spec.mjs
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

function futureIso(daysFromNow) {
  const d = new Date(Date.now() + daysFromNow * 86_400_000);
  return d.toISOString().slice(0, 10);
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({
  colorScheme: "dark",
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

try {
  // ------------------------------------------------------------- /bookings
  console.log("/bookings");
  await page.goto(`${BASE_URL}/bookings`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);

  check("Upcoming tab renders", (await page.getByRole("tab", { name: "Upcoming" }).count()) > 0);
  check("Cancelled tab renders", (await page.getByRole("tab", { name: "Cancelled" }).count()) > 0);
  const bodyText = await page.locator("body").innerText();
  check(
    "at least one trip card renders",
    bodyText.includes("Confirmed") || bodyText.includes("Awaiting confirmation"),
  );
  check("how-booking-works strip renders", /how booking works/i.test(bodyText));

  // -------------------------------------------------- stay listing detail
  console.log("/listing/seed-2 (stay)");
  await page.goto(`${BASE_URL}/listing/seed-2`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);

  const panel = page.locator('#reserve [data-testid="reserve-panel"]');
  check("reserve panel renders", (await panel.count()) === 1);
  check("per-night price shows", (await panel.innerText()).includes("/ night"));

  await panel.locator('input[name="checkIn"]').fill(futureIso(30));
  await panel.locator('input[name="checkOut"]').fill(futureIso(32));
  await page.waitForTimeout(400);

  /* The panel leads with the total and keeps the breakdown one tap away, so the
     nightly line only exists once the breakdown is open. This spec used to read
     the nightly line straight off the closed panel, which stopped being true
     the day the total moved first. */
  const closedText = await panel.innerText();
  check("the total is what the panel leads with", /total/i.test(closedText));
  check("the per-night view is offered", closedText.includes("See per night"));

  await panel.getByText("See per night").click();
  await page.waitForTimeout(400);
  const panelText = await panel.innerText();
  check("price breakdown shows nights multiplied", /×\s*2 nights/.test(panelText));
  check("price breakdown shows a total", panelText.includes("Total"));
  check("no fee wording anywhere in the panel", !/fees?\b/i.test(panelText));
  check(
    "reserve button present",
    (await panel.getByRole("button", { name: "Reserve" }).count()) === 1,
  );

  // ------------------------------------------------ rental listing detail
  console.log("/rent, then the first rental's detail page");
  await page.goto(`${BASE_URL}/rent`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);

  const rentalHref = await page
    .locator('a[href^="/listing/"]')
    .first()
    .getAttribute("href");
  check("a rental links to a detail page", Boolean(rentalHref));

  if (rentalHref) {
    await page.goto(`${BASE_URL}${rentalHref}`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const rentalText = await page.locator("body").innerText();
    check("Message agent CTA renders", rentalText.includes("Message agent"));
    check(
      "safety disclaimer renders",
      rentalText.includes(
        "For your safety, keep every chat and payment inside RentMe. Deals made outside the platform are not protected by us. Pay only after you have inspected the property.",
      ),
    );
    check("no Reserve control on a rental", !rentalText.includes("Reserve"));
    check("per-year price shows", rentalText.includes("year"));
  }
} finally {
  await browser.close();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
