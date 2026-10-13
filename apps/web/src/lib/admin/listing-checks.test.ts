import { describe, expect, it } from "vitest";
import { submitRequirements, type SubmitSubject } from "@/lib/agent/listings-model";
import { CHECK_LABEL, qualityChecks, type ChecklistRow } from "./listing-checks";

/*
 * THE REVIEWER'S CHECKLIST AGREES WITH THE LISTER'S GATE.
 *
 * A listing reaches the desk only after `submitRequirements` passed it, so
 * every line of the admission checklist that judges the same fact must pass
 * too. The one line that may still fail is the reviewer's own contact scan.
 */

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

function row(over: Partial<ChecklistRow> = {}): ChecklistRow {
  return {
    title: "Bright 2 bedroom flat in Lekki Phase 1",
    description: words(45),
    property_type: "rental",
    listing_intent: "rent",
    rent_amount_minor: 1_800_000_00,
    rent_period: "year",
    rate_minor: 0,
    rate_period: null,
    sale_price_minor: null,
    tenure: null,
    area: "Lekki Phase 1",
    city: "Lagos",
    state_code: "LA",
    bedrooms: 2,
    bathrooms: 2,
    listing_photos: [0, 1, 2, 3].map((position) => ({ position })),
    listing_amenities: [{ amenity_id: "a" }],
    ...over,
  };
}

/** The same listing as the lister's gate reads it. */
function subject(r: ChecklistRow): SubmitSubject {
  return {
    title: r.title,
    description: r.description,
    propertyType: r.property_type as SubmitSubject["propertyType"],
    stateCode: r.state_code,
    city: r.city,
    area: r.area,
    intent: r.listing_intent as SubmitSubject["intent"],
    rentMinor: r.rent_amount_minor,
    rentPeriod: r.rent_period as SubmitSubject["rentPeriod"],
    rateMinor: r.rate_minor,
    ratePeriod: r.rate_period as SubmitSubject["ratePeriod"],
    salePriceMinor: r.sale_price_minor,
    tenure: r.tenure as SubmitSubject["tenure"],
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    unitShape: "flat",
    amenityCount: r.listing_amenities.length,
    photoCount: r.listing_photos.length,
    hasCover: r.listing_photos.some((p) => p.position === 0),
  };
}

const failing = (r: ChecklistRow) => qualityChecks(r).filter((c) => !c.pass).map((c) => c.label);

describe("a listing the lister's gate passed passes the reviewer's checklist", () => {
  it.each([
    ["a yearly let", row()],
    ["a sale with its title deed", row({ property_type: "home", listing_intent: "sale", sale_price_minor: 380_000_000_00, rent_amount_minor: null, tenure: "certificate_of_occupancy" })],
    ["a plot of land, which has no bathroom", row({ property_type: "land", bedrooms: 0, bathrooms: 0 })],
    ["a title in plain sentence case", row({ title: "Bright 2 bedroom flat in Lekki Phase 1" })],
  ])("%s", (_name, r) => {
    expect(submitRequirements(subject(r)).map((u) => u.field)).toEqual([]);
    expect(failing(r)).toEqual([]);
  });
});

describe("the lines that judge the gate's facts fail where the gate fails", () => {
  it("a short title", () => {
    expect(failing(row({ title: "Flat" }))).toEqual([CHECK_LABEL.titleLength]);
  });

  it("a place with no state", () => {
    expect(failing(row({ state_code: null }))).toEqual([CHECK_LABEL.place]);
  });

  it("thirty-nine words, counted the way the gate counts them", () => {
    /* Punctuation standing alone is not a word, to the gate or to this line. */
    const description = `${words(39)} , . !`;
    expect(failing(row({ description }))).toEqual([CHECK_LABEL.description]);
    expect(qualityChecks(row({ description })).find((c) => c.label === CHECK_LABEL.description)?.detail).toBe("39 words");
  });

  it("a flat with no bathroom, and two photos", () => {
    expect(failing(row({ bathrooms: 0 }))).toEqual([CHECK_LABEL.rooms]);
    expect(failing(row({ listing_photos: [0, 1].map((position) => ({ position })) }))).toEqual([CHECK_LABEL.photoCount]);
  });

  it("counts videos with the photos, as the gate does, and still wants a photo first", () => {
    const twoAndAVideo = row({ listing_photos: [0, 1].map((position) => ({ position })), listing_videos: [{}] });
    expect(failing(twoAndAVideo)).toEqual([]);
    expect(submitRequirements({ ...subject(twoAndAVideo), videoCount: 1 }).map((u) => u.field)).toEqual([]);
    const videosOnly = row({ listing_photos: [], listing_videos: [{}, {}, {}] });
    expect(failing(videosOnly)).toEqual([CHECK_LABEL.cover]);
    expect(submitRequirements({ ...subject(videosOnly), videoCount: 3 }).map((u) => u.field)).toEqual(["photos"]);
  });

  it("keeps the reviewer's own contact scan", () => {
    expect(failing(row({ description: `${words(45)} call 08031234567` }))).toEqual([CHECK_LABEL.clean]);
  });
});
