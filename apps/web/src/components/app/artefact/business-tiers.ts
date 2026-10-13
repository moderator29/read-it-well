import type { TrustTierItem } from "./TrustTierFan";

/**
 * A HOST BUSINESS'S VERIFICATION LADDER AS CREDENTIALS (north star 14.4,
 * "trust tiers"), from the real read `getMyBusinessLadder` in
 * `lib/host/queries.ts`: the tier is `businesses.verification_tier`, computed
 * by `private.business_tier` and read back, never recomputed here; the rungs
 * and what each means to a guest are `BUSINESS_LADDER`'s own words.
 *
 * HELD IS THE DATABASE'S TIER, NOT THE RUNG'S OWN STATUS. A rung passed above
 * a gap (`stranded` in `ladderView`) is not held, because the tier is rungs
 * passed with no gap below, and a credential that said "Held" for it would be
 * claiming standing the database did not grant.
 *
 * Structural input so this stays client safe: it never imports the server read.
 */
export type BusinessLadderInput = {
  tier: number;
  rungs: readonly { step: number; label: string; guestMeaning: string }[];
};

export function businessTierItems(ladder: BusinessLadderInput): TrustTierItem[] {
  return [...ladder.rungs]
    .sort((a, b) => a.step - b.step)
    .map((rung) => ({
      step: rung.step,
      name: rung.label,
      meaning: rung.guestMeaning,
      held: rung.step <= ladder.tier,
    }));
}
