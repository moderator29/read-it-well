import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { listingsForEmail } from "./listings";
import type {
  Listing,
  ListingRepository,
  ListingSearchFilter,
} from "../listings/types";

/**
 * Surface four of four: email.
 *
 * Email is the one surface with no corrective. A page can be edited, a sitemap
 * re-crawled, a social card re-scraped. A message saying a property is
 * available has landed in somebody's inbox and no such property exists.
 *
 * Two things are held here. The door refuses an example listing twice over,
 * including when the source it reads hands one back anyway. And nothing under
 * `lib/email` reaches the catalogue by any other route, which is the half that
 * keeps being true after somebody writes the digest that does not exist yet.
 */

function listing(over: Partial<Listing> = {}): Listing {
  return {
    id: "0d4b1f0a-1111-4222-8333-444455556666",
    slug: "two-bedroom-flat-in-yaba",
    title: "Two bedroom flat in Yaba",
    kind: "rental",
    area: "Yaba",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 220_000_000,
    currency: "NGN",
    bedrooms: 2,
    bathrooms: 1,
    rating: 0,
    reviewCount: 0,
    verified: false,
    isDemo: false,
    instantBook: false,
    amenities: [],
    photos: [],
    hue: 0,
    ...over,
  };
}

/** A source that obeys `excludeDemo`, which is what the real one does. */
function obedientRepository(rows: Listing[]): ListingRepository {
  return {
    isSeed: false,
    recommended: async () => rows,
    byId: async () => rows[0] ?? null,
    search: async (filter: ListingSearchFilter = {}) =>
      filter.excludeDemo ? rows.filter((row) => !row.isDemo) : rows,
  };
}

/** A source that ignores it, which is what a refactor accident looks like. */
function leakyRepository(rows: Listing[]): ListingRepository {
  return {
    isSeed: false,
    recommended: async () => rows,
    byId: async () => rows[0] ?? null,
    search: async () => rows,
  };
}

describe("the one door between the catalogue and an inbox", () => {
  it("passes real listings through", async () => {
    const rows = [listing({ id: "real-1" }), listing({ id: "real-2" })];
    const out = await listingsForEmail({}, {}, obedientRepository(rows));
    expect(out.map((row) => row.id)).toEqual(["real-1", "real-2"]);
  });

  it("asks the database to leave the example listings behind", async () => {
    const rows = [listing({ id: "real-1" }), listing({ id: "example-1", isDemo: true })];
    const out = await listingsForEmail({}, {}, obedientRepository(rows));
    expect(out.map((row) => row.id)).toEqual(["real-1"]);
  });

  /**
   * The braces, tested by removing the belt. The pushed-down predicate is one
   * line in one file, and the cost of it going missing is an advertisement for
   * a property that does not exist arriving in somebody's inbox.
   */
  it("refuses an example listing even when the source hands one back", async () => {
    const rows = [listing({ id: "real-1" }), listing({ id: "example-1", isDemo: true })];
    const out = await listingsForEmail({}, {}, leakyRepository(rows));
    expect(out.map((row) => row.id)).toEqual(["real-1"]);
  });

  it("cannot be talked out of it by a caller's own filter", async () => {
    const rows = [listing({ id: "example-1", isDemo: true })];
    const out = await listingsForEmail(
      { excludeDemo: false },
      {},
      obedientRepository(rows),
    );
    expect(out).toEqual([]);
  });
});

/**
 * The rule that outlives this file's other tests.
 *
 * Every live send site today hangs off a booking, an escrow movement, a wallet
 * row or a support ticket, and the database refuses a booking against an
 * example listing, so email is covered transitively at the same chokepoint
 * that covers payment. That is a fact about what has been built, not a rule,
 * and it stops being true the first time somebody writes a saved-search alert
 * or a weekly digest. This is the rule.
 */
describe("no other route from the catalogue into email", () => {
  const DIR = fileURLToPath(new URL(".", import.meta.url));

  it("keeps the message catalogue away from the repository", () => {
    const offenders: string[] = [];

    for (const name of readdirSync(DIR)) {
      if (!name.endsWith(".ts") || name.endsWith(".test.ts")) continue;
      if (name === "listings.ts") continue;

      const source = readFileSync(`${DIR}${name}`, "utf8");
      if (/listings\/repository|getListingRepository/.test(source)) offenders.push(name);
    }

    expect(offenders).toEqual([]);
  });
});
