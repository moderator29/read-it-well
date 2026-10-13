import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { withoutComments } from "@/lib/copy/source-scan";
import { getDictionary } from "@vallo/i18n";
import { EXAMPLE_STATEMENT } from "@/lib/listings/syndication";

/**
 * UX-09 / UI-P2-01, AS AMENDED BY D24 (the founder, 6 October). The visible
 * example labelling is off the detail pages. What still holds, and is the
 * half that mattered: an example stay or restaurant offers no booking control
 * that checkout would refuse, and draws no trust it did not earn.
 */
const code = (p: string) => withoutComments(readFileSync(join(process.cwd(), "src", p), "utf8"));

describe("example stays and restaurants are labelled where they would be booked", () => {
  it("a stay reads is_demo from the accommodation and its business", () => {
    expect(code("app/(app)/stay/[id]/page.tsx")).toMatch(
      /const isExample = accommodation\.is_demo === true \|\| detail\.business\.is_demo === true;/,
    );
  });

  it("an example stay draws no label and no availability card, rooms or message button", () => {
    const view = code("app/(app)/stay/[id]/StayDetailView.tsx");
    expect(view).not.toMatch(/<ExampleNotice\b/);
    expect(view).not.toContain("t.examples.");
    expect(view).toMatch(/detail\.isExample \? \([\s\S]*?stay-not-bookable[\s\S]*?\) : \([\s\S]*?<StayDatesForm/);
    expect(view).toMatch(/detail\.isExample \? \([\s\S]*?rooms-example[\s\S]*?\) : detail\.roomTypes\.length > 0 \? \([\s\S]*?<RoomTypes/);
    /* The stay is messaged through its business now (track F); an example
       still draws no message control. */
    expect(view).toMatch(/messageVenue:\s*detail\.isExample \|\| !detail\.businessId\s*\?\s*null/);
  });

  it("an example restaurant draws no label and no table to hold, from either source", () => {
    const page = code("app/(app)/restaurant/[id]/page.tsx");
    expect(page).toMatch(/isExample: listingFace\.isDemo === true/);
    expect(page).toMatch(/isExample: detail!\.business\.is_demo === true/);
    expect(page).toMatch(/isExample=\{venue\.isExample\}/);
    const face = code("app/(app)/restaurant/[id]/RestaurantFace.tsx");
    expect(face).not.toMatch(/<ExampleNotice\b/);
    expect(face).not.toContain("t.examples.");
    expect(face).toMatch(/isExample \? \([\s\S]*?restaurant-not-bookable[\s\S]*?\) : \([\s\S]*?<ReserveTable/);
  });

  it("an example stay or restaurant draws no verified host and no rating", () => {
    const stay = code("app/(app)/stay/[id]/page.tsx");
    expect(stay).toMatch(/hostVerified:\s*!isExample &&/);
    expect(stay).toMatch(/rating:\s*!isExample &&/);
    const restaurant = code("app/(app)/restaurant/[id]/page.tsx");
    expect(restaurant).toMatch(/verified:\s*listingFace\.verified && listingFace\.isDemo !== true/);
    expect(restaurant).toMatch(/rating:\s*listingFace\.isDemo !== true &&/);
  });

  it("an unchecked host is not drawn with the verified mark's person-with-a-tick", () => {
    const src = code("components/app/listing/DetailAnatomy.tsx");
    /* The photo-less avatar is the plain person for everyone; the tick lives
       only in the verified branch of the title. */
    expect(src).toMatch(/nf-detail-avatar-glyph">\s*<UiIcon name="user" /);
    expect(src).not.toMatch(/"user-check"/);
    expect(src).toMatch(/host\.verified \? \(\s*<span className="nf-host-row__title">\s*<UiIcon name="verified"/);
  });
});

describe("the example words come from the dictionary", () => {
  it.each(["en", "ha", "ig", "yo"] as const)("%s has every example key, and English is the agreed sentence", (locale) => {
    const t = getDictionary(locale);
    for (const value of Object.values(t.examples)) expect(value.length).toBeGreaterThan(0);
    expect(getDictionary("en").examples.statement).toBe(EXAMPLE_STATEMENT);
  });
});
