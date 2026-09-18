/**
 * The Host verification ladder as data (HOST_ONBOARDING_RESEARCH sections
 * 3.3, 3.4 and 3.6), in the order a real host passes it.
 *
 * This is the TypeScript twin of `private.business_tier` in M15: rungs
 * passed with no gap below, so a passed on-site visit with no identity check
 * behind it promotes nobody. The database owns the number on the row; this
 * file exists so the admin desk, the host's own status page and a test can
 * all read the same ladder without asking Postgres what the words mean.
 *
 * Pure. No server-only import, so it is testable and usable from a client
 * component that renders the ladder.
 */

export const BUSINESS_RUNGS = ["identity", "registration", "payout", "on_site"] as const;
export type BusinessRung = (typeof BUSINESS_RUNGS)[number];

export type BusinessRungStatus = "passed" | "failed" | "pending";

export type BusinessRungDefinition = {
  rung: BusinessRung;
  step: 1 | 2 | 3 | 4;
  label: string;
  /** What passing this rung means to a guest, in one sentence. */
  guestMeaning: string;
  /** What the reviewer actually does, in one sentence. */
  reviewerDoes: string;
  /** Individual hosts have no CAC record; section 3.6 substitutes an address check. */
  individualLabel?: string;
};

export const BUSINESS_LADDER: Record<BusinessRung, BusinessRungDefinition> = {
  identity: {
    rung: "identity",
    step: 1,
    label: "Identity",
    guestMeaning:
      "A real person with government ID stands behind this business, and we have seen it.",
    reviewerDoes:
      "Open the representative's identity document and confirm it is a current government ID naming the person on the application.",
  },
  registration: {
    rung: "registration",
    step: 2,
    label: "Registration",
    guestMeaning:
      "The business is registered with the CAC and the record matches what they told us.",
    reviewerDoes:
      "Search the RC or BN number on the CAC public search and compare the registered name and address with the application. Individual hosts: confirm the address instead.",
    individualLabel: "Address",
  },
  payout: {
    rung: "payout",
    step: 3,
    label: "Payout",
    guestMeaning:
      "Money flows to an account in the business's or host's own name, resolved through the payment processor.",
    reviewerDoes:
      "Compare the resolved bank account name with the identity name or the registered business name.",
  },
  on_site: {
    rung: "on_site",
    step: 4,
    label: "On site",
    guestMeaning: "Somebody from Vallo has stood in this property or seen it live on video.",
    reviewerDoes: "Record the visit or the video call, with the date, after it has happened.",
  },
};

/**
 * Tier names, on the agent ladder's pattern. Tier 0 is "Approved", never
 * "unverified", because a human read the application before it went live.
 */
export const BUSINESS_TIER_NAME: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "Approved",
  1: "Identity verified",
  2: "Registration verified",
  3: "Payout verified",
  4: "Visited",
};

export type BusinessTier = keyof typeof BUSINESS_TIER_NAME;

export function asBusinessTier(value: number | null | undefined): BusinessTier {
  return value === 1 || value === 2 || value === 3 || value === 4 ? value : 0;
}

export type BusinessCheck = {
  rung: string;
  status: string;
  note?: string | null;
  decidedAt?: string | null;
};

/**
 * Rungs passed with no gap below, exactly `private.business_tier`'s law.
 *
 * A check whose rung this build does not know is ignored, and a status other
 * than "passed" does not count, so a failed identity rung with three passed
 * rungs above it is tier 0, not tier 3.
 */
export function businessTier(checks: readonly BusinessCheck[]): BusinessTier {
  const passed = new Set(
    checks.filter((check) => check.status === "passed").map((check) => check.rung),
  );
  let tier = 0;
  for (const rung of BUSINESS_RUNGS) {
    if (!passed.has(rung)) break;
    tier += 1;
  }
  return asBusinessTier(tier);
}

/** The badge law, as code: first party, and identity passed. */
export function businessVerified(source: string, tier: BusinessTier): boolean {
  return source === "first_party" && tier >= 1;
}

export type BusinessLadderRow = BusinessRungDefinition & {
  status: BusinessRungStatus;
  note: string | null;
  decidedAt: string | null;
  /** True when this rung is passed but a rung below it is not, so it does not count. */
  stranded: boolean;
};

/** The ladder with every rung's recorded state, for a desk or a status page. */
export function ladderView(checks: readonly BusinessCheck[]): BusinessLadderRow[] {
  const byRung = new Map(checks.map((check) => [check.rung, check]));
  const tier = businessTier(checks);
  return BUSINESS_RUNGS.map((rung, index) => {
    const check = byRung.get(rung);
    const status: BusinessRungStatus =
      check?.status === "passed" ? "passed" : check?.status === "failed" ? "failed" : "pending";
    return {
      ...BUSINESS_LADDER[rung],
      status,
      note: check?.note ?? null,
      decidedAt: check?.decidedAt ?? null,
      stranded: status === "passed" && index >= tier,
    };
  });
}

/** The lowest rung not yet passed, or null when the ladder is complete. */
export function nextRung(checks: readonly BusinessCheck[]): BusinessRung | null {
  const tier = businessTier(checks);
  return BUSINESS_RUNGS.find((_, index) => index === tier) ?? null;
}

/**
 * What blocks go-live versus what is a post-live rung (section 3.3).
 *
 * The ladder above is entirely post-live: verify after visibility, gate the
 * badge and payouts, not the shelf. The go-live gate is `missingFrom` in
 * lib/host/onboarding.ts plus the admin approval and the property publish
 * gate. This list is the research's own words, kept as data so the desk can
 * say which is which without anyone re-deriving it.
 */
export const GO_LIVE_BLOCKERS = [
  "Representative identity document on file",
  "The business row complete: name, kind, address, contact",
  "CAC number entered for the business branch",
  "One bookable unit: a room type with a rate and a policy, or a service window with covers and a price band",
  "Photos (at least a cover) and the map pin",
  "Bank account resolved",
  "The three consents",
  "Admin approval, then the property publish gate",
] as const;

/** Never rungs, only fields (section 3.3): these render as dated facts. */
export const NEVER_RUNGS = ["tin", "website", "hygiene_attested_at", "licence_attested_at"] as const;
