/**
 * LISTING HEALTH, AS FACTS (feature register J4; north star 16.6, D25).
 *
 * The register asks for "a score with explanations" and six recommendations.
 * Nothing on the platform computes a score, and this file does not invent
 * one: a number out of a hundred built here would be a weighting nobody in
 * Session 2 decided, and `docs/PRODUCT.md` section 7 refuses "score" as a
 * word for standing. What the record DOES hold is enough to say, line by line,
 * what a listing has and what it is missing. So the state of a listing is the
 * six explanations themselves, each one a fact read from its own column, and
 * the only summary is how many of them say "missing".
 *
 * THE SIX EXPLANATIONS, AND WHERE EACH ONE IS READ FROM
 *
 *   floorPlan      NOT HELD. No column, table or upload kind holds a floor
 *                  plan. The row says so and is never "missing": a lister
 *                  cannot add what the platform cannot take (R-50).
 *   amenities      `listing_amenities` rows, judged by the submit gate
 *                  (`submitRequirements`: at least one).
 *   inspection     `listings.physically_inspected_at`, a date or nothing.
 *   photos         `listing_photos` rows and whether one sits at position 0,
 *                  judged by the submit gate (MIN_PHOTOS and a cover). The
 *                  gate counts photographs; it cannot see their quality, so
 *                  this row never calls them weak (R-51).
 *   availability   `listings.lister_confirmed_at` against going live, by the
 *                  "still available?" rule in `lib/agent/freshness.ts`
 *                  (CONFIRM_EVERY_DAYS). Only a live listing is asked.
 *   verification   `listings.ownership_verified_at` or `mandate_verified_at`
 *                  (the authority line of the proof strip, the same order and
 *                  the same rule), with `address_verified_at` beside it.
 *
 * THE RECOMMENDATIONS ARE THE DATA'S OWN. Each one exists only when a rule
 * the platform already enforces fires on this listing's own record: the
 * submit gate (photos, description, amenities), the freshness rule
 * (availability), the authority line (verification), and the funnel's one
 * fix (`fixFor`, V-73). Two of the register's six cannot be derived from any
 * record and are not drawn: price advice (no rule or comparison exists that
 * may advise a price) and the floor plan (nothing holds one). Those are
 * requests to Session 2, never sentences invented here.
 *
 * Pure, so every rule is proved in `health-model.test.ts`.
 */

import {
  MIN_DESCRIPTION_WORDS,
  MIN_PHOTOS,
  countWords,
  submitRequirements,
  type SubmitSubject,
} from "@/lib/agent/listings-model";
import { CONFIRM_EVERY_DAYS, daysSinceConfirmed, dueForConfirmation } from "@/lib/agent/freshness";
import type { Fix } from "@/lib/agent/funnel";

export const HEALTH_ROWS = ["floorPlan", "amenities", "inspection", "photos", "availability", "verification"] as const;
export type HealthRowKey = (typeof HEALTH_ROWS)[number];

/**
 *   present   the record holds it.
 *   missing   the record does not, and the lister can add it.
 *   notHeld   the platform has nowhere to hold it.
 *   notAsked  it does not apply to this listing as it stands (a draft is not
 *             asked whether it is still available).
 *   unread    the read for this row failed; nothing is said either way.
 */
export type HealthState = "present" | "missing" | "notHeld" | "notAsked" | "unread";

export type HealthRow =
  | { key: "floorPlan"; state: "notHeld" }
  | { key: "amenities"; state: "present" | "missing"; count: number }
  | { key: "inspection"; state: "present"; at: string }
  | { key: "inspection"; state: "missing" }
  | { key: "photos"; state: "present" | "missing"; count: number; min: number; hasCover: boolean }
  | { key: "availability"; state: "present"; at: string; days: number }
  | { key: "availability"; state: "missing"; at: string | null; days: number | null; limit: number }
  | { key: "availability"; state: "notAsked" | "unread" }
  | {
      key: "verification";
      state: "present";
      basis: "ownership" | "mandate";
      at: string;
      addressAt: string | null;
    }
  | { key: "verification"; state: "missing"; addressAt: string | null };

export type HealthRec =
  | { key: "photos"; more: number; min: number; noCover: boolean }
  | { key: "verification"; route: "mandate" | "verification" }
  | { key: "description"; words: number; min: number }
  | { key: "availability"; limit: number }
  | { key: "amenities" }
  | { key: "funnel"; fix: Fix };

export type HealthFacts = {
  /** What the submit gate judges, read back out of Postgres. */
  gate: SubmitSubject;
  status: string;
  listingRole: "owner" | "agent" | "firm" | null;
  inspectedAt: string | null;
  addressCheckedAt: string | null;
  ownershipVerifiedAt: string | null;
  mandateVerifiedAt: string | null;
  publishedAt: string | null;
  /**
   * The lister's last "still available": a timestamp, null when they never
   * said it, or `undefined` when it could not be read (the column is not
   * there yet, or the read failed).
   */
  listerConfirmedAt: string | null | undefined;
  /** This week's one fix from the funnel, when the funnel was read and one fires. */
  fix: Fix | null;
  now: number;
};

export type ListingHealth = {
  rows: HealthRow[];
  recommendations: HealthRec[];
  /** How many rows say "missing". The only summary there is. */
  missing: number;
};

/** A timestamp that parses, or null. A date that cannot be printed is not a fact. */
function datable(value: string | null | undefined): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return Number.isFinite(Date.parse(value)) ? value : null;
}

export function listingHealth(facts: HealthFacts): ListingHealth {
  const unmet = new Set(submitRequirements(facts.gate).map((requirement) => requirement.field));
  const live = facts.status === "PUBLISHED";

  /* ---- the six rows, in the register's order ---- */

  const amenities: HealthRow = {
    key: "amenities",
    state: unmet.has("amenities") ? "missing" : "present",
    count: facts.gate.amenityCount,
  };

  const inspectedAt = datable(facts.inspectedAt);
  const inspection: HealthRow = inspectedAt
    ? { key: "inspection", state: "present", at: inspectedAt }
    : { key: "inspection", state: "missing" };

  const photos: HealthRow = {
    key: "photos",
    state: unmet.has("photos") ? "missing" : "present",
    count: facts.gate.photoCount,
    min: MIN_PHOTOS,
    hasCover: facts.gate.hasCover,
  };

  let availability: HealthRow;
  if (!live) {
    availability = { key: "availability", state: "notAsked" };
  } else if (facts.listerConfirmedAt === undefined) {
    availability = { key: "availability", state: "unread" };
  } else {
    const row = { id: "", title: "", publishedAt: facts.publishedAt, listerConfirmedAt: facts.listerConfirmedAt };
    const days = daysSinceConfirmed(row, facts.now);
    const last = [datable(facts.publishedAt), datable(facts.listerConfirmedAt)]
      .filter((value): value is string => value !== null)
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
    availability =
      dueForConfirmation([row], facts.now).length > 0 || last === null || days === null
        ? { key: "availability", state: "missing", at: last, days, limit: CONFIRM_EVERY_DAYS }
        : { key: "availability", state: "present", at: last, days };
  }

  /* The proof strip's authority rule: the title document is the stronger and
     narrower claim, and only one authority is ever stated. */
  const owned = datable(facts.ownershipVerifiedAt);
  const mandated = datable(facts.mandateVerifiedAt);
  const addressAt = datable(facts.addressCheckedAt);
  const verification: HealthRow = owned
    ? { key: "verification", state: "present", basis: "ownership", at: owned, addressAt }
    : mandated
      ? { key: "verification", state: "present", basis: "mandate", at: mandated, addressAt }
      : { key: "verification", state: "missing", addressAt };

  const rows: HealthRow[] = [{ key: "floorPlan", state: "notHeld" }, amenities, inspection, photos, availability, verification];

  /* ---- what to do, each from a rule that fired ---- */

  const recommendations: HealthRec[] = [];
  if (unmet.has("photos")) {
    recommendations.push({
      key: "photos",
      more: Math.max(0, MIN_PHOTOS - facts.gate.photoCount),
      min: MIN_PHOTOS,
      noCover: facts.gate.photoCount >= MIN_PHOTOS && !facts.gate.hasCover,
    });
  }
  if (verification.state === "missing") {
    /* An agent or a firm proves authority with the owner's mandate; an owner
       with their own title, through the verification ladder. */
    recommendations.push({ key: "verification", route: facts.listingRole === "owner" ? "verification" : "mandate" });
  }
  if (unmet.has("description")) {
    recommendations.push({ key: "description", words: countWords(facts.gate.description), min: MIN_DESCRIPTION_WORDS });
  }
  if (availability.state === "missing") {
    recommendations.push({ key: "availability", limit: CONFIRM_EVERY_DAYS });
  }
  if (unmet.has("amenities")) recommendations.push({ key: "amenities" });
  if (facts.fix) recommendations.push({ key: "funnel", fix: facts.fix });

  return { rows, recommendations, missing: rows.filter((row) => row.state === "missing").length };
}
