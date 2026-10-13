import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  openCheckout: vi.fn(),
  assertProviderEnabled: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/payments/observability", () => ({ logMoney: vi.fn() }));
vi.mock("@/lib/money/audit", () => ({ recordMoneyAudit: vi.fn(async () => undefined) }));
vi.mock("@/lib/payments/providers", () => {
  class FiatProviderDisabled extends Error {}
  return {
    FiatProviderDisabled,
    assertProviderEnabled: mocks.assertProviderEnabled,
    openCheckout: mocks.openCheckout,
    paystackSeam: () => ({ id: "paystack" }),
  };
});

import { PaystackError, PaystackUnknownOutcome } from "@/lib/payments/paystack";
import { FiatProviderDisabled } from "@/lib/payments/providers";
import { openPromotionPurchase } from "./purchase";
import { handlePromotionChargeFailed, handlePromotionChargeSuccess } from "./webhook";
import { isPromotionReference } from "./reference";

const REF = "rm-promo-11111111-2222-4333-8444-555555555555";

function fakeAdmin(responses: Record<string, unknown>) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const admin = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      const r = responses[fn];
      if (r instanceof Error) return { data: null, error: { message: r.message } };
      return { data: r ?? null, error: null };
    },
    from: () => ({ insert: async () => ({}) }),
  };
  return { admin: admin as never, calls };
}

const openRow = { ok: true, purchase_id: "11111111-2222-4333-8444-555555555555", reference: REF, amount_minor: 250000, currency: "NGN" };
const input = { memberId: "m", email: "a@b.c", listingId: "l", tier: "boost", callbackUrl: "https://x/cb" };

beforeEach(() => {
  mocks.openCheckout.mockReset();
  mocks.assertProviderEnabled.mockReset().mockResolvedValue(undefined);
});

describe("openPromotionPurchase", () => {
  it("charges the database's frozen amount, with no split, and marks pending", async () => {
    mocks.openCheckout.mockResolvedValue({ reference: REF, authorizationUrl: "https://pay", accessCode: "ac" });
    const { admin, calls } = fakeAdmin({ promotion_purchase_open: openRow, promotion_purchase_mark: true });
    const out = await openPromotionPurchase(admin, input);
    expect(out).toMatchObject({ ok: true, amountMinor: 250000, reference: REF });
    const sent = mocks.openCheckout.mock.calls[0]?.[1];
    expect(sent.amountMinor).toBe(250000);
    expect(sent).not.toHaveProperty("split");
    expect(calls.map((c) => c.fn)).toEqual(["promotion_purchase_open", "promotion_purchase_mark"]);
    expect(calls[1]?.args.p_status).toBe("pending");
    // The client never sends an amount: the RPC takes only member, listing, tier.
    expect(Object.keys(calls[0]?.args ?? {}).sort()).toEqual(["p_listing", "p_member", "p_tier"]);
  });

  it("refuses an unknown tier before touching anything", async () => {
    const { admin, calls } = fakeAdmin({});
    expect(await openPromotionPurchase(admin, { ...input, tier: "gold" })).toEqual({ ok: false, reason: "unknown_tier" });
    expect(calls).toHaveLength(0);
  });

  it("respects the kill switch", async () => {
    mocks.assertProviderEnabled.mockRejectedValue(new FiatProviderDisabled("paystack" as never));
    const { admin, calls } = fakeAdmin({});
    expect(await openPromotionPurchase(admin, input)).toEqual({ ok: false, reason: "payments_paused" });
    expect(calls).toHaveLength(0);
  });

  it("a timeout is unknown, never failed, and no provider text escapes", async () => {
    mocks.openCheckout.mockRejectedValue(new PaystackUnknownOutcome("socket hang up at api.paystack.co"));
    const { admin, calls } = fakeAdmin({ promotion_purchase_open: openRow, promotion_purchase_mark: true });
    const out = await openPromotionPurchase(admin, input);
    expect(out).toEqual({ ok: false, reason: "outcome_unknown" });
    expect(calls[1]?.args.p_status).toBe("unknown");
  });

  it("an explicit refusal is failed and shows a fixed reason", async () => {
    mocks.openCheckout.mockRejectedValue(new PaystackError("Invalid key sk_live_xxx", 401));
    const { admin, calls } = fakeAdmin({ promotion_purchase_open: openRow, promotion_purchase_mark: true });
    const out = await openPromotionPurchase(admin, input);
    expect(out).toEqual({ ok: false, reason: "unavailable" });
    expect(JSON.stringify(out)).not.toMatch(/sk_|Invalid/);
    expect(calls[1]?.args.p_status).toBe("failed");
  });

  it("passes only known database reasons through", async () => {
    const { admin } = fakeAdmin({ promotion_purchase_open: { ok: false, reason: "not_your_listing" } });
    expect(await openPromotionPurchase(admin, input)).toEqual({ ok: false, reason: "not_your_listing" });
    const { admin: a3 } = fakeAdmin({ promotion_purchase_open: { ok: false, reason: "purchase_in_progress" } });
    expect(await openPromotionPurchase(a3, input)).toEqual({ ok: false, reason: "purchase_in_progress" });
    const { admin: a2 } = fakeAdmin({ promotion_purchase_open: { ok: false, reason: "pg: something raw" } });
    expect(await openPromotionPurchase(a2, input)).toEqual({ ok: false, reason: "unavailable" });
  });

  it("refuses a proposed price without opening a checkout", async () => {
    const { admin, calls } = fakeAdmin({ promotion_purchase_open: { ok: false, reason: "price_not_confirmed" } });
    expect(await openPromotionPurchase(admin, input)).toEqual({ ok: false, reason: "price_not_confirmed" });
    expect(mocks.openCheckout).not.toHaveBeenCalled();
    expect(calls.map((c) => c.fn)).toEqual(["promotion_purchase_open"]);
  });
});

describe("promotion webhook", () => {
  it("activates through settle with the processor's amount and currency", async () => {
    const { admin, calls } = fakeAdmin({ promotion_purchase_settle: { outcome: "activated" } });
    const v = await handlePromotionChargeSuccess(admin, { reference: REF, amount: 250000, currency: "NGN" });
    expect(v).toMatchObject({ outcome: "posted", httpStatus: 200 });
    expect(calls[0]).toEqual({ fn: "promotion_purchase_settle", args: { p_reference: REF, p_amount_minor: 250000, p_currency: "NGN" } });
  });

  it("a replay is a duplicate", async () => {
    const { admin } = fakeAdmin({ promotion_purchase_settle: { outcome: "duplicate" } });
    expect((await handlePromotionChargeSuccess(admin, { reference: REF, amount: 250000, currency: "NGN" })).outcome).toBe("duplicate");
  });

  it("a mismatch is decided (200) but alerts the desk", async () => {
    const { admin } = fakeAdmin({ promotion_purchase_settle: { outcome: "mismatch" } });
    expect(await handlePromotionChargeSuccess(admin, { reference: REF, amount: 100, currency: "NGN" })).toMatchObject({
      outcome: "failed",
      httpStatus: 200,
    });
  });

  it("a database error asks Paystack to retry", async () => {
    const { admin } = fakeAdmin({ promotion_purchase_settle: new Error("boom") });
    expect((await handlePromotionChargeSuccess(admin, { reference: REF, amount: 250000, currency: "NGN" })).httpStatus).toBe(500);
  });

  it("charge.failed marks failed", async () => {
    const { admin, calls } = fakeAdmin({ promotion_purchase_mark: true });
    await handlePromotionChargeFailed(admin, { reference: REF });
    expect(calls[0]?.args).toEqual({ p_reference: REF, p_status: "failed" });
  });

  it("only rm-promo-<uuid> is a promotion reference", () => {
    expect(isPromotionReference(REF)).toBe(true);
    expect(isPromotionReference("rm-book-11111111-2222-4333-8444-555555555555")).toBe(false);
  });
});

describe("promotion stays out of ranking and away from the booking flow", () => {
  it("purchase.ts never splits and never imports the booking or escrow paths", () => {
    const src = readFileSync(join(__dirname, "purchase.ts"), "utf8");
    const imports = src.split("\n").filter((l) => l.startsWith("import")).join("\n");
    expect(imports).not.toMatch(/split-attempt|bookings|escrow|payee-subaccount|router/i);
    expect(src).not.toMatch(/\bsplit\s*:/);
  });
});
