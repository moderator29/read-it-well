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
 * WHAT CHANGED ON 23 SEPTEMBER. Every one of these routes now answers a
 * signed-out visitor with the sign-in wall (asserted first), so the signed-out
 * "designed states" this used to read are gone for a stranger. The trips deck
 * is read in the preview harness (`/preview/f3/bookings`, the real TripSpine
 * with fixture stays, titled "Plans" now), and the review route's designed
 * states and the real deck are read signed in as the QA member (SKIP without
 * QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD).
 *
 * Also proven there, and not provable from a browser: a review is final. There
 * is no UPDATE policy on public.reviews at all, so an author's direct PATCH to
 * /rest/v1/reviews changes zero rows and the body is untouched. The scan trigger
 * covers UPDATE as well as INSERT anyway, so if an update path is ever added
 * back the scanner is already there.
 */

import { chromium } from "playwright-core";
import { expectSignInWall, openPreview, qaContext, signInAsQa, skip } from "./_gate.mjs";

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

/** The deck's review controls: none that cannot work, and any that exists points at the review route. */
async function deckReviewControls(page) {
  const reviewControls = page.locator("a", { hasText: /^Leave a review$/ });
  const count = await reviewControls.count();
  for (let i = 0; i < count; i += 1) {
    const href = await reviewControls.nth(i).getAttribute("href");
    check(
      `review control ${i + 1} points at the review route, never at a listing`,
      typeof href === "string" && /^\/bookings\/[^/]+\/review$/.test(href),
    );
  }
  return count;
}

async function run(theme, state) {
  const options = { colorScheme: theme, viewport: { width: 390, height: 844 } };
  const seenErrorScreen = [];
  const watch = (page) =>
    /* /_next/image is excluded deliberately: this sandbox has no outbound route
       to the photo CDN (docs/DEPLOY.md section 7). */
    page.on("response", (r) => {
      if (r.status() >= 500 && !r.url().includes("/_next/image")) seenErrorScreen.push(`${r.status()} ${r.url()}`);
    });

  /* ---------------------------------------------- the deck (preview) */
  {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    watch(page);
    try {
      console.log(`\n[${theme}] /preview/f3/bookings (the trips deck)`);
      if (await openPreview(page, "/preview/f3/bookings", check, { base: BASE_URL, wait: WAIT })) {
        const text = await page.locator("body").innerText();
        check("the trips deck renders, titled Plans", text.includes("Plans"));
        await deckReviewControls(page);
      }
    } finally {
      await context.close();
    }
  }

  /* -------------------------------------- the real routes (QA member) */
  if (state) {
    const context = await qaContext(browser, state, options);
    const page = await context.newPage();
    watch(page);
    try {
      console.log(`[${theme}] /bookings/<absent>/review (signed in)`);
      await page.goto(`${BASE_URL}/bookings/${ABSENT_BOOKING}/review`, { waitUntil: "load" });
      await page.waitForTimeout(WAIT);
      const absentText = await page.locator("body").innerText();
      check(
        "the review route answers with a designed state, not a crash",
        /We cannot reach reviews right now|We could not find that stay|Reviews are unavailable for a moment/.test(absentText),
      );
      check("the page is titled for the job it does", absentText.includes("Review your stay"));
      check(
        "the state offers a way onward",
        (await page.locator("a[href='/bookings'], a[href='/search']").count()) > 0,
      );
      check("there is a back control following real history", (await page.locator("header button, header a").count()) > 0);
      check("no written review is invented on an empty state", !/out of 5,/.test(absentText));

      console.log(`[${theme}] /bookings/<malformed>/review (signed in)`);
      await page.goto(`${BASE_URL}/bookings/${MALFORMED_BOOKING}/review`, { waitUntil: "load" });
      await page.waitForTimeout(WAIT);
      check(
        "a malformed booking id is a designed screen too",
        /We could not find that stay|We cannot reach reviews right now/.test(await page.locator("body").innerText()),
      );

      console.log(`[${theme}] /bookings (signed in)`);
      await page.goto(`${BASE_URL}/bookings`, { waitUntil: "load" });
      await page.waitForTimeout(WAIT);
      check("the trips deck renders, titled Plans", (await page.locator("body").innerText()).includes("Plans"));
      await deckReviewControls(page);

      console.log(`[${theme}] /listing/seed-2 reviews section (signed in)`);
      await page.goto(`${BASE_URL}/listing/seed-2`, { waitUntil: "load" });
      await page.waitForTimeout(WAIT);
      /* Needs a listing to exist (tests/_catalogue.mjs): a check that cannot
         run is not a check that failed, and it is said out loud. */
      if ((await page.locator('[data-testid="listing-gallery"]').count()) === 0) {
        skip("no listing behind /listing/seed-2, so there is no reviews section to read");
      } else {
        const listingText = await page.locator("body").innerText();
        check("the listing still renders its reviews section", listingText.includes("Reviews"));
        check(
          "a listing with no written reviews says so rather than inventing them",
          /No reviews yet|Written reviews from verified stays will appear here/.test(listingText),
        );
      }
    } finally {
      await context.close();
    }
  }

  check("no route in this walk returned a server error", seenErrorScreen.length === 0);
  if (seenErrorScreen.length > 0) console.log("   ", seenErrorScreen.join("\n    "));
}

try {
  console.log("signed out");
  for (const path of [
    `/bookings/${ABSENT_BOOKING}/review`,
    `/bookings/${MALFORMED_BOOKING}/review`,
    "/bookings",
    "/listing/seed-2",
  ]) {
    await expectSignInWall(check, path, BASE_URL);
  }
  console.log("\nsigned in as the QA member, for the real routes");
  const state = await signInAsQa(browser, { base: BASE_URL });
  await run("dark", state);
  await run("light", state);
} finally {
  await browser.close();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
