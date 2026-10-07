import type { Listing } from "@/lib/listings/types";

/**
 * THE TRUST A SPACE HAS EARNED, AND NOTHING IT HAS NOT (D24).
 *
 * The founder's ruling on the example rows: the visible "example" labelling
 * comes off the detail pages, and the rows stay. What makes that safe is not a
 * word on the screen, it is that an example row can never be drawn as a
 * CHECKED one: no verified badge, no inspection or address date, no rating,
 * no verified agent behind it. The 2026 incident was 22 invented places
 * carrying `verified: true` and fabricated ratings, and that is the failure
 * this function exists to make impossible on the presentation side.
 *
 * The repository already clamps most of these when it maps a row
 * (`lib/listings/supabase-repository.ts`: `verified`, `rating`,
 * `reviewCount` and the proof dates read `!is_demo`), and the database refuses
 * the supply stamps on an example. The two inspection dates are NOT clamped
 * there, on the reasoning that the database refuses them. This is the second
 * lock the founder asked engineering for: every trust signal the detail pages
 * draw is read through here, so a row that slipped past both of the other
 * locks still draws as a plain listing, never as a checked one.
 *
 * PURE, AND IN ITS OWN FILE SO IT CAN BE ASSERTED (`earned-trust.test.ts`).
 */
export type EarnedTrust = {
  /** A person here checked the lister's government ID. */
  verified: boolean;
  /** `listings.physically_inspected_at`, or null. */
  inspectedAt: string | null;
  /** `listings.address_verified_at`, or null. */
  addressCheckedAt: string | null;
  /** The average of real review rows; 0 when there is none to show. */
  rating: number;
  reviewCount: number;
};

type Subject = Pick<
  Listing,
  "isDemo" | "verified" | "inspectedAt" | "addressVerifiedAt" | "rating" | "reviewCount"
>;

/** A timestamp a page may print beside a check, or null. */
function datable(value: string | null | undefined): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return Number.isFinite(Date.parse(value)) ? value : null;
}

export function earnedTrust(listing: Subject): EarnedTrust {
  if (listing.isDemo) {
    return { verified: false, inspectedAt: null, addressCheckedAt: null, rating: 0, reviewCount: 0 };
  }
  /* A rating prints only with the reviews behind it, so a count of zero takes
     the average with it rather than leaving a lone star. */
  const reviewed = listing.reviewCount > 0 && listing.rating > 0;
  return {
    verified: listing.verified === true,
    inspectedAt: datable(listing.inspectedAt),
    addressCheckedAt: datable(listing.addressVerifiedAt),
    rating: reviewed ? listing.rating : 0,
    reviewCount: reviewed ? listing.reviewCount : 0,
  };
}

/**
 * The listing as the detail pages may draw it: the same object with every
 * trust field replaced by what `earnedTrust` allows. Handed to components that
 * read `listing.verified` or `listing.rating` themselves (the card glance, the
 * reviews band, the proof facts), so none of them can see an unearned value.
 */
export function withEarnedTrust<T extends Subject>(listing: T): T {
  const earned = earnedTrust(listing);
  const out: T = {
    ...listing,
    verified: earned.verified,
    rating: earned.rating,
    reviewCount: earned.reviewCount,
  };
  if (earned.inspectedAt) out.inspectedAt = earned.inspectedAt;
  else delete out.inspectedAt;
  if (earned.addressCheckedAt) out.addressVerifiedAt = earned.addressCheckedAt;
  else delete out.addressVerifiedAt;
  return out;
}
