import { describe, expect, it } from "vitest";

import { namesAStreetAddress, publicListingTitle } from "./public-title";

describe("STORE-16: the title a listing travels under", () => {
  it("is built from structured fields only", () => {
    expect(publicListingTitle({ kind: "rental", bedrooms: 3, area: "Yaba", city: "Lagos" })).toBe(
      "3-bedroom rental in Yaba, Lagos",
    );
    expect(publicListingTitle({ kind: "land", bedrooms: 0, area: "Lekki", city: "Lagos" })).toBe("Plot in Lekki, Lagos");
    expect(publicListingTitle({ kind: "shop", bedrooms: 2, area: "Wuse", city: "Abuja" })).toBe("Shop in Wuse, Abuja");
    expect(publicListingTitle({ kind: "apartment", bedrooms: 1, area: "Abuja", city: "Abuja" })).toBe(
      "1-bedroom apartment in Abuja",
    );
  });
});

describe("STORE-16: a street address in a title is refused", () => {
  it.each([
    "Duplex at 3 Adeola Odeku Street",
    "Flat, 12B Admiralty Way, Lekki",
    "2 bed on 5 Chevron Drive",
    "Office at 14 Kofo Abayomi Road",
  ])("refuses %s", (title) => {
    expect(namesAStreetAddress(title)).toBe(true);
  });

  it.each([
    "Four bedroom detached house for sale on Chevron Drive",
    "3 bedroom flat in Yaba",
    "Spacious 2 bedroom apartment with parking",
    "Shop in a busy plaza",
  ])("lets %s through", (title) => {
    expect(namesAStreetAddress(title)).toBe(false);
  });
});

describe("STORE-16: the listing page shares the structured title", () => {
  it("hands the gallery's share sheet the public title, not the lister's", async () => {
    const { readFileSync } = await import("node:fs");
    const page = readFileSync("src/app/(app)/listing/[id]/page.tsx", "utf8");
    expect(page).toContain("shareTitle={publicListingTitle(listing)}");
    const gallery = readFileSync("src/components/app/listing/ListingGallery.tsx", "utf8");
    expect(gallery).toContain("title={shareTitle ?? title}");
  });
});
