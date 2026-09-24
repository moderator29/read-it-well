import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A SECOND TAP ON SEND MUST NOT SEND THE MONEY TWICE.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS ABOUT.
 *
 * `SendFlow` mints an `idempotencyKey` per mount and posts it as a hidden
 * input. `transferSchema` did not name the field, Zod strips what it does not
 * name and says nothing about it, and `transferToUser` never called
 * `withIdempotency` even though this file's subject imports it at the top and
 * uses it for funding. So the key was minted, posted, silently binned, and the
 * only action that moves money between two people ran twice on two taps,
 * under two fresh reference pairs the database had never seen and therefore
 * could not refuse.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS TEST DOES NOT MOCK THE GUARD.
 *
 * `fund-idempotency.test.ts` beside this one mocks `withIdempotency` and
 * asserts it was called with the right scope and subject. That is a fine test
 * of WIRING and it is exactly the kind of test that would have passed while
 * this bug shipped, because the bug was never in the wiring of the guard: it
 * was in a field name on a schema, three files away.
 *
 * So this runs THE REAL GUARD against a faithful in-memory stand-in for its
 * three Postgres functions, and counts the thing that actually matters: how
 * many times the money moved. If the schema stops carrying the field, if the
 * wrapper is removed, if `shouldRecord` is dropped, or if somebody swaps the
 * replay for a refusal, a count changes here and this test says so.
 *
 * The stand-in is faithful in the ways that decide the outcome: a claim is a
 * single insert that only one caller can win, a second claim on a key whose
 * work is still running answers `in_flight`, and a claim on a key whose result
 * was recorded answers `replay` with that result round-tripped through JSON,
 * exactly as Postgres hands it back.
 */

type Claim = { state: "running" } | { state: "done"; result: unknown };

const store = new Map<string, Claim>();
const moves: { out: string; in: string; amount: number }[] = [];

const blockState = vi.hoisted(() => ({ blocked: false }));
const rpc = vi.hoisted(() => ({ callSecurityRpc: vi.fn(), hasServiceRole: vi.fn(() => true) }));
const money = vi.hoisted(() => ({ callMoneyRpc: vi.fn(), readMoneyStatus: vi.fn() }));

vi.mock("../security/service-rpc", () => ({
  callSecurityRpc: rpc.callSecurityRpc,
  hasServiceRole: rpc.hasServiceRole,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Map() }));
vi.mock("../security/money-limits", () => ({ guardMoney: async () => ({ allowed: true }) }));
vi.mock("../flags", () => ({ isFeatureEnabled: async () => true }));
vi.mock("../email/client", () => ({ bestEffortEmail: vi.fn(), sendMessage: vi.fn() }));
vi.mock("../payments/paystack", () => ({
  PaystackError: class extends Error {},
  initializeTransaction: vi.fn(),
  isPaystackConfigured: () => true,
  verifyTransaction: vi.fn(),
  createTransferRecipient: vi.fn(),
  initiateTransfer: vi.fn(),
  resolveAccount: vi.fn(),
  listBanks: vi.fn(),
}));
vi.mock("../payments/yellowcard", () => ({
  createCollection: vi.fn(),
  isYellowCardConfigured: () => false,
  YellowCardError: class extends Error {},
}));
vi.mock("../payments/charge-saved-card", () => ({ chargeSavedCard: vi.fn() }));
vi.mock("./audit", () => ({ recordMoneyAudit: vi.fn() }));
vi.mock("./ledger", () => ({
  availableBalanceMinor: async () => 0,
  displayNameFor: async () => "Ada",
  ensureWalletId: async () => "w",
  findUserByEmail: async () => ({ id: "user-2" }),
  getAdminClient: () => ({
    /* Block rows: user-2 has blocked the sender only when blockedPair says so. */
    from: () => ({
      select: () => ({
        or: () => ({
          limit: async () => ({ data: blockState.blocked ? [{ user_id: "user-2" }] : [], error: null }),
        }),
      }),
    }),
  }),
  postEntry: vi.fn(),
  recordFunding: vi.fn(),
  setEntryStatus: vi.fn(),
  labelTransferLegs: vi.fn(),
}));
vi.mock("./rpc", () => ({
  callMoneyRpc: money.callMoneyRpc,
  readMoneyStatus: money.readMoneyStatus,
}));
vi.mock("./repository", () => ({ readStatement: vi.fn() }));
/* The viewer's own client. "blocked" is the handle social_profiles_select
   hides from this viewer, so it reads as nobody. */
vi.mock("../supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: (_col: string, handle: string) => ({
          maybeSingle: async () => ({
            data: handle === "kofi" ? { user_id: "user-2" } : null,
            error: null,
          }),
        }),
      }),
    }),
  }),
}));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "unconfigured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () => ({
    state: "signed-in",
    user: { id: "user-1", email: "ada@example.invalid", user_metadata: {} },
    supabase: {},
  }),
}));

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(entries)) data.set(k, v);
  return data;
}

const SEND = { recipientEmail: "kofi@example.invalid", amount: "5000" };

beforeEach(() => {
  blockState.blocked = false;
  store.clear();
  moves.length = 0;
  vi.resetModules();

  /* The three idempotency functions, behaving as the SQL does. */
  rpc.hasServiceRole.mockReturnValue(true);
  rpc.callSecurityRpc.mockReset().mockImplementation(async (fn: string, args: Record<string, unknown>) => {
    const id = `${args["scope"]}\u0000${args["subject"]}\u0000${args["key"]}`;
    if (fn === "claim_idempotency") {
      const held = store.get(id);
      if (!held) {
        store.set(id, { state: "running" });
        return { ok: true, data: { state: "fresh", result: null } };
      }
      if (held.state === "running") return { ok: true, data: { state: "in_flight", result: null } };
      /* Postgres hands the recorded value back through JSON, so anything that
         does not survive a round trip must not survive here either. */
      return {
        ok: true,
        data: { state: "replay", result: JSON.parse(JSON.stringify(held.result)) },
      };
    }
    if (fn === "record_idempotency_result") {
      store.set(id, { state: "done", result: args["result"] });
      return { ok: true, data: null };
    }
    if (fn === "release_idempotency") {
      store.delete(id);
      return { ok: true, data: null };
    }
    return { ok: false, data: null };
  });

  /* The money mover, counting every movement it is asked to make. */
  money.callMoneyRpc.mockReset().mockImplementation(async (_admin, _surface, _fn, args) => {
    moves.push({
      out: String(args["out_reference"]),
      in: String(args["in_reference"]),
      amount: Number(args["amount"]),
    });
    return { outcome: "ok", data: { status: "ok" } };
  });
  money.readMoneyStatus.mockReset().mockImplementation((data) => ({
    status: (data as { status: string }).status,
  }));
});

describe("sending money twice on one tap moves it once", () => {
  it("moves the money once and replays the first receipt on the second submit", async () => {
    const { transferToUser } = await import("./actions");

    const first = await transferToUser(
      { ok: true, data: null },
      form({ ...SEND, idempotencyKey: "one-tap" }),
    );
    const second = await transferToUser(
      { ok: true, data: null },
      form({ ...SEND, idempotencyKey: "one-tap" }),
    );

    /* THE COUNT THAT IS THE WHOLE POINT. One movement, not two. */
    expect(moves).toHaveLength(1);
    expect(moves[0]?.amount).toBe(500_000);

    /* And one receipt, the SAME receipt. A person who taps twice is shown
       their transfer, never an error about their transfer. */
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second).toEqual(first);
  });

  it("moves it twice when the person really does send twice, with two keys", async () => {
    const { transferToUser } = await import("./actions");

    await transferToUser({ ok: true, data: null }, form({ ...SEND, idempotencyKey: "tap-one" }));
    await transferToUser({ ok: true, data: null }, form({ ...SEND, idempotencyKey: "tap-two" }));

    /* The guard must not become a rule that a person may only ever send once.
       Two deliberate sends carry two keys and both go through, under two
       different reference pairs. */
    expect(moves).toHaveLength(2);
    expect(moves[0]?.out).not.toBe(moves[1]?.out);
  });

  it("refuses a second submit while the first is still in flight, without moving money", async () => {
    let release: () => void = () => undefined;
    money.callMoneyRpc.mockImplementation(async (_admin, _surface, _fn, args) => {
      moves.push({
        out: String(args["out_reference"]),
        in: String(args["in_reference"]),
        amount: Number(args["amount"]),
      });
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return { outcome: "ok", data: { status: "ok" } };
    });

    const { transferToUser } = await import("./actions");
    const inFlight = transferToUser(
      { ok: true, data: null },
      form({ ...SEND, idempotencyKey: "slow" }),
    );
    /* Let the first call reach the money mover and park there. */
    await vi.waitFor(() => expect(moves).toHaveLength(1));

    const second = await transferToUser(
      { ok: true, data: null },
      form({ ...SEND, idempotencyKey: "slow" }),
    );
    expect(second.ok).toBe(false);
    expect(moves).toHaveLength(1);

    release();
    await inFlight;
    expect(moves).toHaveLength(1);
  });

  it("keeps a refusal retryable rather than replaying it", async () => {
    money.callMoneyRpc.mockResolvedValue({ outcome: "ok", data: { status: "insufficient" } });
    const { transferToUser } = await import("./actions");

    const refused = await transferToUser(
      { ok: true, data: null },
      form({ ...SEND, idempotencyKey: "same-key" }),
    );
    expect(refused.ok).toBe(false);

    /* Topped up, same key, and it must go through. `shouldRecord: r => r.ok`
       is what makes this true: recording a refusal would hand the person the
       same "not enough balance" for the whole fifteen-minute TTL after they
       had fixed it. */
    money.callMoneyRpc.mockImplementation(async (_admin, _surface, _fn, args) => {
      moves.push({
        out: String(args["out_reference"]),
        in: String(args["in_reference"]),
        amount: Number(args["amount"]),
      });
      return { outcome: "ok", data: { status: "ok" } };
    });
    const paid = await transferToUser(
      { ok: true, data: null },
      form({ ...SEND, idempotencyKey: "same-key" }),
    );
    expect(paid.ok).toBe(true);
    expect(moves).toHaveLength(1);
  });

  it("carries the key through the schema, which is where it used to be lost", async () => {
    const { transferSchema } = await import("./schema");
    const parsed = transferSchema.parse({
      recipientEmail: "kofi@example.invalid",
      amount: "5000",
      idempotencyKey: "kept",
    });
    /* The single assertion that would have failed before this fix, and the
       reason the bug was invisible: Zod strips an unnamed key WITHOUT
       ERRORING, so every other test in this suite passed throughout. */
    expect(parsed.idempotencyKey).toBe("kept");
  });

  it("runs unguarded when no key arrives, as a form that has not been updated does", async () => {
    const { transferToUser } = await import("./actions");
    await transferToUser({ ok: true, data: null }, form(SEND));
    await transferToUser({ ok: true, data: null }, form(SEND));
    /* Honest about what is NOT protected: with no key there is nothing to key
       on, and the guard steps aside exactly as it does for funding. This is
       what the withdrawal forms still look like today. */
    expect(moves).toHaveLength(2);
    /* The recipient pace (NEW-A2-04) still counts; no idempotency call is made. */
    const idempotencyCalls = rpc.callSecurityRpc.mock.calls.filter(([fn]) =>
      String(fn).includes("idempotency"),
    );
    expect(idempotencyCalls).toHaveLength(0);
  });
});

describe("sending to an @handle", () => {
  it("resolves the handle as the payer and moves the money to that account", async () => {
    const { transferToUser } = await import("./actions");
    const sent = await transferToUser(
      { ok: true, data: null },
      form({ recipientEmail: "@Kofi", amount: "5000", idempotencyKey: "handle-send" }),
    );
    expect(sent.ok).toBe(true);
    expect(moves).toHaveLength(1);
    expect(money.callMoneyRpc.mock.calls[0]?.[3]).toMatchObject({ recipient_user: "user-2" });
  });

  it("refuses an address whose owner blocked the payer with the no-account answer (NEW-A2-04)", async () => {
    const { transferToUser } = await import("./actions");
    blockState.blocked = true;
    const sent = await transferToUser(
      { ok: true, data: null },
      form({ ...SEND, idempotencyKey: "blocked-email" }),
    );
    expect(sent.ok).toBe(false);
    expect(moves).toHaveLength(0);
    expect(sent.ok ? "" : sent.error).toMatch(/No Vallo account uses that email address or handle/);
  });

  it("refuses a send once the shared recipient-lookup budget is spent, before resolving anybody", async () => {
    const { transferToUser } = await import("./actions");
    const base = rpc.callSecurityRpc.getMockImplementation();
    rpc.callSecurityRpc.mockImplementation(async (fn: string, args: Record<string, unknown>) =>
      fn === "consume_rate_limit" && args["bucket"] === "wallet_recipient_lookup"
        ? { ok: true, data: false }
        : base!(fn, args),
    );
    const sent = await transferToUser(
      { ok: true, data: null },
      form({ ...SEND, idempotencyKey: "paced-send" }),
    );
    expect(sent.ok).toBe(false);
    expect(sent.ok ? "" : sent.error).toMatch(/checked a lot of recipients/);
    expect(moves).toHaveLength(0);
  });

  it("refuses a handle the payer cannot see, and moves nothing", async () => {
    const { transferToUser } = await import("./actions");
    const sent = await transferToUser(
      { ok: true, data: null },
      form({ recipientEmail: "@blocked", amount: "5000", idempotencyKey: "blocked-send" }),
    );
    expect(sent.ok).toBe(false);
    expect(moves).toHaveLength(0);
  });
});

describe("MON-11: the key is tied to what it asks for and to the ledger", () => {
  it("refuses a replay of the same key that asks for a different amount, and moves nothing more", async () => {
    const { transferToUser } = await import("./actions");
    const first = await transferToUser({ ok: true, data: null }, form({ ...SEND, idempotencyKey: "same-key" }));
    const second = await transferToUser(
      { ok: true, data: null },
      form({ ...SEND, amount: "9000", idempotencyKey: "same-key" }),
    );
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.ok ? "" : second.error).toMatch(/already sent something different/);
    expect(moves).toHaveLength(1);
  });

  it("refuses rather than sending unguarded when the key store cannot be asked", async () => {
    rpc.callSecurityRpc.mockImplementation(async () => ({ ok: false, data: null }));
    const { transferToUser } = await import("./actions");
    const sent = await transferToUser({ ok: true, data: null }, form({ ...SEND, idempotencyKey: "store-down" }));
    expect(sent.ok).toBe(false);
    expect(sent.ok ? "" : sent.error).toMatch(/cannot make sure this happens only once/);
    expect(moves).toHaveLength(0);
  });

  it("derives the ledger references from the key, so a retry after the store forgot is a database duplicate", async () => {
    const { transferToUser } = await import("./actions");
    await transferToUser({ ok: true, data: null }, form({ ...SEND, idempotencyKey: "long-lost" }));
    store.clear();
    await transferToUser({ ok: true, data: null }, form({ ...SEND, idempotencyKey: "long-lost" }));
    expect(moves).toHaveLength(2);
    expect(moves[0]?.out).toBe(moves[1]?.out);
    expect(moves[0]?.in).toBe(moves[1]?.in);
    expect(moves[0]?.out).toMatch(/^rm-p2p-[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-out$/);
  });
});

