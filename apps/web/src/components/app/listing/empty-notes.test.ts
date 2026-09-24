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
  it("an example asks to be told when real homes arrive, not to browse more examples", () => {
    for (const file of ["app/(app)/listing/[id]/page.tsx", "app/(app)/rent/move-in/[listingId]/page.tsx"]) {
      const text = src(file);
      expect(text, file).not.toMatch(/>\s*Browse real listings\s*</);
      expect(text, file).not.toContain('label: "Browse real listings"');
      expect(text, file).toContain("Get told when real homes arrive");
    }
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
