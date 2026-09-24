import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * MON-P2-03, as the hourly sweep sees it. A charge the sweep has to post or
 * settle is proof the webhook missed it, but only once the webhook has had
 * time to arrive, and only when this run did the work: a booking charge the
 * webhook already settled is not a miss.
 */
const paystack = vi.hoisted(() => ({
  isPaystackConfigured: vi.fn(() => true),
  listSuccessfulCharges: vi.fn(),
}));
const settlement = vi.hoisted(() => ({ settleBookingCharge: vi.fn() }));
const ledger = vi.hoisted(() => ({ recordFunding: vi.fn(async () => "posted" as const) }));
const alerts = vi.hoisted(() => ({ recordAlert: vi.fn(async () => ({ ok: true, id: null, deduplicated: false })) }));

vi.mock("../payments/paystack", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../payments/paystack")>();
  return { ...actual, ...paystack };
});
vi.mock("../bookings/settlement", () => settlement);
vi.mock("./ledger", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./ledger")>();
  return { ...actual, ...ledger };
});
vi.mock("./audit", () => ({ recordMoneyAudit: vi.fn(async () => {}) }));
vi.mock("../alerts/record", () => alerts);

const { sweepUnrecordedCharges } = await import("./reconciliation");
const { BOOKING_PREFIX, FUND_PREFIX } = await import("../payments/references");

/** Nothing is in the ledger yet: every query answers with no rows. */
function emptyAdmin() {
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "select", "in", "eq"]) chain[m] = () => chain;
  chain["then"] = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
  return chain as never;
}

const FUND = `${FUND_PREFIX}3f2504e0-4f89-11d3-9a0c-0305e82c3301`;
const BOOK = `${BOOKING_PREFIX}3f2504e0-4f89-11d3-9a0c-0305e82c3302`;

function charge(reference: string, minutesAgo: number) {
  return {
    reference,
    amountMinor: 100_000,
    currency: "NGN",
    paidAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    channel: "card",
    customerEmail: null,
    metadata: { user_id: "owner-1", booking_id: "b-1" },
  };
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  alerts.recordAlert.mockClear();
});

describe("the sweep pages on a missed webhook (MON-P2-03)", () => {
  it("pages on a funding it posted that was paid well before the run", async () => {
    paystack.listSuccessfulCharges.mockResolvedValue([charge(FUND, 90)]);
    await sweepUnrecordedCharges(emptyAdmin(), { apply: true });
    expect(alerts.recordAlert).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "payment.webhook.missed", subjectId: FUND }),
    );
  });

  it("does not page on a funding paid seconds before the run", async () => {
    paystack.listSuccessfulCharges.mockResolvedValue([charge(FUND, 1)]);
    await sweepUnrecordedCharges(emptyAdmin(), { apply: true });
    expect(alerts.recordAlert).not.toHaveBeenCalled();
  });

  it("pages on a booking charge this run settled", async () => {
    paystack.listSuccessfulCharges.mockResolvedValue([charge(BOOK, 90)]);
    settlement.settleBookingCharge.mockResolvedValue({ outcome: "settled", bookingId: "b-1" });
    await sweepUnrecordedCharges(emptyAdmin(), { apply: true });
    expect(alerts.recordAlert).toHaveBeenCalledWith(expect.objectContaining({ subjectId: BOOK }));
  });

  it("does not page on a booking charge the webhook had already settled", async () => {
    paystack.listSuccessfulCharges.mockResolvedValue([charge(BOOK, 90)]);
    settlement.settleBookingCharge.mockResolvedValue({ outcome: "already-settled", bookingId: "b-1" });
    await sweepUnrecordedCharges(emptyAdmin(), { apply: true });
    expect(alerts.recordAlert).not.toHaveBeenCalled();
  });
});
