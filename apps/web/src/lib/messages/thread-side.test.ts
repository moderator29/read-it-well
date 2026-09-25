import { describe, expect, it } from "vitest";
import { threadSide, type ThreadListingFacts } from "./thread-side";

const listing = (over: Partial<ThreadListingFacts>): ThreadListingFacts => ({
  property_type: "home",
  listing_intent: "rent",
  rent_period: "year",
  rate_period: null,
  rent_amount_minor: 120_000_000,
  rate_minor: null,
  ...over,
});

describe("which inbox side a thread belongs to", () => {
  it("a table, a night and a hotel or restaurant are Stays", () => {
    expect(threadSide("reservation", null)).toBe("stays");
    expect(threadSide("booking", null)).toBe("stays");
    expect(threadSide("business", null)).toBe("stays");
  });
  it("a let or a sale is Property", () => {
    expect(threadSide("listing", listing({}))).toBe("property");
    expect(threadSide("listing", listing({ listing_intent: "sale", rent_period: null }))).toBe("property");
  });
  it("a nightly listing or a restaurant listing is Stays", () => {
    expect(threadSide("listing", listing({ property_type: "shortlet", rent_period: null, rate_period: "night", rent_amount_minor: null, rate_minor: 5_000_000 }))).toBe("stays");
    expect(threadSide("listing", listing({ property_type: "restaurant", rent_period: null, rate_period: "guest", rent_amount_minor: null, rate_minor: 1 }))).toBe("stays");
  });
  it("an unreadable listing, or none, is Property, where every old thread lived", () => {
    expect(threadSide("listing", null)).toBe("property");
    expect(threadSide(undefined, undefined)).toBe("property");
  });
});
