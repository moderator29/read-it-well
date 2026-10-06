import { describe, expect, it } from "vitest";

import { runRewardsPayout, settleFromProvider, type OpenResult, type PayoutDb, type SettleInput } from "./referral-payout-core";
import { isRewardsReference, outcomeForEvent, payoutOutcome } from "./referral-transfer";

const REF = "vallo-rw-0123456789abcdef0123456789abcdef";

function fakeDb(open: OpenResult) {
  const settled: SettleInput[] = [];
  const db: PayoutDb = {
    open: async () => open,
    settle: async (s) => {
      settled.push(s);
      return true;
    },
  };
  return { db, settled };
}

type Reply = { status: number; body?: unknown } | "throw";

function fakeFetch(replies: Record<string, Reply>) {
  const calls: { url: string; body: unknown }[] = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    const path = url.replace("https://api.paystack.co", "");
    calls.push({ url: path, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const key = Object.keys(replies).find((k) => path.startsWith(k));
    const r: Reply = (key ? replies[key] : undefined) ?? { status: 404, body: { status: false, message: "no" } };
    if (r === "throw") throw new Error("socket");
    return new Response(r.body === undefined ? "" : JSON.stringify(r.body), { status: r.status });
  }) as unknown as typeof fetch;
  return { fetcher, calls };
}

const opened: OpenResult = { status: "processing", payout_id: "p1", reference: REF, amount_minor: 105000 };
const member = { memberId: "m1", bankCode: "058", accountNumber: "0123456789", accountName: "ADA OBI" };
const recipientOk = { status: 200, body: { status: true, data: { recipient_code: "RCP_1" } } };

describe("rewards payout", () => {
  it("sends with the documented fields and is processing, never paid, on acceptance", async () => {
    const { db, settled } = fakeDb(opened);
    const { fetcher, calls } = fakeFetch({
      "/transferrecipient": recipientOk,
      "/transfer": { status: 200, body: { status: true, data: { transfer_code: "TRF_1", status: "success" } } },
    });
    const out = await runRewardsPayout({ db, transfer: { secretKey: "sk_test_x", fetcher } }, member);
    expect(out).toMatchObject({ kind: "ok", status: "processing", amountMinor: 105000 });
    expect(calls[0]?.body).toEqual({ type: "nuban", name: "ADA OBI", account_number: "0123456789", bank_code: "058", currency: "NGN" });
    expect(calls[1]?.body).toEqual({
      source: "balance",
      amount: 105000,
      currency: "NGN",
      recipient: "RCP_1",
      reference: REF,
      reason: "Vallo Rewards Balance",
    });
    expect(settled.map((s) => s.outcome)).toEqual(["processing"]);
  });

  it("a timeout is unknown, never failed", async () => {
    const { db, settled } = fakeDb(opened);
    const { fetcher } = fakeFetch({ "/transferrecipient": recipientOk, "/transfer": "throw" });
    const out = await runRewardsPayout({ db, transfer: { secretKey: "k", fetcher } }, member);
    expect(out).toMatchObject({ status: "unknown" });
    expect(settled.map((s) => s.outcome)).toEqual(["unknown"]);
  });

  it("a 5xx is unknown; a 4xx refusal is failed", async () => {
    for (const [status, expected] of [
      [502, "unknown"],
      [400, "failed"],
    ] as const) {
      const { db, settled } = fakeDb(opened);
      const { fetcher } = fakeFetch({ "/transferrecipient": recipientOk, "/transfer": { status, body: { status: false, message: "x" } } });
      await runRewardsPayout({ db, transfer: { secretKey: "k", fetcher } }, member);
      expect(settled[0]?.outcome).toBe(expected);
    }
  });

  it("a recipient that cannot be made fails cleanly, before any transfer", async () => {
    const { db, settled } = fakeDb(opened);
    const { fetcher, calls } = fakeFetch({ "/transferrecipient": "throw" });
    await runRewardsPayout({ db, transfer: { secretKey: "k", fetcher } }, member);
    expect(calls.map((c) => c.url)).toEqual(["/transferrecipient"]);
    expect(settled[0]?.outcome).toBe("failed");
  });

  it("under review and refusals send nothing", async () => {
    for (const open of [
      { ...opened, status: "under_review" as const },
      { status: "below_minimum" as const },
      { status: "phone_required" as const },
    ]) {
      const { db, settled } = fakeDb(open);
      const { fetcher, calls } = fakeFetch({});
      await runRewardsPayout({ db, transfer: { secretKey: "k", fetcher } }, member);
      expect(calls).toEqual([]);
      expect(settled).toEqual([]);
    }
  });

  it("verify settles paid only on success, and leaves an unanswered question alone", async () => {
    const cases: [Reply, string | null][] = [
      [{ status: 200, body: { status: true, data: { status: "success", transfer_code: "T" } } }, "paid"],
      [{ status: 200, body: { status: true, data: { status: "reversed" } } }, "failed"],
      [{ status: 200, body: { status: true, data: { status: "pending" } } }, null],
      [{ status: 200, body: { status: true, data: { status: "something-new" } } }, null],
      [{ status: 404, body: { status: false, message: "not found" } }, null],
      ["throw", null],
    ];
    for (const [reply, expected] of cases) {
      const { db, settled } = fakeDb(opened);
      const { fetcher, calls } = fakeFetch({ "/transfer/verify/": reply });
      await settleFromProvider({ db, transfer: { secretKey: "k", fetcher } }, REF);
      expect(calls[0]?.url).toBe(`/transfer/verify/${REF}`);
      expect(settled[0]?.outcome ?? null).toBe(expected);
    }
  });

  it("maps statuses and events conservatively", () => {
    expect(payoutOutcome("success")).toBe("paid");
    expect(payoutOutcome("failed")).toBe("failed");
    expect(payoutOutcome("otp")).toBe("processing");
    expect(outcomeForEvent("transfer.success")).toBe("paid");
    expect(outcomeForEvent("transfer.reversed")).toBe("failed");
    expect(outcomeForEvent("charge.success")).toBeNull();
    expect(isRewardsReference(REF)).toBe(true);
    expect(isRewardsReference("rm-wd-123")).toBe(false);
  });
});
