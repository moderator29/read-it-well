/**
 * The stays console: it exists, and it tells a stranger nothing.
 *
 * Self-contained Playwright script: no runner, no config. Run with the app
 * already served:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/admin-bookings.spec.mjs
 *
 * This screen is the only place on Vallo where a paid stay can be cancelled
 * and somebody's money returned, so the refusal matters more here than on any
 * other console surface. The sandbox carries no session, which makes it exactly
 * the visitor this test needs: /admin/bookings and a stay's own page must both
 * answer with the designed access screen, and neither may leak a booking
 * reference, a guest, a listing, an amount, or the existence of a refund
 * control. A 500 would be a leak of its own, so the status is checked too.
 *
 * The list and the detail page are checked separately on purpose. They are two
 * routes, and the deeper one is the one that carries the money.
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

/** The three honest headings the access screen can carry. */
const ACCESS_HEADINGS = [
  "The console is not open yet",
  "Staff sign in",
  "You do not have console access",
];

/**
 * Anything on this list appearing on a refused page would mean the refund desk
 * showed a stranger something it holds. The money words are in here because a
 * naira figure on a refused page is the worst of them.
 */
const LEAKS = [
  "Live and upcoming",
  "Already over",
  "Cancel this stay",
  "Cancel and refund",
  "Settled so far",
  "Already returned",
  "Total for the stay",
  "Refunds already decided",
  "Person arriving",
  "Booking reference, or part of a listing title",
  "rm-refund-",
  "rm-book-",
  "₦",
];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({
  colorScheme: "dark",
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

/** Load a route and assert the whole refusal contract against it. */
async function refuses(route) {
  console.log(`\n${route}`);
  const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);

  check("responds without a server error", (response?.status() ?? 500) < 500);

  const body = await page.locator("body").innerText();

  check(
    "the designed access screen renders",
    ACCESS_HEADINGS.some((heading) => body.includes(heading)),
  );

  const leaked = LEAKS.filter((phrase) => body.includes(phrase));
  check(
    `nothing about the stays desk leaks${leaked.length > 0 ? ` (found: ${leaked.join(", ")})` : ""}`,
    leaked.length === 0,
  );

  const inputs = await page.locator("input, textarea, select").count();
  const searchBoxes = await page.locator('input[name="q"]').count();
  check("no search field for a stranger to type a booking reference into", searchBoxes === 0);
  check("no form controls at all beyond the sign in the access screen offers", inputs <= 2);

  const horizontal = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  check("no sideways scroll at 390px", horizontal === false);
}

try {
  await refuses("/admin/bookings");

  // A plausible-looking uuid, so the route matches rather than 404s. The page
  // must refuse before it ever asks the database whether this stay exists.
  await refuses("/admin/bookings/8f14e45f-ceea-467a-9c1b-0b5f9c1e2d33");

  // Not a uuid at all. The same refusal, not a crash and not a different
  // screen that would tell a stranger which ids are real.
  await refuses("/admin/bookings/not-a-real-booking");
} finally {
  await browser.close();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
