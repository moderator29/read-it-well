import { describe, expect, it } from "vitest";

import {
  floatTransferDeps,
  runRewardsPayout,
  sendOpenedPayout,
  settleFromProvider,
  type OpenResult,
  type PayoutDb,
  type SettleInput,
} from "./referral-payout-core";
import { isRewardsReference, outcomeForEvent, payoutOutcome } from "./referral-transfer";

const REF = "vallo-rw-0123456789abcdef0123456789abcdef";

function fakeDb(open: OpenResult, claim = true) {
  const settled: SettleInput[] = [];
  const opens: unknown[] = [];
  const db: PayoutDb = {
    open: async (i) => {
      opens.push(i);
      return open;
    },
    settle: async (s) => {
      settled.push(s);
      return true;
    },
    claimSend: async () => claim,
  };
  return { db, settled, opens };
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

  it("any non-success from /transfer is unknown, never failed", async () => {
    for (const status of [502, 400, 409]) {
      const { db, settled } = fakeDb(opened);
      const { fetcher } = fakeFetch({ "/transferrecipient": recipientOk, "/transfer": { status, body: { status: false, message: "x" } } });
      await runRewardsPayout({ db, transfer: { secretKey: "k", fetcher } }, member);
      expect(settled[0]?.outcome).toBe("unknown");
    }
  });

  it("a recipient that cannot be made opens nothing and sends nothing", async () => {
    const { db, settled, opens } = fakeDb(opened);
    const { fetcher, calls } = fakeFetch({ "/transferrecipient": "throw" });
    const out = await runRewardsPayout({ db, transfer: { secretKey: "k", fetcher } }, member);
    expect(out).toEqual({ kind: "refused", reason: "error" });
    expect(calls.map((c) => c.url)).toEqual(["/transferrecipient"]);
    expect(opens).toEqual([]);
    expect(settled).toEqual([]);
  });

  it("without the float key nothing is opened or sent", async () => {
    const { db, opens } = fakeDb(opened);
    const out = await runRewardsPayout({ db, transfer: null }, member);
    expect(out).toEqual({ kind: "refused", reason: "not_available" });
    expect(opens).toEqual([]);
  });

  it("the policy flag off answers not available", async () => {
    const { db, settled } = fakeDb({ status: "not_available" });
    const { fetcher, calls } = fakeFetch({ "/transferrecipient": recipientOk });
    const out = await runRewardsPayout({ db, transfer: { secretKey: "k", fetcher } }, member);
    expect(out).toEqual({ kind: "refused", reason: "not_available" });
    expect(calls.map((c) => c.url)).toEqual(["/transferrecipient"]);
    expect(settled).toEqual([]);
  });

  it("the float key is never the main merchant key", () => {
    expect(floatTransferDeps({})).toBeNull();
    expect(floatTransferDeps({ PAYSTACK_FLOAT_SECRET_KEY: "sk_a", PAYSTACK_SECRET_KEY: "sk_a" })).toBeNull();
    expect(floatTransferDeps({ PAYSTACK_FLOAT_SECRET_KEY: "sk_b", PAYSTACK_SECRET_KEY: "sk_a" })).toEqual({ secretKey: "sk_b" });
  });

  it("a released payout is sent from the stored recipient, once", async () => {
    const { db, settled } = fakeDb(opened);
    const { fetcher, calls } = fakeFetch({
      "/transfer": { status: 200, body: { status: true, data: { transfer_code: "TRF_2", status: "pending" } } },
    });
    const payout = { reference: REF, amountMinor: 7000, recipientCode: "RCP_9" };
    expect(await sendOpenedPayout({ db, transfer: { secretKey: "k", fetcher } }, payout)).toBe("processing");
    expect(calls[0]?.body).toMatchObject({ recipient: "RCP_9", reference: REF, amount: 7000 });
    expect(settled.map((s) => s.outcome)).toEqual(["processing"]);

    const claimed = fakeDb(opened, false);
    const second = fakeFetch({});
    expect(await sendOpenedPayout({ db: claimed.db, transfer: { secretKey: "k", fetcher: second.fetcher } }, payout)).toBe("skipped");
    expect(second.calls).toEqual([]);
  });

  it("under review and refusals send nothing", async () => {
    for (const open of [
      { ...opened, status: "under_review" as const },
      { status: "below_minimum" as const },
      { status: "phone_required" as const },
    ]) {
      const { db, settled } = fakeDb(open);
      const { fetcher, calls } = fakeFetch({ "/transferrecipient": recipientOk });
      await runRewardsPayout({ db, transfer: { secretKey: "k", fetcher } }, member);
      // Only the recipient (no money moves); never a transfer.
      expect(calls.map((c) => c.url)).toEqual(["/transferrecipient"]);
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
