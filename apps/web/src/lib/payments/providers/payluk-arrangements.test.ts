import { describe, expect, it } from "vitest";
import { PaylukRateGate, type PaylukContext, type PaylukFetch } from "./payluk-client";
import {
  buyerOwesMinor,
  confirmMilestone,
  confirmRelease,
  createMilestoneArrangement,
  createStandardArrangement,
  findArrangement,
  fundArrangement,
  parseArrangement,
  referenceLine,
} from "./payluk-arrangements";

/*
 * Bodies follow Payluk's own pages in docs/payments/payluk-source/
 * (create-escrow, create-milestone-escrow, list-escrow-transactions,
 * pay-escrow-buy, buyer-confirm-payment-standard, confirm-milestone).
 */

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown; multipart: boolean };

function harness(answers: Array<{ status: number; body?: unknown } | "network">) {
  const calls: Call[] = [];
  let i = 0;
  const fetch: PaylukFetch = async (url, init) => {
    const multipart = init.body instanceof FormData;
    const body = typeof init.body === "string" ? JSON.parse(init.body) : multipart ? Object.fromEntries(init.body as FormData) : undefined;
    calls.push({ url, method: init.method, headers: init.headers, body, multipart });
    const a = answers[Math.min(i++, answers.length - 1)]!;
    if (a === "network") throw new Error("socket hang up");
    return {
      status: a.status,
      headers: { get: (n: string) => (n === "RateLimit" ? "limit=10, remaining=9, reset=60" : null) },
      json: async () => a.body,
    };
  };
  const ctx: PaylukContext = {
    config: { key: "sk_test_abc", baseUrl: "https://staging.api.payluk.ng", environment: "staging" },
    fetch,
    gate: new PaylukRateGate(() => 0),
  };
  return { ctx, calls };
}

const REF = "vallo-arr-0123456789abcdef0123456789abcdef";
const TERMS = { reference: REF, amountMinor: 50_000_000, purpose: "Rent, 12 Bourdillon Road", whoPays: "seller" as const, windowDays: 13 };

const escrow = (over: Record<string, unknown> = {}) => ({
  id: "665f1b2c9a1e4d0012ab3c10",
  amount: 500000,
  purpose: "Rent, 12 Bourdillon Road",
  description: referenceLine(REF),
  whoPays: "seller",
  fee: 10000,
  additionalFee: 0,
  paymentToken: "PY_8AB12C9D3045",
  status: "PENDING",
  state: "AWAITING_PAYMENT",
  settlementType: "STANDARD",
  milestones: null,
  ...over,
});

describe("standard arrangement (POST /v1/escrow/create)", () => {
  it("sends multipart naira as the seller, with Vallo's reference in the description", async () => {
    const { ctx, calls } = harness([{ status: 201, body: { status: 201, message: "ok", data: escrow() } }]);
    const r = await createStandardArrangement(ctx, "seller_1", TERMS);
    expect(r.ok && r.value.id).toBe("665f1b2c9a1e4d0012ab3c10");
    const call = calls[0]!;
    expect(call.url).toBe("https://staging.api.payluk.ng/v1/escrow/create");
    expect(call.headers["customer-id"]).toBe("seller_1");
    expect(call.multipart).toBe(true);
    expect(call.body).toMatchObject({
      amount: "500000", // 50,000,000 kobo is 500,000 naira: never kobo at the boundary
      whoPays: "seller",
      maxDelivery: "13",
      deliveryTimeline: "days",
      totalQuantity: "1",
      description: `Vallo reference ${REF}`,
    });
  });

  it("an unanswered create is UNKNOWN, never failed, and is not retried", async () => {
    const { ctx, calls } = harness(["network"]);
    const r = await createStandardArrangement(ctx, "seller_1", TERMS);
    expect(!r.ok && r.kind).toBe("unknown");
    expect(calls).toHaveLength(1);
  });

  it("an answer for another amount is UNKNOWN (a person reads it)", async () => {
    const { ctx } = harness([{ status: 201, body: { status: 201, message: "ok", data: escrow({ amount: 5000 }) } }]);
    const r = await createStandardArrangement(ctx, "seller_1", TERMS);
    expect(!r.ok && r.kind).toBe("unknown");
  });

  it("refuses below the provider minimum without calling", async () => {
    const { ctx, calls } = harness([{ status: 201, body: {} }]);
    const r = await createStandardArrangement(ctx, "seller_1", { ...TERMS, amountMinor: 99_999 });
    expect(!r.ok && r.kind).toBe("refused");
    expect(calls).toHaveLength(0);
  });
});

describe("milestone arrangement (POST /v1/escrow/milestone/create)", () => {
  const milestones = [
    { title: "First rent", amountMinor: 20_000_000 },
    { title: "Balance at handover", amountMinor: 30_000_000 },
  ];

  it("sends JSON milestones in naira that sum to the amount", async () => {
    const data = escrow({
      settlementType: "MILESTONE",
      milestones: [
        { id: "m1", title: "First rent", amount: 200000, status: "PENDING", releasedAt: null },
        { id: "m2", title: "Balance at handover", amount: 300000, status: "PENDING", releasedAt: null },
      ],
    });
    const { ctx, calls } = harness([{ status: 201, body: { status: 201, message: "ok", data } }]);
    const r = await createMilestoneArrangement(ctx, "seller_1", { ...TERMS, milestones });
    expect(r.ok && r.value.milestones.map((m) => m.amountMinor)).toEqual([20_000_000, 30_000_000]);
    expect(calls[0]!.multipart).toBe(false);
    expect(calls[0]!.body).toMatchObject({ amount: 500000, milestones: [{ amount: 200000 }, { amount: 300000 }] });
  });

  it("refuses a sum that is not the amount, and a single milestone, before calling", async () => {
    const { ctx, calls } = harness([{ status: 201, body: {} }]);
    expect((await createMilestoneArrangement(ctx, "s", { ...TERMS, milestones: [milestones[0]!, milestones[0]!] })).ok).toBe(false);
    expect((await createMilestoneArrangement(ctx, "s", { ...TERMS, milestones: [{ title: "All", amountMinor: 50_000_000 }] })).ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
});

describe("read back (GET /v1/escrow/transactions?type=sales)", () => {
  it("finds the escrow by reference and amount only", async () => {
    const list = { data: [escrow({ id: "other", description: "Vallo reference vallo-arr-ffffffffffffffffffffffffffffffff" }), escrow()] };
    const { ctx, calls } = harness([{ status: 200, body: { status: 200, message: "ok", data: list } }]);
    const r = await findArrangement(ctx, "seller_1", { reference: REF, amountMinor: 50_000_000 });
    expect(r.ok && r.value?.id).toBe("665f1b2c9a1e4d0012ab3c10");
    expect(calls[0]!.url).toContain("type=sales");
    expect(calls[0]!.headers["customer-id"]).toBe("seller_1");
  });

  it("not there is null (stay UNKNOWN), and two carrying one reference is a contradiction", async () => {
    const none = harness([{ status: 200, body: { status: 200, message: "ok", data: { data: [] } } }]);
    const r1 = await findArrangement(none.ctx, "s", { reference: REF, amountMinor: 50_000_000 });
    expect(r1.ok && r1.value).toBeNull();
    const two = harness([{ status: 200, body: { status: 200, message: "ok", data: { data: [escrow(), escrow({ id: "x" })] } } }]);
    const r2 = await findArrangement(two.ctx, "s", { reference: REF, amountMinor: 50_000_000 });
    expect(!r2.ok && r2.kind).toBe("unknown");
  });
});

describe("funding (POST /v1/payment/escrow)", () => {
  it("the buyer owes the amount plus their fee share plus any additional fee", () => {
    const a = parseArrangement(escrow({ fee: 10000, additionalFee: 2500 }))!;
    expect(buyerOwesMinor({ ...a, whoPays: "seller" })).toBe(50_000_000 + 250_000);
    expect(buyerOwesMinor({ ...a, whoPays: "buyer" })).toBe(50_000_000 + 1_000_000 + 250_000);
    expect(buyerOwesMinor({ ...a, whoPays: "both" })).toBe(50_000_000 + 500_000 + 250_000);
    // Half a kobo is not guessed.
    expect(buyerOwesMinor({ ...a, whoPays: "both", feeMinor: 3 })).toBeNull();
  });

  it("funds from the buyer's balance with Vallo's reference", async () => {
    const { ctx, calls } = harness([{ status: 200, body: { status: 200, message: "ok", data: { reference: `${REF}-pay`, status: "success" } } }]);
    const r = await fundArrangement(ctx, "buyer_1", { arrangementId: "665f", reference: `${REF}-pay`, owedMinor: 50_250_000 });
    expect(r.ok).toBe(true);
    expect(calls[0]!.headers["customer-id"]).toBe("buyer_1");
    expect(calls[0]!.body).toEqual({
      amount: 502500,
      reference: `${REF}-pay`,
      transactionType: "escrow",
      gateway: "wallet",
      escrowDetails: { escrowId: "665f" },
    });
  });

  it("a 5xx on funding is UNKNOWN, never failed", async () => {
    const { ctx } = harness([{ status: 500, body: { status: 500, message: "boom" } }]);
    const r = await fundArrangement(ctx, "b", { arrangementId: "e", reference: "r", owedMinor: 100_000 });
    expect(!r.ok && r.kind).toBe("unknown");
  });
});

describe("release (buyer confirms)", () => {
  it("standard and milestone confirmations name the escrow, and act as the buyer", async () => {
    const { ctx, calls } = harness([{ status: 200, body: { status: 200, message: "ok", data: {} } }]);
    await confirmRelease(ctx, "buyer_1", "esc_1");
    await confirmMilestone(ctx, "buyer_1", "esc_1", "m2");
    expect(calls.map((c) => c.url)).toEqual([
      "https://staging.api.payluk.ng/v1/escrow/confirm-payment/esc_1",
      "https://staging.api.payluk.ng/v1/escrow/milestone/confirm/esc_1/m2",
    ]);
    expect(calls.every((c) => c.headers["customer-id"] === "buyer_1" && c.method === "POST")).toBe(true);
  });
});
