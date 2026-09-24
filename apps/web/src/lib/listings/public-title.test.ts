import { describe, expect, it } from "vitest";

import { looksLikeStreetAddress, publicListingTitle } from "./public-title";

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

describe("STORE-16: a title that looks like a street address gets a warning", () => {
  it.each([
    "Duplex at 3 Adeola Odeku Street",
    "Flat, 12B Admiralty Way, Lekki",
    "2 bed on 5 Chevron Drive",
    "Office at 14 Kofo Abayomi Road",
    "Shop, 7 Allen Avenue",
  ])("warns on %s", (title) => {
    expect(looksLikeStreetAddress(title)).toBe(true);
  });

  it.each([
    "Four bedroom detached house for sale on Chevron Drive",
    "3 bedroom flat in Yaba",
    "Spacious 2 bedroom apartment with parking",
    "Shop in a busy plaza",
    "3 bedroom flat close to the market",
    "4 bedroom duplex in gated estate",
    "2 bedroom flat with tennis court",
    "3 bedroom flat off Admiralty Way",
    "Mini flat, 5 minutes to Herbert Macaulay Way",
    "Lekki Phase 1 Estate",
    "Plot 12 Estate",
    "Block 5 flat",
    "5 bedroom detached house in Banana Island",
    "3 bedroom flat on Ajose Adeogun Street",
  ])("says nothing about %s", (title) => {
    expect(looksLikeStreetAddress(title)).toBe(false);
  });
});

describe("STORE-16: never a refusal", () => {
  it("the draft schema and the submit gate accept a title that looks like an address", async () => {
    const { draftInputSchema, submitRequirements } = await import("@/lib/agent/listings-schema");
    const title = "Duplex at 3 Adeola Odeku Street";
    expect(draftInputSchema.safeParse({ title }).success).toBe(true);
    const unmet = submitRequirements({ title } as Parameters<typeof submitRequirements>[0]);
    expect(unmet.find((item) => item.field === "title")).toBeUndefined();
  });

  it("the wizard shows the warning under the title", async () => {
    const { readFileSync } = await import("node:fs");
    const wizard = readFileSync("src/app/agent/list/ListingWizard.tsx", "utf8");
    expect(wizard).toContain("looksLikeStreetAddress(values.title) ? STREET_IN_TITLE_WARNING");
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
