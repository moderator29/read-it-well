import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SENDING WALLET MONEY TO A BANK ACCOUNT, PROVED AT THE SOCKET.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS SUBSTITUTED, AND WHAT IS DELIBERATELY NOT.
 *
 * `outbox-delivery.test.ts` is the standard this follows: substitute NOTHING
 * inside the application except the outermost seam, and assert on the request
 * that would have gone out. So the schema, the resolver
 * (`lib/payments/bank-resolve.ts`), the Paystack client, the money RPC door,
 * `readMoneyStatus`, the observability calls and the real `withIdempotency`
 * guard all run as they ship. The only replacements are:
 *
 *   `globalThis.fetch`   the bank. Every assertion about the processor is an
 *                        assertion about the HTTP request this code built.
 *   the admin client     Postgres. `callMoneyRpc` is real and is handed a
 *                        faithful in-memory `hold_wallet_withdrawal`: one
 *                        hold per reference, a repeat of a reference is
 *                        `duplicate`, and a balance short of the amount is
 *                        `insufficient`.
 *   `claim_idempotency`  the same, for the guard's three functions, exactly
 *   and its two siblings as `transfer-idempotency.test.ts` stands them up.
 *   the session, the flag, the rate limiter, `revalidatePath`, the audit
 *   writer and the email client, none of which decide where money goes.
 *
 * Not substituted, and this is the point: `resolveBankAccountName`,
 * `sameAccountName`, `bankNameForCode` and `resolveAccountNumber`. A test that
 * stubbed the resolver could not tell a real resolve from a remembered one,
 * and "the name is the bank's, never one we stored" is the single claim this
 * whole flow rests on.
 *
 * ---------------------------------------------------------------------------
 * WHY THE SOCKET AND NOT A REAL CALL.
 *
 * `api.paystack.co` is not reachable from this container and this deployment
 * has no live secret key, so stopping at the socket is the furthest an
 * automated test here can honestly go. WHAT LIES BEYOND IT IS UNPROVEN BY THIS
 * FILE: that Paystack accepts these bodies, and that a transfer initiated this
 * way settles. Everything up to and including the bytes on the wire is proved.
 */

/* --------------------------------------------------------------- the seams */

type Hold = { reference: string; amountMinor: number; metadata: unknown };

const holds: Hold[] = [];
const audits: { action: string; detail: unknown }[] = [];
const statusChanges: { reference: string; status: string }[] = [];
let balanceMinor = 0;

type Claim = { state: "running" } | { state: "done"; result: unknown };
const claims = new Map<string, Claim>();

const rpc = vi.hoisted(() => ({ callSecurityRpc: vi.fn(), hasServiceRole: vi.fn(() => true) }));

vi.mock("../security/service-rpc", () => ({
  callSecurityRpc: rpc.callSecurityRpc,
  hasServiceRole: rpc.hasServiceRole,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Map() }));
vi.mock("../security/money-limits", () => ({ guardMoney: async () => ({ allowed: true }) }));
vi.mock("../flags", () => ({ isFeatureEnabled: async () => true }));
vi.mock("../email/client", () => ({ bestEffortEmail: vi.fn(), sendMessage: vi.fn() }));
vi.mock("../payments/yellowcard", () => ({
  createCollection: vi.fn(),
  isYellowCardConfigured: () => false,
  YellowCardError: class extends Error {},
}));
vi.mock("../payments/charge-saved-card", () => ({ chargeSavedCard: vi.fn() }));
vi.mock("./repository", () => ({ readStatement: vi.fn() }));
vi.mock("./audit", () => ({
  recordMoneyAudit: async (_client: unknown, entry: { action: string; detail?: unknown }) => {
    audits.push({ action: entry.action, detail: entry.detail });
  },
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

/**
 * Postgres, as far as this path can see it. `callMoneyRpc` is the real one and
 * this is the client it calls, so the shape of the answer, the reading of it
 * by `readMoneyStatus` and the duplicate and insufficient branches are all the
 * shipped code.
 */
const adminClient = {
  rpc: async (fn: string, args: Record<string, unknown>) => {
    if (fn !== "hold_wallet_withdrawal") return { data: null, error: { code: "42883" } };
    const reference = String(args["hold_reference"]);
    const amount = Number(args["amount"]);
    if (holds.some((h) => h.reference === reference)) {
      return { data: { status: "duplicate", available_minor: balanceMinor, wallet_id: "w1" }, error: null };
    }
    const outstanding = holds.reduce((sum, h) => sum + h.amountMinor, 0);
    if (amount > balanceMinor - outstanding) {
      return {
        data: { status: "insufficient", available_minor: balanceMinor - outstanding, wallet_id: "w1" },
        error: null,
      };
    }
    holds.push({ reference, amountMinor: amount, metadata: args["hold_metadata"] });
    return { data: { status: "ok", available_minor: balanceMinor - outstanding - amount, wallet_id: "w1" }, error: null };
  },
};

vi.mock("./ledger", () => ({
  availableBalanceMinor: async () => balanceMinor,
  displayNameFor: async () => "Ada",
  ensureWalletId: async () => "w1",
  findUserByEmail: async () => null,
  getAdminClient: () => adminClient,
  postEntry: vi.fn(),
  recordFunding: vi.fn(),
  setEntryStatus: async (_c: unknown, reference: string, status: string) => {
    statusChanges.push({ reference, status });
  },
  labelTransferLegs: vi.fn(),
}));

/* ------------------------------------------------------------- the bank */

type Call = { url: string; method: string; body: Record<string, unknown> | null; auth: string | null };

const calls: Call[] = [];

/** What the bank says a given NUBAN resolves to, per test. */
let resolveAnswers: string[] = [];
/** When true, /bank/resolve answers the way Paystack answers an unknown account. */
let resolveRefuses = false;
/** When true, /transfer answers with a declined envelope. */
let transferRefuses = false;

const REGISTRY = [
  { name: "Guaranty Trust Bank", code: "058", slug: "gtb" },
  { name: "Kuda Microfinance Bank", code: "50211", slug: "kuda" },
  { name: "Sparkle Microfinance Bank", code: "51310", slug: "sparkle" },
];

function envelope(data: unknown): Response {
  return new Response(JSON.stringify({ status: true, message: "ok", data }), { status: 200 });
}

function declined(message: string, status = 400): Response {
  return new Response(JSON.stringify({ status: false, message }), { status });
}

function installBank(): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({
      url,
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? JSON.parse(init.body) : null,
      auth: headers["Authorization"] ?? null,
    });

    if (url.startsWith("https://api.paystack.co/bank?")) return envelope(REGISTRY);

    if (url.startsWith("https://api.paystack.co/bank/resolve")) {
      if (resolveRefuses) return declined("Could not resolve account name. Check parameters or try again.");
      const number = new URL(url).searchParams.get("account_number") ?? "";
      const name = resolveAnswers.shift() ?? "ADAOBI O NWOSU";
      return envelope({ account_number: number, account_name: name });
    }

    if (url === "https://api.paystack.co/transferrecipient") {
      return envelope({ recipient_code: "RCP_test" });
    }

    if (url === "https://api.paystack.co/transfer") {
      if (transferRefuses) return declined("Your balance is not enough to fulfil this request.");
      const body = JSON.parse(String(init?.body)) as { reference: string };
      return envelope({ transfer_code: "TRF_test", reference: body.reference, status: "pending" });
    }

    throw new Error(`unexpected call to ${url}`);
  }) as typeof fetch;
}

/* -------------------------------------------------------------- helpers */

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

const SEND = {
  accountNumber: "0123456789",
  bankCode: "058",
  confirmedAccountName: "ADAOBI O NWOSU",
  amount: "5,000",
  note: "for the rent",
};

const resolveCalls = () => calls.filter((c) => c.url.includes("/bank/resolve"));
const transferCalls = () => calls.filter((c) => c.url.endsWith("/transfer"));

const realFetch = globalThis.fetch;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_vallo");
  calls.length = 0;
  holds.length = 0;
  audits.length = 0;
  statusChanges.length = 0;
  claims.clear();
  resolveAnswers = [];
  resolveRefuses = false;
  transferRefuses = false;
  balanceMinor = 1_000_000;
  installBank();

  /* The guard's three Postgres functions, behaving as the SQL does: one
     caller wins a fresh claim, a second on a key still running is in flight,
     and a key whose result was recorded replays it through JSON. */
  rpc.hasServiceRole.mockReturnValue(true);
  rpc.callSecurityRpc.mockReset().mockImplementation(async (fn: string, args: Record<string, unknown>) => {
    const id = `${args["scope"]}\u0000${args["subject"]}\u0000${args["key"]}`;
    if (fn === "claim_idempotency") {
      const held = claims.get(id);
      if (!held) {
        claims.set(id, { state: "running" });
        return { ok: true, data: { state: "fresh", result: null } };
      }
      if (held.state === "running") return { ok: true, data: { state: "in_flight", result: null } };
      /* Postgres hands the recorded value back through JSON, so anything that
         does not survive a round trip must not survive here either. */
      return { ok: true, data: { state: "replay", result: JSON.parse(JSON.stringify(held.result)) } };
    }
    if (fn === "record_idempotency_result") {
      claims.set(id, { state: "done", result: args["result"] });
      return { ok: true, data: null };
    }
    if (fn === "release_idempotency") {
      claims.delete(id);
      return { ok: true, data: null };
    }
    return { ok: false, data: null };
  });
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.unstubAllEnvs();
});

async function load() {
  return import("./actions");
}

/* ------------------------------------------------------------- the tests */

describe("the resolve step", () => {
  it("asks the bank itself, and the request carries the number, the bank and the key", async () => {
    const { resolveBankAccount } = await import("../payments/bank-accounts-actions");

    const result = await resolveBankAccount({ bankCode: "058", accountNumber: "012 345 6789" });

    expect(result).toEqual({ ok: true, data: { accountName: "ADAOBI O NWOSU" } });
    expect(resolveCalls()).toHaveLength(1);
    const asked = new URL(resolveCalls()[0]!.url);
    expect(asked.origin + asked.pathname).toBe("https://api.paystack.co/bank/resolve");
    expect(asked.searchParams.get("account_number")).toBe("0123456789");
    expect(asked.searchParams.get("bank_code")).toBe("058");
    expect(resolveCalls()[0]!.auth).toBe("Bearer sk_test_vallo");
  });

  it("moves no money: a resolve touches the bank and nothing else", async () => {
    const { resolveBankAccount } = await import("../payments/bank-accounts-actions");

    await resolveBankAccount({ bankCode: "058", accountNumber: "0123456789" });

    expect(transferCalls()).toHaveLength(0);
    expect(calls.some((c) => c.url.endsWith("/transferrecipient"))).toBe(false);
    expect(holds).toHaveLength(0);
  });

  it("refuses honestly when the bank does not know the account, and says which field", async () => {
    resolveRefuses = true;
    const { resolveBankAccount } = await import("../payments/bank-accounts-actions");

    const result = await resolveBankAccount({ bankCode: "058", accountNumber: "0123456789" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("could not be confirmed");
    expect(result.fieldErrors?.accountNumber).toBeTruthy();
  });
});

describe("the send", () => {
  it("holds the balance and builds the payout from the name the bank gave", async () => {
    const { transferToBank } = await load();

    const result = await transferToBank({ ok: false, error: "" }, form({ ...SEND, idempotencyKey: "k1" }));

    expect(result.ok).toBe(true);
    if (!result.ok || !result.data) return;
    expect(result.data.amountMinor).toBe(500_000);
    expect(result.data.reference.startsWith("rm-wd-")).toBe(true);
    expect(result.data.accountLast4).toBe("6789");
    expect(result.data.bankName).toBe("Guaranty Trust Bank");

    /* One hold, for the kobo the naira text became, under the reference the
       webhook settles. */
    expect(holds).toHaveLength(1);
    expect(holds[0]!.amountMinor).toBe(500_000);
    expect(holds[0]!.reference).toBe(result.data.reference);

    /* The recipient registered at the processor carries the BANK's name. */
    const recipient = calls.find((c) => c.url.endsWith("/transferrecipient"));
    expect(recipient?.body).toMatchObject({
      type: "nuban",
      name: "ADAOBI O NWOSU",
      account_number: "0123456789",
      bank_code: "058",
      currency: "NGN",
    });

    /* And the transfer is integer kobo, under the same reference. */
    expect(transferCalls()).toHaveLength(1);
    expect(transferCalls()[0]!.body).toMatchObject({
      source: "balance",
      amount: 500_000,
      currency: "NGN",
      recipient: "RCP_test",
      reference: result.data.reference,
    });
  });

  it("re-asks the bank at send time rather than trusting the browser", async () => {
    const { transferToBank } = await load();

    await transferToBank({ ok: false, error: "" }, form({ ...SEND, idempotencyKey: "k1" }));

    /* One resolve inside the send, even though the browser posted a name. */
    expect(resolveCalls()).toHaveLength(1);
  });

  it("REFUSES when the bank now names somebody else, and holds nothing", async () => {
    resolveAnswers = ["CHINEDU M OKAFOR"];
    const { transferToBank } = await load();

    const result = await transferToBank({ ok: false, error: "" }, form({ ...SEND, idempotencyKey: "k1" }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("is not the one you checked");
    expect(holds).toHaveLength(0);
    expect(transferCalls()).toHaveLength(0);
    expect(calls.some((c) => c.url.endsWith("/transferrecipient"))).toBe(false);
    /* And neither name is in the sentence the person is shown. */
    expect(result.error).not.toContain("CHINEDU");
    expect(result.error).not.toContain("ADAOBI");
  });

  it("forgives spacing, case and punctuation, because a full stop is not a different person", async () => {
    resolveAnswers = ["Adaobi  O. Nwosu"];
    const { transferToBank } = await load();

    const result = await transferToBank({ ok: false, error: "" }, form({ ...SEND, idempotencyKey: "k1" }));

    expect(result.ok).toBe(true);
    expect(holds).toHaveLength(1);
  });

  it("refuses a bank the live registry does not carry, before anything is held", async () => {
    const { transferToBank } = await load();

    const result = await transferToBank(
      { ok: false, error: "" },
      form({ ...SEND, bankCode: "999999", idempotencyKey: "k1" }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors?.bankCode).toBe("Choose a bank from the list.");
    expect(resolveCalls()).toHaveLength(0);
    expect(holds).toHaveLength(0);
  });

  it("accepts a bank the curated twenty three do not carry, because the registry is the authority", async () => {
    const { transferToBank } = await load();

    const result = await transferToBank(
      { ok: false, error: "" },
      form({ ...SEND, bankCode: "51310", idempotencyKey: "k1" }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok || !result.data) return;
    expect(result.data.bankName).toBe("Sparkle Microfinance Bank");
  });

  it("refuses when the bank cannot resolve the account at send time, and holds nothing", async () => {
    resolveRefuses = true;
    const { transferToBank } = await load();

    const result = await transferToBank({ ok: false, error: "" }, form({ ...SEND, idempotencyKey: "k1" }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("could not find that account");
    expect(holds).toHaveLength(0);
    expect(transferCalls()).toHaveLength(0);
  });

  it("refuses on a balance the database says is short, and never calls the processor", async () => {
    balanceMinor = 400_000;
    const { transferToBank } = await load();

    const result = await transferToBank({ ok: false, error: "" }, form({ ...SEND, idempotencyKey: "k1" }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors?.amount).toBeTruthy();
    expect(transferCalls()).toHaveLength(0);
  });

  it("releases the hold when the transfer will not start", async () => {
    transferRefuses = true;
    const { transferToBank } = await load();

    const result = await transferToBank({ ok: false, error: "" }, form({ ...SEND, idempotencyKey: "k1" }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("your balance is untouched");
    expect(statusChanges).toEqual([{ reference: holds[0]!.reference, status: "FAILED" }]);
  });

  it("puts no account number and no account holder in the audit trail", async () => {
    const { transferToBank } = await load();

    await transferToBank({ ok: false, error: "" }, form({ ...SEND, idempotencyKey: "k1" }));

    expect(audits).toHaveLength(1);
    const written = JSON.stringify(audits[0]);
    expect(written).not.toContain("0123456789");
    expect(written).not.toContain("ADAOBI");
    expect(written).toContain("6789");
  });
});

describe("two taps", () => {
  it("moves the money ONCE and replays the first receipt", async () => {
    const { transferToBank } = await load();

    const first = await transferToBank({ ok: false, error: "" }, form({ ...SEND, idempotencyKey: "same" }));
    const second = await transferToBank({ ok: false, error: "" }, form({ ...SEND, idempotencyKey: "same" }));

    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    expect(holds).toHaveLength(1);
    expect(transferCalls()).toHaveLength(1);
    expect(resolveCalls()).toHaveLength(1);
  });

  it("sends twice under two keys, which is what two deliberate sends are", async () => {
    balanceMinor = 2_000_000;
    const { transferToBank } = await load();

    await transferToBank({ ok: false, error: "" }, form({ ...SEND, idempotencyKey: "one" }));
    await transferToBank({ ok: false, error: "" }, form({ ...SEND, idempotencyKey: "two" }));

    expect(holds).toHaveLength(2);
    expect(transferCalls()).toHaveLength(2);
  });

  it("keeps a refusal retryable rather than replaying it", async () => {
    resolveRefuses = true;
    const { transferToBank } = await load();

    const first = await transferToBank({ ok: false, error: "" }, form({ ...SEND, idempotencyKey: "same" }));
    expect(first.ok).toBe(false);

    resolveRefuses = false;
    const second = await transferToBank({ ok: false, error: "" }, form({ ...SEND, idempotencyKey: "same" }));

    expect(second.ok).toBe(true);
    expect(holds).toHaveLength(1);
  });
});
