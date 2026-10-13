import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaylukRateGate, type PaylukContext, type PaylukFetch } from "../payments/providers/payluk-client";
import { referenceLine } from "../payments/providers/payluk-arrangements";
import {
  FIXTURE_KEY,
  PAYLUK_FIXTURE_IDS,
  disputedAnswer,
  escrowWebhook,
  resolvedAnswer,
  verifiedHeldAnswer,
  withdrawRefusedAnswer,
  withdrawnAnswer,
} from "../payments/providers/payluk-fixtures";

/*
 * Escrow that works end to end (founder instruction, 13 October 2026): the
 * parts after funding, against answers written from Payluk's documented
 * contract (vendored docs and docs.payluk.ng, read 13 October 2026).
 *
 *   withdraw   a payer moving to card: an UNFUNDED escrow is deleted at the
 *              partner first (seller's customer-id), then Vallo's record is
 *              closed from that answer; a held or moving one is never touched
 *   refund     a person decides: the payer's dispute (buyer's customer-id),
 *              then the merchant's resolve (no customer-id), REFUNDED; the
 *              stay is cancelled through the database's explicit unwind
 *   release    the same road, COMPLETED
 *   reconcile  what the webhook missed is read back, three at most a run
 * Nothing is recorded as moved from Vallo's own ask: every state after
 * "asked" is the partner's answer.
 */

vi.mock("server-only", () => ({}));

const REF = "vallo-arr-0123456789abcdef0123456789abcdef";
const AMOUNT_NAIRA = 500_000;
const FIX = { description: referenceLine(REF), amount: AMOUNT_NAIRA };

type Row = Record<string, unknown> & { status: string };
const state = {
  row: null as Row | null,
  rows: [] as Row[],
  bookingId: "booking-1" as string | null,
  rpcs: [] as { name: string; args: Record<string, unknown> }[],
  audits: [] as Record<string, unknown>[],
  alerts: [] as string[],
  calls: [] as { method: string; path: string; headers: Record<string, string>; body: unknown }[],
  deleteRefused: false,
  gate: "clear",
};

function baseRow(status: string): Row {
  return {
    id: "arr-1",
    agreement_id: "ag-1",
    kind: "standard",
    reference: REF,
    provider_arrangement_id: PAYLUK_FIXTURE_IDS.escrowId,
    provider_payment_token: PAYLUK_FIXTURE_IDS.paymentToken,
    amount_minor: AMOUNT_NAIRA * 100,
    buyer_user_id: "renter",
    seller_user_id: "lister",
    buyer_customer_id: "cust_renter",
    seller_customer_id: "cust_lister",
    status,
  };
}

function fakeDb() {
  const table = (name: string) => {
    const filters: Record<string, unknown> = {};
    const chain = {
      select: () => chain,
      insert: async (row: Record<string, unknown>) => {
        if (name === "audit_log") state.audits.push(row);
        return { data: null, error: null };
      },
      eq: (col: string, val: unknown) => {
        filters[col] = val;
        return chain;
      },
      not: () => chain,
      in: () => chain,
      lt: () => chain,
      order: () => chain,
      limit: () => chain,
      then: (resolve: (v: unknown) => unknown) => resolve({ data: name === "provider_arrangements" ? state.rows : [], error: null }),
      maybeSingle: async () => {
        if (name === "deal_agreements") return { data: { booking_id: state.bookingId }, error: null };
        if (name === "provider_arrangements" && state.row) {
          const entries = Object.entries(filters);
          const ok = entries.every(([col, val]) => state.row![col] === val);
          return { data: ok ? state.row : null, error: null };
        }
        return { data: null, error: null };
      },
    };
    return chain;
  };
  return {
    from: table,
    rpc: async (name: string, args: Record<string, unknown>) => {
      state.rpcs.push({ name, args });
      if (name === "provider_arrangement_observe") {
        const row = state.row!;
        const before = row.status;
        state.row = { ...row, status: String(args.p_to_status) };
        return { data: before === args.p_to_status ? "same" : "changed", error: null };
      }
      if (name === "partner_hold_unwind_cancel") return { data: "ok", error: null };
      if (name === "chargeback_release_gate") return { data: { status: state.gate }, error: null };
      return { data: null, error: { message: "unknown rpc" } };
    },
  } as never;
}

const payluk: PaylukFetch = async (url, init) => {
  const path = new URL(url).pathname;
  state.calls.push({ method: init.method, path, headers: init.headers, body: init.body });
  const reply = (status: number, json: unknown) => ({ status, headers: { get: () => "limit=10, remaining=9, reset=60" }, json: async () => json });
  const { escrowId, paymentToken } = PAYLUK_FIXTURE_IDS;
  if (init.method === "DELETE" && path === `/v1/escrow/delete/${paymentToken}`) {
    return state.deleteRefused ? reply(400, withdrawRefusedAnswer()) : reply(200, withdrawnAnswer());
  }
  if (init.method === "GET" && path === `/v1/escrow/verify/${paymentToken}`) return reply(200, verifiedHeldAnswer(FIX));
  if (init.method === "POST" && path === `/v1/escrow/submit-dispute/${paymentToken}`) return reply(200, disputedAnswer(FIX));
  if (init.method === "POST" && path === `/v1/escrow/dispute/resolve/${escrowId}`) {
    const outcome = (init.body as FormData).get("status") === "COMPLETED" ? "COMPLETED" : "REFUNDED";
    return reply(200, resolvedAnswer(FIX, outcome));
  }
  return reply(404, { status: 404, message: "Not found" });
};

function deps() {
  const ctx: PaylukContext = {
    config: { key: FIXTURE_KEY, baseUrl: "https://staging.api.payluk.ng", environment: "staging" },
    fetch: payluk,
    gate: new PaylukRateGate(() => 0),
  };
  return {
    db: fakeDb(),
    ctx,
    todayLagos: () => "2026-10-13",
    alert: async (kind: string) => {
      state.alerts.push(kind);
    },
  };
}

beforeEach(() => {
  vi.stubEnv("PAYLUK_SECRET_KEY", "");
  vi.stubEnv("PAYLUK_TEST_SECRET_KEY", FIXTURE_KEY);
  /* Recording and unwinding are never gated by the outage stop. */
  vi.stubEnv("PAYMENTS_KILL_PAYLUK", "1");
  state.row = null;
  state.rows = [];
  state.bookingId = "booking-1";
  state.rpcs = [];
  state.gate = "clear";
  state.audits = [];
  state.alerts = [];
  state.calls = [];
  state.deleteRefused = false;
});

describe("a payer moving from escrow to card", () => {
  it("withdraws an unfunded escrow at the partner first, as the seller, then closes Vallo's record from that answer", async () => {
    const { withdrawForCard } = await import("./provider-arrangements");
    state.row = baseRow("awaiting_payment");
    expect(await withdrawForCard(deps(), "ag-1", "renter")).toEqual({ outcome: "withdrawn" });
    expect(state.calls.map((c) => `${c.method} ${c.path}`)).toEqual([`DELETE /v1/escrow/delete/${PAYLUK_FIXTURE_IDS.paymentToken}`]);
    expect(state.calls[0]!.headers["customer-id"]).toBe("cust_lister");
    const observed = state.rpcs.find((r) => r.name === "provider_arrangement_observe")!;
    expect(observed.args).toMatchObject({ p_to_status: "cancelled", p_source: "provider_response" });
    expect(state.row!.status).toBe("cancelled");
  });

  it("when the partner refuses (funded meanwhile), reads it back and records what it says, never cancelled", async () => {
    const { withdrawForCard } = await import("./provider-arrangements");
    state.row = baseRow("awaiting_payment");
    state.deleteRefused = true;
    expect(await withdrawForCard(deps(), "ag-1", "renter")).toEqual({ outcome: "refused", reason: "provider_refused" });
    expect(state.row!.status).toBe("protected");
  });

  it("never touches a held or moving payment, and only the payer may ask", async () => {
    const { withdrawForCard } = await import("./provider-arrangements");
    state.row = baseRow("protected");
    expect(await withdrawForCard(deps(), "ag-1", "renter")).toEqual({ outcome: "refused", reason: "held" });
    state.row = baseRow("payment_processing");
    expect(await withdrawForCard(deps(), "ag-1", "renter")).toEqual({ outcome: "refused", reason: "moving" });
    state.row = baseRow("awaiting_payment");
    expect(await withdrawForCard(deps(), "ag-1", "lister")).toEqual({ outcome: "refused", reason: "not_found" });
    expect(state.calls).toHaveLength(0);
  });

  it("with no escrow opened there is nothing to withdraw", async () => {
    const { withdrawForCard } = await import("./provider-arrangements");
    expect(await withdrawForCard(deps(), "ag-1", "renter")).toEqual({ outcome: "nothing_to_withdraw" });
  });
});

describe("a person at Vallo deciding a held payment", () => {
  it("refund: the payer's dispute, then the merchant's resolve, then the stay is unwound", async () => {
    const { staffResolve } = await import("./provider-arrangements");
    state.row = baseRow("protected");
    expect(await staffResolve(deps(), "arr-1", "REFUNDED", "The host cancelled the stay.", "staff-1")).toEqual({
      outcome: "submitted",
      to: "refunded",
    });
    const [dispute, resolve] = state.calls;
    expect(`${dispute!.method} ${dispute!.path}`).toBe(`POST /v1/escrow/submit-dispute/${PAYLUK_FIXTURE_IDS.paymentToken}`);
    expect(dispute!.headers["customer-id"]).toBe("cust_renter");
    expect((dispute!.body as FormData).get("message")).toContain("The host cancelled the stay.");
    expect(`${resolve!.method} ${resolve!.path}`).toBe(`POST /v1/escrow/dispute/resolve/${PAYLUK_FIXTURE_IDS.escrowId}`);
    expect(resolve!.headers["customer-id"]).toBeUndefined();
    expect((resolve!.body as FormData).get("status")).toBe("REFUNDED");
    expect(state.row!.status).toBe("refunded");
    expect(state.rpcs.find((r) => r.name === "partner_hold_unwind_cancel")?.args).toMatchObject({ p_booking: "booking-1" });
    expect(state.audits[0]).toMatchObject({ actor_id: "staff-1", action: "arrangement.refund_decided" });
  });

  it("release: the same road, COMPLETED, and nothing is cancelled", async () => {
    const { staffResolve } = await import("./provider-arrangements");
    state.row = baseRow("protected");
    expect(await staffResolve(deps(), "arr-1", "COMPLETED", "The guest checked in as agreed.", "staff-1")).toEqual({
      outcome: "submitted",
      to: "released",
    });
    expect((state.calls[1]!.body as FormData).get("status")).toBe("COMPLETED");
    expect(state.row!.status).toBe("released");
    expect(state.rpcs.some((r) => r.name === "partner_hold_unwind_cancel")).toBe(false);
  });

  it("the payout rule: a staff release to a held lister is refused before the partner is asked; a refund is not held", async () => {
    const { staffResolve } = await import("./provider-arrangements");
    state.row = baseRow("protected");
    state.gate = "held";
    expect(await staffResolve(deps(), "arr-1", "COMPLETED", "The guest checked in as agreed.", "staff-1")).toEqual({
      outcome: "refused",
      reason: "chargeback_hold",
    });
    expect(state.calls).toHaveLength(0);
    expect(state.row!.status).toBe("protected");
    expect(await staffResolve(deps(), "arr-1", "REFUNDED", "The host cancelled the stay.", "staff-1")).toMatchObject({ outcome: "submitted" });
    expect(state.rpcs.filter((r) => r.name === "chargeback_release_gate")).toHaveLength(1);
  });

  it("an already disputed payment goes straight to the resolve", async () => {
    const { staffResolve } = await import("./provider-arrangements");
    state.row = baseRow("disputed");
    await staffResolve(deps(), "arr-1", "REFUNDED", "Refund agreed by both.", "staff-1");
    expect(state.calls.map((c) => c.path)).toEqual([`/v1/escrow/dispute/resolve/${PAYLUK_FIXTURE_IDS.escrowId}`]);
  });

  it("refuses what is not held, and asks nothing", async () => {
    const { staffResolve } = await import("./provider-arrangements");
    state.row = baseRow("awaiting_payment");
    expect(await staffResolve(deps(), "arr-1", "REFUNDED", "Nothing to refund yet.", "staff-1")).toEqual({
      outcome: "refused",
      reason: "not_held",
    });
    expect(state.calls).toHaveLength(0);
  });
});

describe("the partner's own reports", () => {
  it("escrow.refunded on a stay cancels it through the explicit unwind, even with the outage stop on", async () => {
    const { applyArrangementWebhook } = await import("./provider-arrangements");
    state.row = baseRow("disputed");
    const event = escrowWebhook("escrow.refunded", FIX);
    expect(await applyArrangementWebhook(deps(), event.data, `escrow:${PAYLUK_FIXTURE_IDS.escrowId}:escrow.refunded`)).toBe("changed");
    expect(state.row!.status).toBe("refunded");
    expect(state.rpcs.find((r) => r.name === "partner_hold_unwind_cancel")).toBeTruthy();
  });

  it("a rental has no stay to cancel: the refund is recorded and nothing else moves", async () => {
    const { applyArrangementWebhook } = await import("./provider-arrangements");
    state.row = baseRow("disputed");
    state.bookingId = null;
    const event = escrowWebhook("escrow.refunded", FIX);
    expect(await applyArrangementWebhook(deps(), event.data, "k")).toBe("changed");
    expect(state.rpcs.some((r) => r.name === "partner_hold_unwind_cancel")).toBe(false);
  });

  it("reconciliation reads back what is still waiting on the partner, and records its answer", async () => {
    const { reconcileArrangements } = await import("./provider-arrangements");
    state.row = baseRow("payment_processing");
    state.rows = [baseRow("payment_processing")];
    expect(await reconcileArrangements(deps(), 3)).toEqual({ read: 1, moved: 1, skipped: 0, failed: 0 });
    expect(state.calls.map((c) => `${c.method} ${c.path}`)).toEqual([`GET /v1/escrow/verify/${PAYLUK_FIXTURE_IDS.paymentToken}`]);
    expect(state.row!.status).toBe("protected");
  });

  it("recording needs the key only, never the switch", async () => {
    const { arrangementsRecordable } = await import("./provider-arrangements");
    expect(arrangementsRecordable({ PAYLUK_TEST_SECRET_KEY: FIXTURE_KEY, PAYMENTS_KILL_PAYLUK: "1" })).toBe(true);
    expect(arrangementsRecordable({})).toBe(false);
  });
});
