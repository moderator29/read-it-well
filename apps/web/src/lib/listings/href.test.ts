import { describe, expect, it } from "vitest";
import { hrefForListing, isStayKind } from "./href";
import type { ListingKind } from "./types";

/**
 * The side law, as arithmetic.
 *
 * R2 finding 1 was a Stays object opening in the Property shell because the
 * destination came from a prop nobody passed rather than from the listing's
 * own kind. These cases are the law itself: every kind the catalogue can hold
 * is named, so adding a kind to `ListingKind` without deciding which shell it
 * belongs in fails here rather than on the busiest surface in the product.
 */

const EVERY_KIND: ListingKind[] = [
  "hotel",
  "apartment",
  "home",
  "shortlet",
  "villa",
  "restaurant",
  "experience",
  "rental",
  "shop",
  "office",
  "land",
];

describe("hrefForListing", () => {
  it("sends the four nightly kinds to the Stays shell", () => {
    expect(hrefForListing("hotel", "a")).toBe("/stay/a");
    expect(hrefForListing("shortlet", "b")).toBe("/stay/b");
    expect(hrefForListing("villa", "c")).toBe("/stay/c");
    expect(hrefForListing("apartment", "d")).toBe("/stay/d");
  });

  it("sends a restaurant to its own shell, because a table is booked rather than slept in", () => {
    expect(hrefForListing("restaurant", "e")).toBe("/restaurant/e");
  });

  it("keeps the tenancy and sale kinds in the Property shell", () => {
    expect(hrefForListing("home", "f")).toBe("/listing/f");
    expect(hrefForListing("rental", "g")).toBe("/listing/g");
    expect(hrefForListing("land", "h")).toBe("/listing/h");
    expect(hrefForListing("shop", "i")).toBe("/listing/i");
    expect(hrefForListing("office", "j")).toBe("/listing/j");
    expect(hrefForListing("experience", "k")).toBe("/listing/k");
  });

  /*
   * The four Stays kinds are exactly the ones `/search`'s category rail
   * offers as Shortlets, Apartments, Villas and Hotels, which is how the bug
   * reached the busiest surface: four of nine markets opened on the wrong
   * side.
   */
  it("classifies every kind the catalogue holds, and sends it somewhere real", () => {
    for (const kind of EVERY_KIND) {
      const href = hrefForListing(kind, "x");
      expect(href).toMatch(/^\/(stay|restaurant|listing)\/x$/);
      expect(href.startsWith("/stay/")).toBe(isStayKind(kind));
    }
  });

  it("never invents a path segment out of the id", () => {
    expect(hrefForListing("home", "00000000-0000-4000-8000-000000000001")).toBe(
      "/listing/00000000-0000-4000-8000-000000000001",
    );
  });
});
