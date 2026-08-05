/**
 * The agent verification ladder, as data.
 *
 * Four rungs in a fixed order, one definition, read by the console that awards
 * them and by the standards page that publishes what each one means. A ladder
 * whose public description and internal checklist are written separately is a
 * ladder that ends up promising the guest something the reviewer never looked
 * at, which is worse than having no ladder at all.
 *
 * Client-safe: imports nothing, so the same values reach the server, the
 * browser and the specs.
 *
 * The order is the order a real agent passes them, cheapest and most basic
 * first. `private.agent_tier` in the database uses this exact sequence, and the
 * tier is the count of rungs passed with no gap below them: a passed in-person
 * check with no identity check behind it promotes nobody.
 */

export const VERIFICATION_RUNGS = ["identity", "address", "payout", "in_person"] as const;

export type VerificationRung = (typeof VERIFICATION_RUNGS)[number];

/** 0 means an approved agent nobody has checked beyond the application form. */
export type VerificationTier = 0 | 1 | 2 | 3 | 4;

export type RungDefinition = {
  kind: VerificationRung;
  /** Its position on the ladder, 1 to 4, matching `private.agent_tier`. */
  step: VerificationTier;
  /** What a member of staff is being asked to confirm. */
  label: string;
  /** What passing it actually proves, written for a guest to read. */
  meaning: string;
  /** What the reviewer looks at. Named concretely so it can be checked. */
  evidence: string;
};

export const VERIFICATION_LADDER: Record<VerificationRung, RungDefinition> = {
  identity: {
    kind: "identity",
    step: 1,
    label: "Identity seen",
    meaning:
      "A real person with government identification stands behind this account, and we have seen it.",
    evidence:
      "The NIN or government ID on the application, checked against the uploaded document.",
  },
  address: {
    kind: "address",
    step: 2,
    label: "Address confirmed",
    meaning:
      "We know where they are, so an agent who disappears is not untraceable.",
    evidence:
      "The residential or registered business address on the application, confirmed against a document or a reachable contact at it.",
  },
  payout: {
    kind: "payout",
    step: 3,
    label: "Bank account in their own name",
    meaning:
      "Money owed to this agent goes to an account that belongs to them, not to somebody else.",
    evidence:
      "The payout account resolved through the payment processor, with the returned account name matching the identity on file.",
  },
  in_person: {
    kind: "in_person",
    step: 4,
    label: "Met in person",
    meaning:
      "Somebody from RentMe has met this agent or stood in one of their properties.",
    evidence: "A visit or a live video call, recorded with the date and who did it.",
  },
};

/** The rungs in ladder order. */
export const VERIFICATION_ORDER: RungDefinition[] = VERIFICATION_RUNGS.map(
  (kind) => VERIFICATION_LADDER[kind],
);

/**
 * What a tier is called, in one word a guest can act on.
 *
 * Tier 0 is deliberately not called "unverified": an approved agent has already
 * been through an application a person read. It is called what it is.
 */
export const TIER_NAME: Record<VerificationTier, string> = {
  0: "Approved",
  1: "Identity verified",
  2: "Address verified",
  3: "Payout verified",
  4: "Fully verified",
};

/** Clamp anything the database hands back into the range the ladder defines. */
export function asTier(value: number | null | undefined): VerificationTier {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  const clamped = Math.min(4, Math.max(0, Math.trunc(value)));
  return clamped as VerificationTier;
}

/** The rung a given agent is being asked for next, or null once the ladder ends. */
export function nextRung(tier: VerificationTier): RungDefinition | null {
  return VERIFICATION_ORDER.find((rung) => rung.step === tier + 1) ?? null;
}
