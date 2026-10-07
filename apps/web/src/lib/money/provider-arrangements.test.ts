import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaylukRateGate, type PaylukContext, type PaylukFetch } from "../payments/providers/payluk-client";
import { referenceLine } from "../payments/providers/payluk-arrangements";

vi.mock("../payments/providers/payluk", () => ({ PAYLUK_ESCROW_FLOWS_BUILT: true }));

const REF = "vallo-arr-0123456789abcdef0123456789abcdef";
const ROW = {
  id: "arr-1",
  agreement_id: "ag-1",
  kind: "standard",
  reference: REF,
  provider_arrangement_id: null as string | null,
  provider_payment_token: null as string | null,
  amount_minor: 50_000_000,
  buyer_user_id: "renter",
  seller_user_id: "lister",
  buyer_customer_id: "cust_b",
  seller_customer_id: "cust_s",
  status: "preparing",
};

const state = {
  flag: true,
  row: { ...ROW },
  openAnswer: { status: "ok", id: "arr-1", reference: REF } as Record<string, unknown>,
  rpcs: [] as { name: string; args: Record<string, unknown> }[],
  alerts: [] as string[],
};

/** A stand-in for the service-role client: just the chains this module uses. */
function fakeDb() {
  const table = (name: string) => {
    const filters: Record<string, unknown> = {};
    const chain = {
      select: () => chain,
      update: () => chain,
      eq: (col: string, val: unknown) => {
        filters[col] = val;
        return chain;
      },
      maybeSingle: async () => {
        if (name === "feature_flags") return { data: { enabled: state.flag }, error: null };
        if (name === "deal_agreements") return { data: { terms: { move_in: "2026-10-17" } }, error: null };
        if (name === "provider_arrangements") {
          const [col, val] = Object.entries(filters)[0]!;
          return { data: (state.row as Record<string, unknown>)[col] === val ? state.row : null, error: null };
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
      if (name === "provider_arrangement_open") return { data: state.openAnswer, error: null };
      if (name === "provider_arrangement_observe") {
        state.row = { ...state.row, status: String(args.p_to_status) };
        return { data: "changed", error: null };
      }
      return { data: null, error: { message: "unknown rpc" } };
    },
  } as never;
}

function harness(answers: Array<{ status: number; body?: unknown } | "network">) {
  const calls: { url: string; method: string }[] = [];
  let i = 0;
  const fetch: PaylukFetch = async (url, init) => {
    calls.push({ url, method: init.method });
    const a = answers[Math.min(i++, answers.length - 1)]!;
    if (a === "network") throw new Error("socket hang up");
    return { status: a.status, headers: { get: () => null }, json: async () => a.body };
  };
  const ctx: PaylukContext = {
    config: { key: "sk_test_abc", baseUrl: "https://staging.api.payluk.ng", environment: "staging" },
    fetch,
    gate: new PaylukRateGate(() => 0),
  };
  const deps = {
    db: fakeDb(),
    ctx,
    todayLagos: () => "2026-10-07",
    alert: async (kind: string) => {
      state.alerts.push(kind);
    },
  };
  return { deps, calls };
}

const escrow = (over: Record<string, unknown> = {}) => ({
  id: "esc_1",
  amount: 500000,
  description: referenceLine(REF),
  whoPays: "seller",
  fee: 10000,
  paymentToken: "PY_1",
  status: "PENDING",
  state: "AWAITING_PAYMENT",
  ...over,
});

beforeEach(() => {
  state.flag = true;
  state.row = { ...ROW };
  state.openAnswer = { status: "ok", id: "arr-1", reference: REF };
  state.rpcs = [];
  state.alerts = [];
});

const OPEN = { agreementId: "ag-1", kind: "standard" as const, purpose: "Rent" };

describe("protected rental payments (D73 Part B)", () => {
  it("refuses with the switch off, before any record or call", async () => {
    state.flag = false;
    const { openArrangement } = await import("./provider-arrangements");
    const { deps, calls } = harness([]);
    expect(await openArrangement(deps, OPEN)).toEqual({ outcome: "refused", reason: "switched_off" });
    expect(state.rpcs).toHaveLength(0);
    expect(calls).toHaveLength(0);
  });

  it("opens: the provider's answer makes it awaiting_payment", async () => {
    const { openArrangement } = await import("./provider-arrangements");
    const { deps, calls } = harness([{ status: 201, body: { status: 201, message: "ok", data: escrow() } }]);
    const r = await openArrangement(deps, OPEN);
    expect(r).toMatchObject({ outcome: "arranged", status: "awaiting_payment" });
    expect(calls).toHaveLength(1);
    // The lister bears Payluk's fee (VALLO_PRICING section 6); the open names no payer.
    expect(state.rpcs.find((c) => c.name === "provider_arrangement_open")!.args).not.toHaveProperty("p_who_pays_fee");
    const observed = state.rpcs.find((c) => c.name === "provider_arrangement_observe")!;
    expect(observed.args).toMatchObject({
      p_to_status: "awaiting_payment",
      p_source: "provider_response",
      p_provider_arrangement_id: "esc_1",
      p_provider_amount_minor: 50_000_000,
    });
  });

  it("an unanswered create is recorded UNKNOWN with an alert, and is not retried", async () => {
    const { openArrangement } = await import("./provider-arrangements");
    const { deps, calls } = harness(["network"]);
    const r = await openArrangement(deps, OPEN);
    expect(r).toMatchObject({ outcome: "unknown" });
    expect(calls).toHaveLength(1);
    expect(state.row.status).toBe("unknown");
    expect(state.alerts).toContain("arrangement.create_unknown");
  });

  it("opening again while UNKNOWN reads back by reference; it never creates a second", async () => {
    state.row = { ...ROW, status: "unknown" };
    state.openAnswer = { status: "exists", id: "arr-1", reference: REF, arrangement_status: "unknown" };
    const { openArrangement } = await import("./provider-arrangements");
    const { deps, calls } = harness([{ status: 200, body: { status: 200, message: "ok", data: { data: [escrow()] } } }]);
    const r = await openArrangement(deps, OPEN);
    expect(r).toMatchObject({ outcome: "existing", status: "awaiting_payment" });
    expect(calls.map((c) => c.method)).toEqual(["GET"]);
    expect(calls[0]!.url).toContain("/v1/escrow/transactions");
  });

  it("an escrow webhook moves the record by the provider's status", async () => {
    state.row = { ...ROW, status: "awaiting_payment", provider_arrangement_id: "esc_1", provider_payment_token: "PY_1" };
    const { applyArrangementWebhook } = await import("./provider-arrangements");
    const { deps } = harness([]);
    const v = await applyArrangementWebhook(deps, escrow({ status: "ONGOING", state: "OPENED" }), "escrow:esc_1:escrow.ongoing");
    expect(v).toBe("changed");
    expect(state.row.status).toBe("protected");
    const observed = state.rpcs.at(-1)!;
    expect(observed.args).toMatchObject({ p_source: "provider_webhook", p_provider_event_key: "escrow:esc_1:escrow.ongoing" });
  });

  it("an escrow Vallo does not know is ignored, not invented", async () => {
    const { applyArrangementWebhook } = await import("./provider-arrangements");
    const { deps } = harness([]);
    const v = await applyArrangementWebhook(deps, escrow({ id: "stranger", description: "someone else's" }), "k");
    expect(v).toBe("unknown_arrangement");
    expect(state.rpcs).toHaveLength(0);
  });

  it("only the renter can pay or release, and only from the right state", async () => {
    state.row = { ...ROW, status: "awaiting_payment", provider_arrangement_id: "esc_1", provider_payment_token: "PY_1" };
    const { payArrangement, requestRelease } = await import("./provider-arrangements");
    const { deps, calls } = harness([]);
    expect(await payArrangement(deps, "arr-1", "lister")).toEqual({ outcome: "refused", reason: "not_found" });
    expect(await requestRelease(deps, "arr-1", "renter")).toEqual({ outcome: "refused", reason: "not_releasable:awaiting_payment" });
    expect(calls).toHaveLength(0);
  });

  it("release: the renter's confirmation is asked of the provider, and the webhook decides", async () => {
    state.row = { ...ROW, status: "protected", provider_arrangement_id: "esc_1", provider_payment_token: "PY_1" };
    const { requestRelease } = await import("./provider-arrangements");
    const { deps, calls } = harness([{ status: 200, body: { status: 200, message: "ok", data: {} } }]);
    expect(await requestRelease(deps, "arr-1", "renter")).toEqual({ outcome: "submitted" });
    expect(state.row.status).toBe("release_requested");
    expect(calls[0]!.url).toContain("/v1/escrow/confirm-payment/esc_1");
  });
});
