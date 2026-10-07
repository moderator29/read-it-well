import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * PHASE 15: a duplicate webhook must not pay twice, an unsigned one must not
 * write anything, and a signed one is stored raw before it is applied.
 * The database is an in-memory stand-in with the one unique rule that
 * matters here: (provider, event_key) on the webhook log.
 */
type Row = Record<string, unknown>;
const store = vi.hoisted(() => ({ tables: {} as Record<string, Row[]>, observed: [] as unknown[][], nextId: 1 }));

function builder(table: string) {
  const rows = () => (store.tables[table] ??= []);
  let filters: [string, unknown][] = [];
  let pendingInsert: Row | null = null;
  let pendingUpdate: Row | null = null;
  let insertError: { message: string } | null = null;
  const match = () => rows().filter((r) => filters.every(([k, v]) => r[k] === v));
  const api = {
    select: () => api,
    eq: (k: string, v: unknown) => {
      filters.push([k, v]);
      if (pendingUpdate) for (const r of match()) Object.assign(r, pendingUpdate);
      return api;
    },
    insert: (row: Row) => {
      pendingInsert = { id: store.nextId++, ...row };
      if (table === "provider_webhook_events" && rows().some((r) => r.event_key === row.event_key)) {
        insertError = { message: "duplicate key value violates unique constraint" };
      } else rows().push(pendingInsert);
      return api;
    },
    update: (row: Row) => {
      pendingUpdate = row;
      return api;
    },
    maybeSingle: async () => {
      if (pendingInsert) return insertError ? { data: null, error: insertError } : { data: pendingInsert, error: null };
      const found = match()[0] ?? null;
      filters = [];
      return { data: found, error: null };
    },
  };
  return api;
}

vi.mock("@/lib/money/member-wallet", () => ({
  adminDb: () => ({ from: (t: string) => builder(t) }),
  observe: async (...args: unknown[]) => {
    store.observed.push(args);
    return "changed";
  },
}));
vi.mock("@/lib/security/money-limits", () => ({
  ROUTE_FAILURE_LIMITS: { webhookBadSignature: {} },
  countRouteFailure: async () => ({ allowed: true }),
}));
vi.mock("@/lib/alerts", () => ({ recordAlert: async () => ({ ok: true }) }));

const { POST } = await import("./route");

const KEY = "sk_test_probe";
function post(body: string, signature: string | null) {
  return POST(
    new Request("https://vallo.test/api/payluk/webhook", {
      method: "POST",
      headers: signature ? { "x-payluk-signature": signature } : {},
      body,
    }),
  );
}
const sign = (body: string) => createHmac("sha512", KEY).update(body).digest("hex");

const delivery = JSON.stringify({
  event: "payment.withdrawal.success",
  data: { id: "t1", reference: "rm-plw-abc", amount: 50000, fee: 100, status: "success", transactionType: "withdrawal", creditType: "debit", customerId: "cust-a", environment: "test" },
  timestamp: "2026-10-07T10:00:00.000Z",
});

beforeEach(() => {
  store.tables = {
    funds_movements: [{ id: "m1", user_id: "user-a", reference: "rm-plw-abc", amount_minor: 5_000_000 }],
    financial_provider_accounts: [{ user_id: "user-a", provider: "payluk", provider_customer_id: "cust-a" }],
  };
  store.observed = [];
  vi.stubEnv("PAYLUK_SECRET_KEY", "");
  vi.stubEnv("PAYLUK_TEST_SECRET_KEY", KEY);
});

describe("POST /api/payluk/webhook", () => {
  it("refuses an unsigned or mis-signed delivery before writing anything", async () => {
    expect((await post(delivery, null)).status).toBe(401);
    expect((await post(delivery, sign(delivery + "x"))).status).toBe(401);
    expect(store.tables.provider_webhook_events ?? []).toHaveLength(0);
    expect(store.observed).toHaveLength(0);
  });

  it("stores the event raw, then completes the movement from the webhook", async () => {
    const res = await post(delivery, sign(delivery));
    expect(res.status).toBe(200);
    expect(store.tables.provider_webhook_events).toHaveLength(1);
    expect(store.tables.provider_webhook_events![0]).toMatchObject({ event_key: "payment:rm-plw-abc:payment.withdrawal.success", processing_status: "processed" });
    expect(store.observed).toEqual([
      [expect.anything(), "rm-plw-abc", "completed", "provider_webhook", expect.objectContaining({ providerStatus: "success", providerFeeMinor: 10_000 })],
    ]);
  });

  it("a redelivery of a processed event changes nothing", async () => {
    await post(delivery, sign(delivery));
    const again = await post(delivery, sign(delivery));
    expect(await again.json()).toMatchObject({ received: true, duplicate: true });
    expect(store.observed).toHaveLength(1);
    expect(store.tables.provider_webhook_events).toHaveLength(1);
  });

  it("an amount that disagrees with what Vallo asked for goes to review, not to done", async () => {
    store.tables.funds_movements![0]!.amount_minor = 100;
    await post(delivery, sign(delivery));
    expect(store.observed[0]![2]).toBe("under_review");
  });

  it("acknowledges and records an event it does not know, and a live event on a test key", async () => {
    const unknown = JSON.stringify({ event: "vault.closed", data: { id: "v1" } });
    expect((await post(unknown, sign(unknown))).status).toBe(200);
    const live = JSON.stringify({ ...JSON.parse(delivery), data: { ...JSON.parse(delivery).data, environment: "live", reference: "rm-plw-live" } });
    expect(await (await post(live, sign(live))).json()).toMatchObject({ ignored: "environment_mismatch" });
    expect(store.observed).toHaveLength(0);
  });
});
