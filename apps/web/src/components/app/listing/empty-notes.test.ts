import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * UX-21: four empty-state notes that were wrong. An example's call to action
 * no longer loops back to more examples; a tenancy's empty reviews speak of
 * tenants; the renter's inspections list is not written in inspector voice.
 */
const src = (p: string) => readFileSync(join(process.cwd(), "src", p), "utf8");

describe("empty states that say the right thing", () => {
  /* The move-in page's own wording is its owner's (D24 removes "real" there
     too); what this file holds for it is only that it never loops back. */
  it("an example never asks the reader to browse more examples", () => {
    for (const file of ["app/(app)/rent/move-in/[listingId]/page.tsx"]) {
      const text = src(file);
      expect(text, file).not.toMatch(/>\s*Browse real listings\s*</);
      expect(text, file).not.toContain('label: "Browse real listings"');
    }
  });

  /* D24 (6 October): the listing page no longer says "real", because it no
     longer says "example". Its one action is still the honest next step, the
     area's search where a saved search sends alerts, in the reader's copy. */
  it("a space that takes no requests leads to its area's search, unlabelled", () => {
    const text = src("app/(app)/listing/[id]/page.tsx");
    expect(text).not.toMatch(/>\s*Browse real listings\s*</);
    expect(text).toContain("sx.closed.action");
    expect(text).toContain("const realSoonHref = `/search?q=${encodeURIComponent(areaName)}`;");
  });

  it("a tenancy's empty reviews speak of tenants", () => {
    const reviews = src("components/app/listing/ListingReviews.tsx");
    expect(reviews).toContain("Tenants can review a place after they move in");
    expect(src("app/(app)/listing/[id]/page.tsx")).toContain("tenancy={isRental}");
  });

  it("the renter's inspections are described from the renter's side", () => {
    /* `/inspections` folded into Plans at `/bookings` (V-76); the renter's
       list is the board there, under the Plans header, with no inspector
       voice anywhere on the way. */
    for (const file of ["app/(app)/bookings/page.tsx", "components/app/plans/InspectionsBoard.tsx"]) {
      expect(src(file), file).not.toContain("Check the property, confirm details, submit your report.");
    }
  });
});
