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
 * other console surface. Since 23 September a signed-out visitor is sent to
 * the sign-in door before the console runs at all (`src/proxy.ts`), so:
 *
 *   signed out   each address answers the 307 to `/sign-in?next=...`, and the
 *                page the browser lands on leaks no booking reference, guest,
 *                listing, amount or refund control;
 *   signed in    as the QA member (an ordinary member, not staff), both routes
 *                answer with the designed access screen and the same no-leak
 *                contract. Needs QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD; SKIP
 *                without them.
 *
 * A 500 would be a leak of its own, so the status is checked too.
 *
 * The list and the detail page are checked separately on purpose. They are two
 * routes, and the deeper one is the one that carries the money.
 */

import { chromium } from "playwright-core";
import { expectSignInWall, onSignInDoor, qaContext, signedOutContext, signInAsQa } from "./_gate.mjs";

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
const VIEW = { colorScheme: "dark", viewport: { width: 390, height: 844 } };

/** Load a route and assert the whole refusal contract against it. */
async function refuses(page, route, { member }) {
  console.log(`\n${route}${member ? " (signed in, not staff)" : " (signed out)"}`);
  if (!member) await expectSignInWall(check, route);
  const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);

  check("responds without a server error", (response?.status() ?? 500) < 500);

  const body = await page.locator("body").innerText();

  if (member) {
    check(
      "the designed access screen renders",
      ACCESS_HEADINGS.some((heading) => body.includes(heading)),
    );
  } else {
    check("the browser lands on the sign-in door", onSignInDoor(page));
  }

  const leaked = LEAKS.filter((phrase) => body.includes(phrase));
  check(
    `nothing about the stays desk leaks${leaked.length > 0 ? ` (found: ${leaked.join(", ")})` : ""}`,
    leaked.length === 0,
  );

  /* The sign-in door carries its own hidden fields (the action id, next,
     mode) beside the one email box; the access screen carries none. */
  const inputs = await page.locator(member ? "input, textarea, select" : 'input:not([type="hidden"]), textarea, select').count();
  const searchBoxes = await page.locator('input[name="q"]').count();
  check("no search field for a stranger to type a booking reference into", searchBoxes === 0);
  check("no form controls at all beyond the sign in the page offers", inputs <= 2);

  const horizontal = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  check("no sideways scroll at 390px", horizontal === false);
}

/* A plausible-looking uuid, so the route matches rather than 404s, and a
   non-uuid, which must get the same refusal rather than a different screen
   that would tell a stranger which ids are real. */
const ROUTES = [
  "/admin/bookings",
  "/admin/bookings/8f14e45f-ceea-467a-9c1b-0b5f9c1e2d33",
  "/admin/bookings/not-a-real-booking",
];

try {
  const out = await signedOutContext(browser, VIEW);
  const page = await out.newPage();
  for (const route of ROUTES) await refuses(page, route, { member: false });
  await out.close();

  console.log("\nsigned in as the QA member");
  const state = await signInAsQa(browser);
  if (state) {
    const qa = await qaContext(browser, state, VIEW);
    const qp = await qa.newPage();
    for (const route of ROUTES) await refuses(qp, route, { member: true });
    await qa.close();
  }
} finally {
  await browser.close();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
