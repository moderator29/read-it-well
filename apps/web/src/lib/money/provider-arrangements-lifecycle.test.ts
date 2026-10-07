import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaylukRateGate, type PaylukContext, type PaylukFetch } from "../payments/providers/payluk-client";
import { referenceLine } from "../payments/providers/payluk-arrangements";
import {
  FIXTURE_KEY,
  PAYLUK_FIXTURE_IDS,
  confirmedAnswer,
  createdAnswer,
  escrowWebhook,
  fundedAnswer,
  verifiedUnpaidAnswer,
} from "../payments/providers/payluk-fixtures";
import { environmentMatches, parsePaylukWebhook, verifyPaylukSignature } from "../payments/providers/payluk-webhook";

/*
 * D77: one protected payment, end to end, against answers written from Payluk's
 * documented contract (payluk-fixtures.ts). Open, created, fund, ongoing,
 * release, completed; every webhook signed and verified as the route does it.
 * What this cannot prove is listed in docs/payments/MONEY_ARCHITECTURE.md (D77).
 */

vi.mock("server-only", () => ({}));

const REF = "vallo-arr-0123456789abcdef0123456789abcdef";
const AMOUNT_NAIRA = 500_000;
const FIX = { description: referenceLine(REF), amount: AMOUNT_NAIRA };

type Row = Record<string, unknown> & { status: string };
const state = {
  flag: true,
  row: null as Row | null,
  rpcs: [] as { name: string; args: Record<string, unknown> }[],
  alerts: [] as string[],
  calls: [] as { method: string; url: string; body: unknown }[],
};

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
        if (name === "feature_flags") return { data: { enabled: state.flag && filters.key === "payments_payluk_on" }, error: null };
        if (name === "deal_agreements") return { data: { terms: { move_in: "2026-10-17" } }, error: null };
        if (name === "provider_arrangements" && state.row) {
          const [col, val] = Object.entries(filters)[0]!;
          return { data: state.row[col] === val ? state.row : null, error: null };
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
      if (name === "provider_arrangement_open") {
        state.row = {
          id: "arr-1",
          agreement_id: "ag-1",
          kind: "standard",
          reference: REF,
          provider_arrangement_id: null,
          provider_payment_token: null,
          amount_minor: AMOUNT_NAIRA * 100,
          buyer_user_id: "renter",
          seller_user_id: "lister",
          buyer_customer_id: "cust_renter",
          seller_customer_id: "cust_lister",
          status: "preparing",
        };
        return { data: { status: "ok", id: "arr-1", reference: REF }, error: null };
      }
      if (name === "provider_arrangement_observe") {
        const row = state.row!;
        state.row = {
          ...row,
          status: String(args.p_to_status),
          provider_arrangement_id: (args.p_provider_arrangement_id as string | null) ?? row.provider_arrangement_id,
          provider_payment_token: (args.p_provider_payment_token as string | null) ?? row.provider_payment_token,
        };
        return { data: row.status === args.p_to_status ? "same" : "changed", error: null };
      }
      return { data: null, error: { message: "unknown rpc" } };
    },
  } as never;
}

/** Payluk, as documented: answers by method and path. */
const payluk: PaylukFetch = async (url, init) => {
  let body: unknown = init.body;
  if (typeof init.body === "string") body = JSON.parse(init.body);
  state.calls.push({ method: init.method, url, body });
  const path = new URL(url).pathname;
  const reply = (status: number, json: unknown) => ({ status, headers: { get: () => "limit=10, remaining=9, reset=60" }, json: async () => json });
  if (init.method === "POST" && path === "/v1/escrow/create") return reply(201, createdAnswer(FIX));
  if (init.method === "GET" && path === `/v1/escrow/verify/${PAYLUK_FIXTURE_IDS.paymentToken}`) return reply(200, verifiedUnpaidAnswer(FIX));
  if (init.method === "POST" && path === "/v1/payment/escrow") {
    const sent = body as { reference: string; amount: number };
    return reply(200, fundedAnswer({ ...FIX, reference: sent.reference, owed: sent.amount }));
  }
  if (init.method === "POST" && path === `/v1/escrow/confirm-payment/${PAYLUK_FIXTURE_IDS.escrowId}`) return reply(200, confirmedAnswer(FIX));
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
    todayLagos: () => "2026-10-07",
    alert: async (kind: string) => {
      state.alerts.push(kind);
    },
  };
}

/** What the webhook route does before it hands an escrow event over. */
function deliver(event: "escrow.created" | "escrow.ongoing" | "escrow.completed") {
  const raw = JSON.stringify(escrowWebhook(event, FIX));
  const signature = createHmac("sha512", FIXTURE_KEY).update(raw, "utf8").digest("hex");
  expect(verifyPaylukSignature(raw, signature, FIXTURE_KEY)).toBe(true);
  expect(verifyPaylukSignature(raw.replace("500000", "500001"), signature, FIXTURE_KEY)).toBe(false);
  const parsed = parsePaylukWebhook(JSON.parse(raw));
  if (!parsed || parsed.family !== "escrow") throw new Error("not an escrow event");
  expect(environmentMatches(parsed.environment, "staging")).toBe(true);
  expect(environmentMatches(parsed.environment, "production")).toBe(false);
  return { data: (JSON.parse(raw) as { data: unknown }).data, key: parsed.key };
}

beforeEach(() => {
  vi.stubEnv("PAYLUK_SECRET_KEY", "");
  vi.stubEnv("PAYLUK_TEST_SECRET_KEY", FIXTURE_KEY);
  vi.stubEnv("PAYMENTS_KILL_PAYLUK", "");
  state.flag = true;
  state.row = null;
  state.rpcs = [];
  state.alerts = [];
  state.calls = [];
});

describe("a protected payment, end to end, against the documented contract", () => {
  it("open, created, fund, ongoing, release, completed", async () => {
    const { openArrangement, applyArrangementWebhook, payArrangement, requestRelease } = await import("./provider-arrangements");
    const d = deps();

    // Open: multipart create, naira, the lister bears the fee.
    const opened = await openArrangement(d, { agreementId: "ag-1", kind: "standard", purpose: "Rent" });
    expect(opened).toMatchObject({ outcome: "arranged", status: "awaiting_payment" });
    expect(state.row).toMatchObject({ provider_arrangement_id: PAYLUK_FIXTURE_IDS.escrowId, provider_payment_token: PAYLUK_FIXTURE_IDS.paymentToken });
    const create = state.calls[0]!;
    expect(create.method).toBe("POST");
    expect(create.body).toBeInstanceOf(FormData);
    expect((create.body as FormData).get("amount")).toBe(String(AMOUNT_NAIRA));
    expect((create.body as FormData).get("whoPays")).toBe("seller");

    // escrow.created can arrive at any time: it changes nothing already known.
    const created = deliver("escrow.created");
    expect(await applyArrangementWebhook(d, created.data, created.key)).not.toBe("unknown_arrangement");
    expect(state.row!.status).toBe("awaiting_payment");

    // Fund from the renter's Payluk balance: read first, then pay what is owed.
    expect(await payArrangement(d, "arr-1", "lister")).toEqual({ outcome: "refused", reason: "not_found" });
    expect(await payArrangement(d, "arr-1", "renter")).toEqual({ outcome: "submitted" });
    expect(state.row!.status).toBe("payment_processing");
    const fund = state.calls.find((c) => c.url.endsWith("/v1/payment/escrow"))!;
    expect(fund.body).toMatchObject({
      amount: AMOUNT_NAIRA,
      reference: `${REF}-pay`,
      transactionType: "escrow",
      gateway: "wallet",
      escrowDetails: { escrowId: PAYLUK_FIXTURE_IDS.escrowId },
    });

    // escrow.ongoing: the money is held.
    const ongoing = deliver("escrow.ongoing");
    expect(await applyArrangementWebhook(d, ongoing.data, ongoing.key)).toBe("changed");
    expect(state.row!.status).toBe("protected");

    // Release: only the renter, and the provider's webhook decides.
    expect(await requestRelease(d, "arr-1", "lister")).toMatchObject({ outcome: "refused" });
    expect(await requestRelease(d, "arr-1", "renter")).toEqual({ outcome: "submitted" });
    expect(state.row!.status).toBe("release_requested");

    const completed = deliver("escrow.completed");
    expect(await applyArrangementWebhook(d, completed.data, completed.key)).toBe("changed");
    expect(state.row!.status).toBe("released");

    // The same delivery twice moves nothing.
    expect(await applyArrangementWebhook(d, completed.data, completed.key)).not.toBe("changed");
    expect(state.alerts).toEqual([]);
    expect(state.calls.map((c) => `${c.method} ${new URL(c.url).pathname}`)).toEqual([
      "POST /v1/escrow/create",
      `GET /v1/escrow/verify/${PAYLUK_FIXTURE_IDS.paymentToken}`,
      "POST /v1/payment/escrow",
      `POST /v1/escrow/confirm-payment/${PAYLUK_FIXTURE_IDS.escrowId}`,
    ]);
    for (const c of state.calls) expect(c.url.startsWith("https://staging.api.payluk.ng/")).toBe(true);
  });

  it("with the key gone, nothing opens and nothing is called", async () => {
    vi.stubEnv("PAYLUK_TEST_SECRET_KEY", "");
    const { openArrangement } = await import("./provider-arrangements");
    expect(await openArrangement(deps(), { agreementId: "ag-1", kind: "standard", purpose: "Rent" })).toEqual({
      outcome: "refused",
      reason: "switched_off",
    });
    expect(state.calls).toHaveLength(0);
  });
});
