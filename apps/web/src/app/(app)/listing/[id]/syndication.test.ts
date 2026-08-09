import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { listingMetadata, listingStructuredData } from "@/lib/listings/syndication";
import type { Listing } from "@/lib/listings/types";

/**
 * Surfaces two and three of four: the robots directive with the social card,
 * and the structured data block, both on the listing detail page.
 *
 * WHY THIS READS THE FILE RATHER THAN IMPORTING IT. `vitest.config.ts` aliases
 * `react` at its `react-server` entry, deliberately and for a good reason
 * stated in that file, and that entry publishes no `jsx-dev-runtime`, so no
 * `.tsx` module in this codebase can be imported by this suite at all. Undoing
 * that alias to reach one page would put every `cache`-wrapped server module
 * back in the blind spot it was just pulled out of.
 *
 * So the proof is in two halves that meet. `syndication.test.ts` proves what
 * the gate emits for an example listing, which is a noindex directive, a card
 * naming nothing, and no structured data node whatsoever. This file proves the
 * page asks the gate and decides nothing itself. Either half alone would be a
 * spec that passes while the page hand-rolls its own answer.
 */

const PAGE = readFileSync(
  fileURLToPath(new URL("./page.tsx", import.meta.url)),
  "utf8",
);

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

/** Comments discuss the rule at length. Only code is evidence of it. */
const CODE = PAGE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("the listing page delegates its metadata", () => {
  it("returns whatever the gate returns, and nothing of its own", () => {
    expect(CODE).toContain("return listingMetadata(listing, siteUrl())");
  });

  /**
   * The state this replaces: a literal `robots: { index: false, follow: false }`
   * sat in `generateMetadata` and applied to every listing on the platform.
   * That was the right blunt instrument while the whole catalogue was invented.
   * A second literal appearing here again would mean the page had stopped
   * asking and started deciding, and the two answers would drift.
   */
  it("writes no robots directive of its own", () => {
    expect(CODE).not.toMatch(/robots\s*:/);
  });
});

describe("the listing page emits structured data only through the gate", () => {
  it("renders the script from the gate's own serialiser", () => {
    expect(CODE).toContain("listingStructuredData(listing, siteUrl())");
    expect(CODE).toContain("structuredDataJson(structuredData)");
  });

  /**
   * The element is rendered behind the null check rather than beside it. An
   * example listing must produce no script element, not an empty one.
   */
  it("renders no script element at all when the gate says no", () => {
    expect(CODE).toContain("{structuredData && (");
    expect(CODE).not.toMatch(/"@context"|schema\.org/);
  });
});

describe("what those two produce for an example listing", () => {
  const example = listing({ isDemo: true });

  it("is a noindex page with no structured data and a card naming nothing", () => {
    expect(listingStructuredData(example, "https://rentme.ng")).toBeNull();

    const meta = listingMetadata(example, "https://rentme.ng");
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(JSON.stringify([meta.openGraph, meta.twitter])).not.toContain(example.title);
  });

  /**
   * The page must still RENDER for a person who navigates to it. Example
   * listings are meant to be browsable in-product: the rule is about machines.
   * `notFound()` is called only when the repository has no row, never on the
   * flag, and that is the line this holds.
   */
  it("still renders for a human, because the rule is about machines", () => {
    expect(CODE).toContain("if (!listing) notFound()");
    expect(CODE).not.toMatch(/isDemo[\s\S]{0,40}notFound/);
  });
});
