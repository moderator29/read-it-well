import { FUND_CLOSED, FUND_OPEN_BALANCE, FUND_STEPS, FUND_TOP_UP } from "./copy";

/**
 * STEP 7, FUND (D77): what the renter's funding screen shows, from facts the
 * server read. Pure, so every state is tested without a database and the dev
 * preview draws the same screen from recorded fixtures.
 *
 * The renter pays exactly the agreed rent into escrow from their Vallo
 * (Payluk) balance; Payluk's fee is the lister's (VALLO_PRICING section 6), so
 * nothing is added here. Once an arrangement is funded or beyond, this screen
 * steps aside for /agreements/[id]/held.
 */

export type FundBalance =
  | { state: "ready"; availableMinor: number; confirmedAt: string | null; live: boolean }
  | { state: "onboarding" }
  | { state: "not-live" }
  | { state: "error" };

export type FundFacts = {
  viewerIsRenter: boolean;
  kind: string;
  agreementStatus: string;
  /** public.agreement_payable_for: 'payable', 'review_required', 'not_approved', or null when unread. */
  payable: string | null;
  rail: "escrow" | "direct" | null;
  /** The escrow rail is ready: the Payluk key and `payments_payluk_on` (D77). */
  railLive: boolean;
  /** The live arrangement's status, or null when none exists yet. */
  arrangementStatus: string | null;
  amountMinor: number;
  placeTitle: string;
  counterpartName: string;
  moveIn: string | null;
  balance: FundBalance;
};

export type FundStep = { title: string; body: string };

export type FundModel =
  | { kind: "go_held" }
  | { kind: "closed"; reason: keyof typeof FUND_CLOSED; body: string }
  | {
      kind: "fund";
      amountMinor: number;
      /** Null until the balance is open. */
      availableMinor: number | null;
      /** How much more the balance needs; 0 when it covers the rent. */
      shortMinor: number;
      /** 0 to 1: how much of the rent the balance covers, for the meter. */
      cover: number;
      /** The swipe is offered only when the balance covers the rent. */
      ready: boolean;
      /** The one other action: open or top up the balance, back to this screen after. */
      balanceAction: { label: string; href: string } | null;
      /** True when the figure is the last one Payluk gave, not a fresh read. */
      balanceStale: boolean;
      steps: readonly FundStep[];
    };

/** The statuses at which the money has left the renter's hands, or is leaving: the held screen tells it. */
const PAST_FUNDING = new Set(["payment_processing", "protected", "release_requested", "released", "disputed", "refunded", "split"]);

export function fundHref(agreementId: string): string {
  return `/agreements/${agreementId}/fund`;
}

/** Where the balance is opened and topped up (it does not yet return here by itself). */
export const WALLET_HREF = "/wallet";

export function fundModel(f: FundFacts): FundModel {
  if (f.arrangementStatus !== null && PAST_FUNDING.has(f.arrangementStatus)) return { kind: "go_held" };
  const closed = (reason: keyof typeof FUND_CLOSED): FundModel => ({ kind: "closed", reason, body: FUND_CLOSED[reason] });
  if (!f.viewerIsRenter) return closed("not_renter");
  if (f.kind !== "rent") return closed("not_rent");
  if (f.agreementStatus !== "approved") return closed("not_approved");
  if (f.rail === "direct") return closed("direct");
  if (f.payable === "review_required") return closed("review_required");
  if (f.payable !== "payable" || f.rail !== "escrow") return closed("not_approved");
  if (!f.railLive) return closed("not_live");

  if (f.balance.state === "onboarding") {
    return {
      kind: "fund",
      amountMinor: f.amountMinor,
      availableMinor: null,
      shortMinor: f.amountMinor,
      cover: 0,
      ready: false,
      balanceAction: { label: FUND_OPEN_BALANCE, href: WALLET_HREF },
      balanceStale: false,
      steps: FUND_STEPS,
    };
  }
  if (f.balance.state !== "ready") return closed(f.balance.state === "not-live" ? "not_live" : "balance_unreadable");

  const available = Math.max(0, f.balance.availableMinor);
  const short = Math.max(0, f.amountMinor - available);
  return {
    kind: "fund",
    amountMinor: f.amountMinor,
    availableMinor: available,
    shortMinor: short,
    cover: f.amountMinor > 0 ? Math.min(1, available / f.amountMinor) : 0,
    ready: short === 0,
    balanceAction: short > 0 ? { label: FUND_TOP_UP, href: WALLET_HREF } : null,
    balanceStale: !f.balance.live,
    steps: FUND_STEPS,
  };
}
