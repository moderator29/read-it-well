import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { withoutComments } from "@/lib/copy/source-scan";
import { getDictionary } from "@vallo/i18n";
import { EXAMPLE_STATEMENT } from "@/lib/listings/syndication";

/**
 * UX-09 / UI-P2-01: the shelf card says "Example"; one tap deeper, on the page
 * where a stay is booked or a table held, the example must still say so and
 * must not offer a booking control that checkout then refuses.
 */
const code = (p: string) => withoutComments(readFileSync(join(process.cwd(), "src", p), "utf8"));

describe("example stays and restaurants are labelled where they would be booked", () => {
  it("a stay reads is_demo from the accommodation and its business", () => {
    expect(code("app/(app)/stay/[id]/page.tsx")).toMatch(
      /isExample:\s*accommodation\.is_demo === true \|\| detail\.business\.is_demo === true/,
    );
  });

  it("an example stay draws the notice and no availability card, rooms or message button", () => {
    const view = code("app/(app)/stay/[id]/StayDetailView.tsx");
    expect(view).toMatch(/detail\.isExample && \(\s*<ExampleNotice variant="page"[^>]*statement=\{t\.examples\.statement\}/);
    expect(view).toMatch(/detail\.isExample \? \([\s\S]*?stay-not-bookable[\s\S]*?\) : \([\s\S]*?<DetailAvailabilityCard/);
    expect(view).toMatch(/detail\.isExample \? \([\s\S]*?rooms-example[\s\S]*?\) : detail\.roomTypes\.length > 0 \? \([\s\S]*?<RoomTypes/);
    /* The stay is messaged through its business now (track F); an example
       still draws no message control. */
    expect(view).toMatch(/messageVenue:\s*detail\.isExample \|\| !detail\.businessId\s*\?\s*null/);
  });

  it("an example restaurant draws the notice and no table to hold, from either source", () => {
    const page = code("app/(app)/restaurant/[id]/page.tsx");
    expect(page).toMatch(/isExample: listingFace\.isDemo === true/);
    expect(page).toMatch(/isExample: detail!\.business\.is_demo === true/);
    expect(page).toMatch(/isExample=\{venue\.isExample\}/);
    const face = code("app/(app)/restaurant/[id]/RestaurantFace.tsx");
    expect(face).toMatch(/isExample && <ExampleNotice variant="page"[^>]*statement=\{t\.examples\.statement\}/);
    expect(face).toMatch(/isExample \? \([\s\S]*?restaurant-not-bookable[\s\S]*?\) : \([\s\S]*?<ReserveTable/);
  });

  it("an unchecked host is not drawn with the verified mark's person-with-a-tick", () => {
    expect(code("components/app/listing/DetailAnatomy.tsx")).toMatch(
      /name=\{host\.verified \? "user-check" : "person-card"\}/,
    );
  });
});

describe("the example words come from the dictionary", () => {
  it.each(["en", "ha", "ig", "yo"] as const)("%s has every example key, and English is the agreed sentence", (locale) => {
    const t = getDictionary(locale);
    for (const value of Object.values(t.examples)) expect(value.length).toBeGreaterThan(0);
    expect(getDictionary("en").examples.statement).toBe(EXAMPLE_STATEMENT);
  });
});
