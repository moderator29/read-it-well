import type { HistoryEntry } from "@/lib/money/history-model";
import type { ListerFeePolicy } from "@/lib/money/lister-fee";
import type { MoneyReference } from "@/lib/money/references";
import type { Balances, TimelineEvent, WithdrawalQuote } from "@/lib/money/vallo";

/**
 * FIXTURE DATA FOR THE MONEY DECK. Every figure, name, reference and date
 * below is invented for design review and is labelled as such on the page.
 * Nothing here is read by a product route: the product reads go through
 * `lib/money/partner-reads.ts`, which has no fixture path.
 *
 * The figures are the founder's own worked examples from D51 (1,800,000 at a
 * 4 percent fee; a 1,000,000 withdrawal with a 300 fee), so a reviewer can
 * check the arithmetic against the directive.
 */
export const FIXTURE_POLICY: ListerFeePolicy = { rateVersion: "fixture-1", rail: "protected", feeBps: 400, capMinor: null };

export const FIXTURE_BALANCES: Balances = {
  availableMinor: 245_000_00,
  protectedMinor: 1_800_000_00,
  currency: "NGN",
  heldBy: "Fixture Partner Ltd",
  asOf: "2026-10-06T08:30:00Z",
};

export const FIXTURE_QUOTE: WithdrawalQuote = {
  intentId: "fixture-intent",
  amountMinor: 1_000_000_00,
  processingFeeMinor: 300_00,
  receiveMinor: 999_700_00,
  currency: "NGN",
  destination: { bankName: "Fixture Bank", accountName: "Fixture Name", last4: "0000" },
  expiresAt: "2099-01-01T00:00:00Z",
};

export const FIXTURE_EVENTS: TimelineEvent[] = [
  { kind: "agreement_approved", at: "2026-10-01T09:00:00Z" },
  { kind: "payment_confirmed", at: "2026-10-01T09:20:00Z", amountMinor: 1_800_000_00 },
  { kind: "protected", at: "2026-10-01T09:21:00Z", amountMinor: 1_800_000_00 },
];

export const FIXTURE_REFS_FIAT: MoneyReference[] = [
  { kind: "transaction", value: "fixture-tx-0001" },
  { kind: "receipt", value: "FIXTURE-R-0001" },
  { kind: "agreement", value: "fixture-agreement" },
  { kind: "space", value: "fixture-space" },
  { kind: "provider", value: "fixture-partner-ref", provider: "Fixture Partner" },
  /* Drawn on neither: a fiat payment has no chain hash. */
  { kind: "chain", value: "0xfixture" },
];

export const FIXTURE_PAYOUTS: HistoryEntry[] = [
  {
    id: "fixture-payout-1",
    kind: "earning",
    occurredAt: "2026-10-02T10:00:00Z",
    amountMinor: 1_728_000_00,
    direction: "in",
    status: "successful",
    reference: "fixture-tx-0002",
    title: "Fixture space, two bedrooms",
    bookingId: null,
    grossMinor: 1_800_000_00,
    guaranteeMinor: 0,
    commissionMinor: 72_000_00,
    listerShareMinor: 1_728_000_00,
    payerName: null,
    payeeName: null,
  },
];
