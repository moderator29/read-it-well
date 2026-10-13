/**
 * FIXTURE DATA FOR THE P5 MONEY DECK (/preview/p5). Development only: the
 * preview layout 404s everywhere else. Every figure, name, reference and date
 * here is invented for design review and labelled as such on the page. The
 * figures are the founder's section 37 and 38 examples, so a reviewer can
 * read the screens against his brief. Nothing in the product reads this file.
 */
import type { BalanceRead, MovementView } from "@/lib/money/member-wallet";
import type { BalanceFigures } from "@/lib/money/funds";
import type { HistoryEntry } from "@/lib/money/history-model";

export const NOW_ISO = "2026-10-07T10:03:00.000Z";
const AT = "2026-10-07T10:00:00.000Z";

export const FIGURES: BalanceFigures = {
  available: { minor: 2_450_000_00, confirmedAt: AT },
  protected: { minor: 850_000_00, confirmedAt: AT },
  pending: { minor: 50_000_00, confirmedAt: AT },
  processing: { minor: 250_000_00, confirmedAt: AT },
  currency: "NGN",
};

function movement(over: Partial<MovementView> & Pick<MovementView, "id" | "kind" | "status" | "amountMinor">): MovementView {
  return {
    providerFeeMinor: null,
    currency: "NGN",
    counterparty: {},
    reference: `VL-FIX-${over.id.slice(-4).toUpperCase()}`,
    createdAt: "2026-10-07T09:12:00.000Z",
    observedAt: AT,
    confirmedByProvider: over.status === "completed",
    ...over,
  };
}

export const MOVEMENTS: MovementView[] = [
  movement({ id: "fx-0001", kind: "withdrawal", status: "processing", amountMinor: 250_000_00, counterparty: { bank: "Fixture Bank", last4: "4821" } }),
  movement({ id: "fx-0002", kind: "deposit", status: "completed", amountMinor: 500_000_00, createdAt: "2026-10-06T16:40:00.000Z" }),
  movement({ id: "fx-0003", kind: "transfer_out", status: "completed", amountMinor: 50_000_00, counterparty: { name: "Tunde A." }, createdAt: "2026-10-05T11:02:00.000Z" }),
  movement({ id: "fx-0004", kind: "transfer_in", status: "completed", amountMinor: 30_000_00, createdAt: "2026-10-04T19:32:00.000Z" }),
  movement({ id: "fx-0005", kind: "withdrawal", status: "failed", amountMinor: 120_000_00, counterparty: { bank: "Fixture Bank", last4: "4821" }, createdAt: "2026-10-02T08:15:00.000Z" }),
];

export const WAITING: Record<string, MovementView> = {
  processing: MOVEMENTS[0]!,
  unknown: movement({ id: "fx-0101", kind: "withdrawal", status: "unknown", amountMinor: 250_000_00 }),
  completed: movement({ id: "fx-0102", kind: "withdrawal", status: "completed", amountMinor: 250_000_00 }),
  failed: MOVEMENTS[4]!,
  deposit: movement({ id: "fx-0103", kind: "deposit", status: "processing", amountMinor: 500_000_00 }),
  sent: movement({ id: "fx-0104", kind: "transfer_out", status: "completed", amountMinor: 50_000_00, counterparty: { name: "Tunde A." }, providerFeeMinor: 0 }),
  added: movement({ id: "fx-0105", kind: "deposit", status: "completed", amountMinor: 500_000_00 }),
};

export const BALANCE_READS: Record<string, Exclude<BalanceRead, { state: "signed-out" }>> = {
  live: { state: "ready", live: true, figures: FIGURES, movements: MOVEMENTS, readAt: NOW_ISO },
  quiet: { state: "ready", live: true, figures: { ...FIGURES, available: { minor: 0, confirmedAt: AT }, protected: { minor: 0, confirmedAt: AT }, pending: { minor: 0, confirmedAt: null }, processing: { minor: 0, confirmedAt: null } }, movements: [], readAt: NOW_ISO },
  stale: { state: "ready", live: false, figures: FIGURES, movements: MOVEMENTS.slice(1), readAt: NOW_ISO },
  unreachable: { state: "ready", live: false, figures: null, movements: [], readAt: NOW_ISO },
  "not-live": { state: "not-live", reason: "switched_off" },
  onboarding: { state: "onboarding", onboarding: "NOT_STARTED", gaps: [] },
  "onboarding-gaps": { state: "onboarding", onboarding: "VERIFICATION_REQUIRED", gaps: ["phone", "last_name"] },
  pending: { state: "onboarding", onboarding: "PENDING", gaps: [] },
  error: { state: "error" },
};

function entry(over: Partial<HistoryEntry> & Pick<HistoryEntry, "id" | "kind" | "amountMinor" | "status" | "occurredAt">): HistoryEntry {
  return {
    direction: over.kind === "refund" || over.kind === "earning" ? "in" : "out",
    reference: `vl_tx_${over.id}`,
    title: "Fixture space, two bedrooms",
    bookingId: null,
    grossMinor: null,
    guaranteeMinor: null,
    commissionMinor: null,
    listerShareMinor: null,
    payerName: null,
    payeeName: null,
    ...over,
  };
}

export const PAYMENTS: HistoryEntry[] = [
  entry({ id: "p001", kind: "payment", amountMinor: 1_800_000_00, status: "successful", occurredAt: "2026-10-06T14:20:00.000000+00:00", title: "Lekki two bedroom, rent", bookingId: "b-0001" }),
  entry({ id: "p002", kind: "refund", amountMinor: 45_000_00, status: "submitted", occurredAt: "2026-10-03T09:10:00.000000+00:00", title: "Grand Vista, one night" }),
  entry({ id: "p003", kind: "payment", amountMinor: 360_000_00, status: "successful", occurredAt: "2026-10-01T18:02:00.000000+00:00", title: "Grand Vista, three nights", bookingId: "b-0002" }),
  entry({ id: "p004", kind: "refund", amountMinor: 120_000_00, status: "processed", occurredAt: "2026-09-21T12:00:00.000000+00:00", title: "Ikoyi studio, shortlet" }),
  entry({ id: "p005", kind: "payment", amountMinor: 120_000_00, status: "refunded", occurredAt: "2026-09-19T08:44:00.000000+00:00", title: "Ikoyi studio, shortlet" }),
];

export const PAYOUTS: HistoryEntry[] = [
  entry({ id: "e001", kind: "earning", amountMinor: 1_728_000_00, status: "successful", occurredAt: "2026-10-02T10:00:00.000000+00:00", grossMinor: 1_800_000_00, guaranteeMinor: 0, commissionMinor: 72_000_00, listerShareMinor: 1_728_000_00 }),
  entry({ id: "e002", kind: "earning", amountMinor: 345_600_00, status: "successful", occurredAt: "2026-09-24T15:30:00.000000+00:00", title: "Ikoyi studio, shortlet", grossMinor: 360_000_00, guaranteeMinor: 0, commissionMinor: 14_400_00, listerShareMinor: 345_600_00 }),
  entry({ id: "e003", kind: "reversal", amountMinor: 115_200_00, status: "reversed", occurredAt: "2026-09-21T12:00:00.000000+00:00", title: "Ikoyi studio, shortlet" }),
];
