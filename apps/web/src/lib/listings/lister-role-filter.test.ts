import { describe, expect, it } from "vitest";
import { LISTING_ROLES, LISTING_ROLE_FILTER_LABEL } from "@/lib/supply/roles";
import { matchesFacts } from "./filter";
import type { ListingFacts } from "./filter";
import {
  activeFilterCount,
  clearedFilters,
  parseDiscoveryQuery,
  toFilter,
  toSearchHref,
} from "./search-params";

/**
 * FILTERING BY WHO IS OFFERING IT, WHICH NOBODY COULD DO UNTIL NOW.
 *
 * `listings.listing_role` shipped in Track G. `LISTING_ROLE_FILTER_LABEL`
 * shipped beside it, named for a drawer, and had ZERO consumers anywhere in
 * the tree. `listings_role_published_idx` was built for the read. The one
 * missing piece was the question: `ListingSearchFilter` had no role field, so
 * no reader could ask it and no surface could offer it.
 *
 * The supply kind is the point of the two-sided platform. An owner-direct
 * renter and a renter happy to go through a firm are two different shoppers
 * and the catalogue could not tell them apart.
 */

function facts(over: Partial<ListingFacts> = {}): ListingFacts {
  return {
    kind: "apartment",
    priceMinor: 100_000_000,
    bedrooms: 3,
    bathrooms: 2,
    amenities: [],
    instantBook: false,
    verified: false,
    isDemo: false,
    ...over,
  } as ListingFacts;
}

describe("the label that had no consumer now has one", () => {
  it("offers a label for every role, and the filter takes every role", () => {
    for (const role of LISTING_ROLES) {
      expect(LISTING_ROLE_FILTER_LABEL[role]).toBeTruthy();
      expect(matchesFacts(facts({ listerRole: role }), { listerRoles: [role] })).toBe(true);
    }
  });
});

describe("the matcher, and what it does about silence", () => {
  it("matches any of the kinds asked for, not all of them", () => {
    /* OR, like water: one column, one value. As an AND it would match
       nothing, every time, which is not a filter but a trap. */
    const f = { listerRoles: ["owner", "firm"] as const };
    expect(matchesFacts(facts({ listerRole: "owner" }), { listerRoles: [...f.listerRoles] })).toBe(true);
    expect(matchesFacts(facts({ listerRole: "firm" }), { listerRoles: [...f.listerRoles] })).toBe(true);
    expect(matchesFacts(facts({ listerRole: "agent" }), { listerRoles: [...f.listerRoles] })).toBe(false);
  });

  it("excludes a listing that never declared one, which is the strict half", () => {
    expect(matchesFacts(facts(), { listerRoles: ["owner"] })).toBe(false);
  });

  it("excludes nothing when the reader did not ask", () => {
    expect(matchesFacts(facts(), {})).toBe(true);
    expect(matchesFacts(facts(), { listerRoles: [] })).toBe(true);
    expect(matchesFacts(facts({ listerRole: "agent" }), {})).toBe(true);
  });
});

describe("the address bar contract", () => {
  it("reads the three kinds and drops rubbish and duplicates", () => {
    expect(parseDiscoveryQuery({ by: "owner,firm" }).listerRoles).toEqual(["owner", "firm"]);
    expect(parseDiscoveryQuery({ by: "OWNER, agent " }).listerRoles).toEqual(["owner", "agent"]);
    expect(parseDiscoveryQuery({ by: "owner,owner" }).listerRoles).toEqual(["owner"]);
    expect(parseDiscoveryQuery({ by: "landlord,nonsense" }).listerRoles).toEqual([]);
    expect(parseDiscoveryQuery({}).listerRoles).toEqual([]);
  });

  it("writes them back in a fixed order, so two equal searches share a URL", () => {
    /* Otherwise the history fills with entries that differ only in the order
       somebody happened to tick three boxes in. */
    const one = parseDiscoveryQuery({ by: "firm,owner" });
    const two = parseDiscoveryQuery({ by: "owner,firm" });
    expect(toSearchHref(one)).toBe(toSearchHref(two));
    expect(toSearchHref(one)).toContain("by=owner%2Cfirm");
  });

  it("survives a round trip through the address bar", () => {
    const url = toSearchHref(parseDiscoveryQuery({ by: "agent,owner", beds: "2" }));
    const back = parseDiscoveryQuery(
      Object.fromEntries(new URLSearchParams(url.split("?")[1] ?? "")),
    );
    expect(back.listerRoles).toEqual(["owner", "agent"]);
    expect(back.bedrooms).toBe(2);
  });

  it("puts nothing in the URL when nothing was asked", () => {
    expect(toSearchHref(parseDiscoveryQuery({}))).not.toContain("by=");
  });
});

describe("the repository question, the badge and the clear", () => {
  it("reaches the filter only when it was asked for", () => {
    expect(toFilter(parseDiscoveryQuery({ by: "firm" })).listerRoles).toEqual(["firm"]);
    expect(toFilter(parseDiscoveryQuery({})).listerRoles).toBeUndefined();
    expect(toFilter(parseDiscoveryQuery({ by: "rubbish" })).listerRoles).toBeUndefined();
  });

  it("counts once however many kinds are ticked", () => {
    expect(activeFilterCount(parseDiscoveryQuery({ by: "owner" }))).toBe(1);
    expect(activeFilterCount(parseDiscoveryQuery({ by: "owner,agent,firm" }))).toBe(1);
    expect(activeFilterCount(parseDiscoveryQuery({}))).toBe(0);
  });

  it("is cleared by Clear all, and the text and category survive it", () => {
    const cleared = clearedFilters(parseDiscoveryQuery({ by: "owner", q: "yaba", type: "rental" }));
    expect(cleared.listerRoles).toEqual([]);
    expect(cleared.q).toBe("yaba");
    expect(cleared.kind).toBe("rental");
  });
});
