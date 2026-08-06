/**
 * The review loop, from the outside.
 *
 * Self-contained Playwright script: no runner, no config. Run with the built
 * app already serving:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/reviews.spec.mjs
 *
 * What this proves, and what it deliberately does not.
 *
 * This sandbox has no route to the Supabase host by organisation proxy policy,
 * so nobody can be signed in here and no review can be written from a browser
 * in this environment. What a browser CAN prove is everything around the write:
 * that the review route exists and answers with a designed screen rather than a
 * crash or a 404, that every honest state carries a way onward, that the trips
 * deck no longer offers a control that cannot work, and that a listing with no
 * written reviews never claims to have any. It checks all of that in dark and
 * in light at 390px.
 *
 * The write itself, the RLS refusals behind it and the three triggers were
 * proven directly against live Postgres with real rows that were then removed:
 * a PENDING booking, a stay that has not checked out and a review pointed at
 * another listing are each refused 42501, a second review for the same booking
 * is refused 23505, a valid one is accepted and lands with its author label,
 * the host's notification and the safety classification of its body.
 *
 * Also proven there, and not provable from a browser: a review is final. There
 * is no UPDATE policy on public.reviews at all, so an author's direct PATCH to
 * /rest/v1/reviews changes zero rows and the body is untouched. The scan trigger
 * covers UPDATE as well as INSERT anyway, so if an update path is ever added
 * back the scanner is already there.
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

/* A well-formed uuid that belongs to nobody, and a string that is not a uuid
   at all. Both must land on a designed screen, never on an error. */
const ABSENT_BOOKING = "11111111-2222-4333-8444-555555555555";
const MALFORMED_BOOKING = "not-a-booking";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function run(theme) {
  const context = await browser.newContext({
    colorScheme: theme,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  /* A route that throws renders the root error boundary. Nothing in this walk
     may ever reach it. /_next/image is excluded deliberately: this sandbox has
     no outbound route to the photo CDN, so the image optimiser answers 500 for
     every remote photo here and does not on a real deploy. That is environment,
     not product (docs/DEPLOY.md section 7). */
  const seenErrorScreen = [];
  page.on("response", (r) => {
    if (r.status() >= 500 && !r.url().includes("/_next/image")) {
      seenErrorScreen.push(`${r.status()} ${r.url()}`);
    }
  });

  try {
    console.log(`\n[${theme}] /bookings/<absent>/review`);
    await page.goto(`${BASE_URL}/bookings/${ABSENT_BOOKING}/review`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const absentText = await page.locator("body").innerText();
    check(
      "the review route answers with a designed state, not a crash",
      /Reviews switch on shortly|Sign in to review your stay|We could not find that stay|Reviews are unavailable for a moment/.test(
        absentText,
      ),
    );
    check(
      "the page is titled for the job it does",
      absentText.includes("Review your stay"),
    );
    check(
      "the state offers a way onward",
      (await page.locator("a[href='/bookings'], a[href='/sign-in'], a[href='/search']").count()) >
        0,
    );
    check(
      "there is a back control following real history",
      (await page.locator("header button, header a").count()) > 0,
    );
    check("no written review is invented on an empty state", !/out of 5,/.test(absentText));

    console.log(`[${theme}] /bookings/<malformed>/review`);
    await page.goto(`${BASE_URL}/bookings/${MALFORMED_BOOKING}/review`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    const malformedText = await page.locator("body").innerText();
    check(
      "a malformed booking id is a designed screen too",
      /We could not find that stay|Reviews switch on shortly|Sign in to review your stay/.test(
        malformedText,
      ),
    );

    console.log(`[${theme}] /bookings`);
    await page.goto(`${BASE_URL}/bookings`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    const bookingsText = await page.locator("body").innerText();

    /* The dead end this item closes: the signed-out deck used to offer
       "Leave a review" on a past stay, linking to the listing, where there was
       nothing to review with. */
    const reviewControls = page.locator("a", { hasText: /^Leave a review$/ });
    const reviewControlCount = await reviewControls.count();
    check(
      "the signed-out trips deck offers no review control it cannot honour",
      reviewControlCount === 0,
    );
    check("the trips deck still renders", bookingsText.includes("Bookings"));

    /* Any review control that does exist must point at the review route, never
       at a listing page. */
    for (let i = 0; i < reviewControlCount; i += 1) {
      const href = await reviewControls.nth(i).getAttribute("href");
      check(
        `review control ${i + 1} points at the review route`,
        typeof href === "string" && /^\/bookings\/[^/]+\/review$/.test(href),
      );
    }

    console.log(`[${theme}] /listing/seed-2 reviews section`);
    await page.goto(`${BASE_URL}/listing/seed-2`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    const listingText = await page.locator("body").innerText();
    /* Needs a listing to exist, and the catalogue of twenty-three invented
       places was removed on purpose. See tests/_catalogue.mjs: a check that
       cannot run is not a check that failed. */
    if ((await page.locator('[data-testid="listing-gallery"]').count()) === 0) {
      console.log("  skip    catalogue is empty, so there is no listing to carry reviews");
      console.log("  note    run against a deployment with real inventory to exercise this");
      return;
    }
    check("the listing still renders its reviews section", listingText.includes("Reviews"));
    check(
      "a listing with no written reviews says so rather than inventing them",
      /No reviews yet|Written reviews from verified stays will appear here/.test(listingText),
    );

    check("no route in this walk returned a server error", seenErrorScreen.length === 0);
    if (seenErrorScreen.length > 0) console.log("   ", seenErrorScreen.join("\n    "));
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
