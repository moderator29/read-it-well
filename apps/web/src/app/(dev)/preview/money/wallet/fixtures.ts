/**
 * SAMPLE DATA FOR THE WALLET HARNESS (/preview/money/wallet). Development
 * only: the preview layout 404s it everywhere else. Every figure, name,
 * bank, reference and date here is invented for design review and the page
 * says so on screen. Nothing in the product reads this file.
 */
import type { BalanceRead, MovementView } from "@/lib/money/member-wallet";
import type { Quote } from "@/lib/money/member-wallet-actions";
import { withdrawalBreakdown } from "@/lib/money/funds";
import { sumMovements } from "@/lib/money/wallet-view";
import { BALANCE_READS, FIGURES, NOW_ISO } from "../../p5/fixtures";

const AT = "2026-10-07T10:00:00.000Z";

function sample(over: Partial<MovementView> & Pick<MovementView, "id" | "kind" | "status" | "amountMinor" | "createdAt">): MovementView {
  return {
    providerFeeMinor: null,
    currency: "NGN",
    counterparty: {},
    reference: `VL-SAMPLE-${over.id.slice(-4).toUpperCase()}`,
    observedAt: AT,
    confirmedByProvider: over.status === "completed",
    ...over,
  };
}

export const SAMPLE_MOVEMENTS: MovementView[] = [
  sample({ id: "sm-0001", kind: "withdrawal", status: "processing", amountMinor: 250_000_00, counterparty: { bank: "Sample Bank", last4: "4321" }, createdAt: "2026-10-07T09:12:00.000Z" }),
  sample({ id: "sm-0002", kind: "transfer_in", status: "completed", amountMinor: 850_000_00, createdAt: "2026-10-06T10:24:00.000Z" }),
  sample({ id: "sm-0003", kind: "transfer_out", status: "completed", amountMinor: 45_000_00, counterparty: { name: "Sample A." }, createdAt: "2026-10-05T18:32:00.000Z" }),
  sample({ id: "sm-0004", kind: "deposit", status: "completed", amountMinor: 500_000_00, createdAt: "2026-10-04T11:20:00.000Z" }),
  sample({ id: "sm-0005", kind: "withdrawal", status: "completed", amountMinor: 300_000_00, counterparty: { bank: "Sample Bank", last4: "4321" }, createdAt: "2026-10-03T14:14:00.000Z" }),
  sample({ id: "sm-0006", kind: "transfer_out", status: "failed", amountMinor: 120_000_00, counterparty: { name: "Sample B." }, createdAt: "2026-10-02T21:45:00.000Z" }),
  sample({ id: "sm-0007", kind: "transfer_in", status: "completed", amountMinor: 30_000_00, createdAt: "2026-10-01T08:30:00.000Z" }),
];

const TOTALS = sumMovements(SAMPLE_MOVEMENTS.filter((m) => m.status === "completed"));

export const WALLET_READS: Record<string, Exclude<BalanceRead, { state: "signed-out" }>> = {
  live: { state: "ready", live: true, figures: FIGURES, movements: SAMPLE_MOVEMENTS, totals: TOTALS, more: false, readAt: NOW_ISO },
  empty: {
    state: "ready",
    live: true,
    figures: {
      available: { minor: 0, confirmedAt: AT },
      protected: { minor: 0, confirmedAt: AT },
      pending: { minor: 0, confirmedAt: null },
      processing: { minor: 0, confirmedAt: null },
      currency: "NGN",
    },
    movements: [],
    totals: { inMinor: 0, outMinor: 0, count: 0 },
    readAt: NOW_ISO,
  },
  stale: { state: "ready", live: false, figures: FIGURES, movements: SAMPLE_MOVEMENTS.slice(1), totals: TOTALS, readAt: NOW_ISO },
  unreachable: BALANCE_READS.unreachable!,
  "not-connected": { state: "not-live", reason: "not_configured" },
  onboarding: BALANCE_READS.onboarding!,
  error: BALANCE_READS.error!,
};

export const SAMPLE_RECIPIENT = { phone: "08000000000", name: "Sample A." };
export const SAMPLE_ACCOUNT = { bankCode: "000", bankName: "Sample Bank", accountNumber: "0000004321", accountName: "SAMPLE MEMBER" };

export const SAMPLE_SEND_QUOTE: Quote = {
  movementId: "sm-q-0001",
  reference: "VL-SAMPLE-Q001",
  breakdown: withdrawalBreakdown({ amountMinor: 45_000_00, providerFeeMinor: 0 }),
  destination: { title: "Sample A.", detail: "A Vallo member" },
  status: "awaiting_confirmation",
};

export const SAMPLE_WITHDRAW_QUOTE: Quote = {
  movementId: "sm-q-0002",
  reference: "VL-SAMPLE-Q002",
  breakdown: withdrawalBreakdown({ amountMinor: 250_000_00, providerFeeMinor: 50_00 }),
  destination: { title: "SAMPLE MEMBER", detail: "Sample Bank •••• 4321" },
  status: "awaiting_confirmation",
};

export const SAMPLE_SENDING: MovementView = sample({
  id: "sm-w-0001",
  kind: "transfer_out",
  status: "processing",
  amountMinor: 45_000_00,
  counterparty: { name: "Sample A." },
  createdAt: "2026-10-07T10:02:00.000Z",
});
