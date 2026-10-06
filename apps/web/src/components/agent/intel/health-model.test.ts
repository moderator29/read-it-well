import { describe, expect, it } from "vitest";
import { MIN_DESCRIPTION_WORDS, MIN_PHOTOS, type SubmitSubject } from "@/lib/agent/listings-model";
import { HEALTH_ROWS, listingHealth, type HealthFacts } from "./health-model";

/**
 * Listing Health states only what the listing's own record says, and
 * recommends only what a rule the platform already enforces asks for.
 */

const NOW = Date.parse("2026-10-06T12:00:00Z");
const DAY = 86_400_000;
const words = (n: number) => Array.from({ length: n }, () => "room").join(" ");

const gate = (over: Partial<SubmitSubject> = {}): SubmitSubject => ({
  title: "Two bedroom flat in Yaba",
  description: words(MIN_DESCRIPTION_WORDS),
  propertyType: "apartment" as SubmitSubject["propertyType"],
  stateCode: "LA",
  city: "Lagos",
  area: "Yaba",
  intent: "rent" as SubmitSubject["intent"],
  rentMinor: 150_000_000,
  rentPeriod: "year" as SubmitSubject["rentPeriod"],
  rateMinor: 0,
  ratePeriod: null,
  salePriceMinor: null,
  tenure: null,
  bedrooms: 2,
  bathrooms: 2,
  amenityCount: 3,
  photoCount: MIN_PHOTOS + 2,
  hasCover: true,
  ...over,
});

const facts = (over: Partial<HealthFacts> = {}): HealthFacts => ({
  gate: gate(),
  status: "PUBLISHED",
  listingRole: "agent",
  inspectedAt: "2026-09-01T10:00:00Z",
  addressCheckedAt: null,
  ownershipVerifiedAt: null,
  mandateVerifiedAt: "2026-08-01T10:00:00Z",
  publishedAt: new Date(NOW - 40 * DAY).toISOString(),
  listerConfirmedAt: new Date(NOW - 2 * DAY).toISOString(),
  fix: null,
  now: NOW,
  ...over,
});

const rowOf = (health: ReturnType<typeof listingHealth>, key: string) => health.rows.find((r) => r.key === key);

describe("listing health", () => {
  it("always states the six explanations, in the register's order", () => {
    expect(listingHealth(facts()).rows.map((r) => r.key)).toEqual([...HEALTH_ROWS]);
  });

  it("never calls the floor plan missing: there is nowhere to hold one", () => {
    expect(rowOf(listingHealth(facts()), "floorPlan")?.state).toBe("notHeld");
    expect(listingHealth(facts()).missing).toBe(0);
  });

  it("recommends nothing when every rule is satisfied", () => {
    expect(listingHealth(facts()).recommendations).toEqual([]);
  });

  it("asks for photos only when the submit gate would", () => {
    const health = listingHealth(facts({ gate: gate({ photoCount: 1 }) }));
    expect(rowOf(health, "photos")?.state).toBe("missing");
    expect(health.recommendations).toContainEqual({ key: "photos", more: MIN_PHOTOS - 1, min: MIN_PHOTOS, noCover: false });
  });

  it("names a missing cover when the count is enough", () => {
    const health = listingHealth(facts({ gate: gate({ hasCover: false }) }));
    expect(health.recommendations).toContainEqual(expect.objectContaining({ key: "photos", more: 0, noCover: true }));
  });

  it("asks for a longer description by the gate's own word count", () => {
    const health = listingHealth(facts({ gate: gate({ description: words(12) }) }));
    expect(health.recommendations).toContainEqual({ key: "description", words: 12, min: MIN_DESCRIPTION_WORDS });
  });

  it("dates the inspection or says there is none, never both", () => {
    expect(rowOf(listingHealth(facts()), "inspection")).toMatchObject({ state: "present", at: "2026-09-01T10:00:00Z" });
    expect(rowOf(listingHealth(facts({ inspectedAt: "garbage" })), "inspection")?.state).toBe("missing");
  });

  it("states one authority, the title document before the mandate", () => {
    const health = listingHealth(facts({ ownershipVerifiedAt: "2026-07-01T10:00:00Z" }));
    expect(rowOf(health, "verification")).toMatchObject({ state: "present", basis: "ownership" });
  });

  it("sends an agent to the mandate and an owner to verification", () => {
    const none = { ownershipVerifiedAt: null, mandateVerifiedAt: null };
    expect(listingHealth(facts(none)).recommendations).toContainEqual({ key: "verification", route: "mandate" });
    expect(listingHealth(facts({ ...none, listingRole: "owner" })).recommendations).toContainEqual({
      key: "verification",
      route: "verification",
    });
  });

  it("asks a live listing unconfirmed for the freshness window to confirm, and only then", () => {
    const stale = listingHealth(facts({ listerConfirmedAt: new Date(NOW - 20 * DAY).toISOString() }));
    expect(rowOf(stale, "availability")).toMatchObject({ state: "missing", days: 20 });
    expect(stale.recommendations).toContainEqual(expect.objectContaining({ key: "availability" }));
  });

  it("does not ask a draft whether it is still available", () => {
    const draft = listingHealth(facts({ status: "DRAFT", listerConfirmedAt: null }));
    expect(rowOf(draft, "availability")?.state).toBe("notAsked");
    expect(draft.recommendations.some((r) => r.key === "availability")).toBe(false);
  });

  it("says nothing about availability when the confirmation could not be read", () => {
    const unread = listingHealth(facts({ listerConfirmedAt: undefined }));
    expect(rowOf(unread, "availability")?.state).toBe("unread");
    expect(unread.missing).toBe(0);
  });

  it("carries the funnel's one fix through unchanged", () => {
    const fix = { key: "no-viewing" as const, values: { enquired: 4 } };
    expect(listingHealth(facts({ fix })).recommendations).toContainEqual({ key: "funnel", fix });
  });
});
