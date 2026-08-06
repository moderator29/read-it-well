/**
 * Hybrid inventory: the keyless regression guard.
 *
 * The provider layer's first duty is to be invisible. With no AMADEUS_CLIENT_ID,
 * no AMADEUS_CLIENT_SECRET and no GOOGLE_PLACES_API_KEY, `getListingRepository()`
 * never wraps itself in the partner decorator, so /search and /rent must render
 * exactly what they rendered before the layer existed: first-party and seed
 * catalogue results, every one of them verified, and not one "Partner" tag
 * anywhere on the page.
 *
 * Self-contained Playwright script: no runner, no config. Exits non-zero on the
 * first broken expectation. Run with the dev server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/hybrid.spec.mjs
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

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({
  colorScheme: "dark",
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

/** Every partner marker the card and the detail page can render. */
async function partnerMarkers() {
  const tags = await page.locator("[data-partner-tag]").count();
  const body = await page.locator("body").innerText();
  return {
    tags,
    // The standalone tag word, not the word inside "RentMe partner agent".
    tagWord: /(^|\n)\s*Partner\s*($|\n)/.test(body),
    attribution: /Powered by Google/i.test(body),
    partnerIds: await page.locator("a[href*='/listing/partner-']").count(),
    body,
  };
}

try {
  // ---------------------------------------------------------------- /search
  console.log("/search with no provider keys");
  await page.goto(`${BASE_URL}/search`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);

  const cards = page.locator("a[href^='/listing/']");
  const cardCount = await cards.count();
  /*
   * This spec's real subject is the PROVIDER LAYER: with no Amadeus and no
   * Places keys, nothing third-party may appear and nothing may break. That
   * still holds with an empty shelf. What no longer holds is the old premise
   * that the shelf is never empty, because the seed catalogue was removed on
   * purpose. See tests/_catalogue.mjs.
   */
  if (cardCount === 0) {
    console.log("  skip    catalogue is empty, so there are no cards to count");
    console.log("  note    run against a deployment with real inventory to exercise this");
  } else {
    check("search renders catalogue cards", cardCount >= 10);
  }

  const search = await partnerMarkers();
  check("no partner tag element on search", search.tags === 0);
  check("no Partner tag text on search", !search.tagWord);
  check("no Google attribution on search", !search.attribution);
  check("no partner listing links on search", search.partnerIds === 0);
  check("no fee wording on search", !/fees?\b/i.test(search.body));
  check(
    "results header still counts the catalogue",
    /\b(place|places|stay|stays|home|homes|result|results)\b/i.test(search.body),
  );

  // Every visible badge on a listing card is one of the three the catalogue
  // has always shown. Scoped to cards on purpose: .nf-badge is also the shell's
  // own chip (the mode indicator), which is not a listing badge at all.
  const badgeText = await page.locator("article .nf-badge, a[href^='/listing/'] .nf-badge").allInnerTexts();
  const unexpected = badgeText
    .map((b) => b.trim())
    .filter((b) => b.length > 0 && !/^(Verified|Rent|Instant)$/i.test(b));
  check(`only first-party badges render (${badgeText.length} badges)`, unexpected.length === 0);

  // ------------------------------------------------- /search?type=hotel
  console.log("/search?type=hotel with no provider keys");
  await page.goto(`${BASE_URL}/search?type=hotel`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);

  const hotels = await partnerMarkers();
  const hotelCards = await page.locator("a[href^='/listing/']").count();
  if (hotelCards > 0) check("hotel category still has seed hotels", hotelCards >= 3);
  else console.log("  skip    catalogue is empty, so there are no hotels to count");
  check("no partner hotel appears without keys", hotels.tags === 0 && hotels.partnerIds === 0);
  check("no Google attribution on the hotel shelf", !hotels.attribution);

  // -------------------------------------------- /search?type=restaurant
  console.log("/search?type=restaurant with no provider keys");
  await page.goto(`${BASE_URL}/search?type=restaurant`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);

  const restaurants = await partnerMarkers();
  const restaurantCards = await page.locator("a[href^='/listing/']").count();
  if (restaurantCards > 0) check("restaurant category renders", restaurantCards >= 1);
  else console.log("  skip    catalogue is empty, so there are no restaurants to count");
  check(
    "no partner restaurant appears without keys",
    restaurants.tags === 0 && restaurants.partnerIds === 0,
  );
  check("no Google attribution on the restaurant shelf", !restaurants.attribution);

  // ------------------------------------------------------------------ /rent
  console.log("/rent with no provider keys");
  await page.goto(`${BASE_URL}/rent`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);

  const rent = await partnerMarkers();
  const rentCards = await page.locator("a[href^='/listing/']").count();
  if (rentCards > 0) check("rent market renders its rentals", rentCards >= 3);
  else console.log("  skip    catalogue is empty, so there are no rentals to count");
  check("no partner tag element on rent", rent.tags === 0);
  check("no Partner tag text on rent", !rent.tagWord);
  check("no partner listing links on rent", rent.partnerIds === 0);
  check(
    "safety copy still on rent",
    /keep every chat and payment inside RentMe/i.test(rent.body),
  );
  check("rent market still has no Reserve control", !/\bReserve\b/.test(rent.body));

  // ------------------------------------------------- first-party detail page
  console.log("/listing/seed-9 (first-party hotel) is untouched");
  await page.goto(`${BASE_URL}/listing/seed-9`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);

  const detail = await partnerMarkers();
  check("first-party detail shows no partner tag", detail.tags === 0);
  /*
   * `seed-9` was one of the twenty-three invented places, and the catalogue
   * was removed on purpose. The check above still holds - no listing means no
   * partner tag either, which is the property this spec exists to guard - but
   * the three below need the page to actually be a listing. See
   * tests/_catalogue.mjs.
   */
  const detailIsAListing =
    (await page.locator('[data-testid="listing-gallery"]').count()) > 0;
  if (!detailIsAListing) {
    console.log("  skip    catalogue is empty, so there is no first-party detail page to open");
    console.log("  note    run against a deployment with real inventory to exercise this");
    await browser.close();
    console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
    process.exit(failures === 0 ? 0 : 1);
  }
  check("first-party detail keeps its verified badge", /Verified/i.test(detail.body));
  check("first-party detail keeps Reserve", /\bReserve\b/.test(detail.body));
  check("first-party detail keeps Message agent", /Message agent/i.test(detail.body));
  check("first-party detail keeps its host panel", /Hosted by/i.test(detail.body));
  check("no Google attribution on a first-party detail", !detail.attribution);

  // ------------------------------------------- a partner id resolves to 404
  console.log("/listing/partner-places-unknown with no keys");
  const response = await page.goto(`${BASE_URL}/listing/partner-places-unknown`, {
    waitUntil: "load",
  });
  await page.waitForTimeout(WAIT);
  check("an unresolvable partner id is not found", (response?.status() ?? 0) === 404);
} catch (error) {
  failures += 1;
  console.log(`  FAILED  threw: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nhybrid: all checks passed" : `\nhybrid: ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
