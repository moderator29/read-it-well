import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WALLET_BANKS } from "./banks";

/**
 * THE WITHDRAW DOOR: WHICH BANKS IT WILL PAY, AND WHAT TWO TAPS DO.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS SUBSTITUTED, AND WHAT IS DELIBERATELY NOT.
 *
 * `bank-send.test.ts` is the standard this follows, and it follows it for the
 * same reason: substitute NOTHING inside the application except the outermost
 * seam. `withdrawSchema`, `lookupBank`, the one-hour registry cache in
 * `lib/payments/bank-resolve.ts`, the Paystack client, `callMoneyRpc`,
 * `readMoneyStatus` and the REAL `withIdempotency` all run exactly as they
 * ship. The only replacements are:
 *
 *   `globalThis.fetch`   the bank. Every assertion about the processor is an
 *                        assertion about the HTTP request this code built.
 *   the admin client     Postgres, as a faithful in-memory
 *                        `hold_wallet_withdrawal` behind the real RPC door.
 *   `claim_idempotency`  the guard's three Postgres functions, stood up the
 *   and its two siblings way `transfer-idempotency.test.ts` stands them up.
 *   the session, the flag, the rate limiter, `revalidatePath`, the audit
 *   writer and the email client, none of which decide where money goes.
 *
 * MOCKING `withIdempotency` HERE WOULD HAVE MADE THIS FILE WORTHLESS. The
 * whole claim of the second half is "two taps move the money once", and the
 * only thing that can be asked of a mocked guard is whether it was called.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS UNPROVEN BY THIS FILE, SAID PLAINLY.
 *
 * `api.paystack.co` is unreachable from this container and there is no live
 * secret key here, so nothing past the socket is proved: that Paystack accepts
 * these bodies, that the transfer settles, that `transfer.success` then closes
 * the hold. Everything up to the bytes on the wire is proved, and so is every
 * refusal on this side of it. No live money moved and no row was written to a
 * product table.
 */

/* --------------------------------------------------------------- the seams */

type Hold = { reference: string; amountMinor: number; metadata: Record<string, unknown> };

const holds: Hold[] = [];
const audits: { action: string; detail: unknown }[] = [];
let balanceMinor = 0;

type Claim = { state: "running" } | { state: "done"; result: unknown };
const claims = new Map<string, Claim>();

const rpc = vi.hoisted(() => ({ callSecurityRpc: vi.fn(), hasServiceRole: vi.fn(() => true) }));
const ledgerSpies = vi.hoisted(() => ({ setEntryStatus: vi.fn(async () => true) }));

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

/** Postgres, as far as this path can see it. The RPC door itself is real. */
const adminClient = {
  rpc: async (fn: string, args: Record<string, unknown>) => {
    if (fn !== "hold_wallet_withdrawal") return { data: null, error: { code: "42883" } };
    const reference = String(args["hold_reference"]);
    const amount = Number(args["amount"]);
    if (holds.some((h) => h.reference === reference)) {
      return {
        data: { status: "duplicate", available_minor: balanceMinor, wallet_id: "w1" },
        error: null,
      };
    }
    const outstanding = holds.reduce((sum, h) => sum + h.amountMinor, 0);
    if (amount > balanceMinor - outstanding) {
      return {
        data: {
          status: "insufficient",
          available_minor: balanceMinor - outstanding,
          wallet_id: "w1",
        },
        error: null,
      };
    }
    holds.push({
      reference,
      amountMinor: amount,
      metadata: (args["hold_metadata"] ?? {}) as Record<string, unknown>,
    });
    return {
      data: { status: "ok", available_minor: balanceMinor - outstanding - amount, wallet_id: "w1" },
      error: null,
    };
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
  setEntryStatus: ledgerSpies.setEntryStatus,
  annotateEntry: vi.fn(),
  labelTransferLegs: vi.fn(),
}));

/* ------------------------------------------------------------- the bank */

type Call = { url: string; method: string; body: Record<string, unknown> | null };

const calls: Call[] = [];

/**
 * THE LIVE REGISTRY, AS PAYSTACK ANSWERS IT.
 *
 * Deliberately a superset of `WALLET_BANKS`: Sparkle, VFD and Jaiz are in the
 * processor's list of about a hundred and were never in the hand-curated
 * twenty three, which is the exact gap this file exists to close.
 */
const REGISTRY = [
  { name: "Guaranty Trust Bank", code: "058", slug: "gtb" },
  { name: "Kuda Microfinance Bank", code: "50211", slug: "kuda" },
  { name: "Sparkle Microfinance Bank", code: "51310", slug: "sparkle" },
  { name: "VFD Microfinance Bank", code: "566", slug: "vfd" },
  { name: "Jaiz Bank", code: "301", slug: "jaiz" },
];

/** When true the registry endpoint behaves like an unreachable processor. */
let registryDown = false;
/** Resolved when the transfer call may answer; left open to hold one in flight. */
let transferGate: Promise<void> | null = null;
/** How the transfer call ends: answered, never answered, or refused outright. */
let transferMode: "ok" | "timeout" | "refused" = "ok";

function envelope(data: unknown): Response {
  return new Response(JSON.stringify({ status: true, message: "ok", data }), { status: 200 });
}

function installBank(): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({
      url,
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? JSON.parse(init.body) : null,
    });

    if (url.startsWith("https://api.paystack.co/bank?")) {
      if (registryDown) throw new TypeError("fetch failed");
      return envelope(REGISTRY);
    }

    if (url.startsWith("https://api.paystack.co/bank/resolve")) {
      const number = new URL(url).searchParams.get("account_number") ?? "";
      return envelope({ account_number: number, account_name: "ADAOBI O NWOSU" });
    }

    if (url === "https://api.paystack.co/transferrecipient") {
      return envelope({ recipient_code: "RCP_test" });
    }

    if (url === "https://api.paystack.co/transfer") {
      if (transferGate) await transferGate;
      if (transferMode === "timeout") throw new DOMException("The operation timed out.", "TimeoutError");
      if (transferMode === "refused") {
        return new Response(
          JSON.stringify({ status: false, message: "You cannot initiate third party payouts as a starter business" }),
          { status: 400 },
        );
      }
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

const registryCalls = () => calls.filter((c) => c.url.startsWith("https://api.paystack.co/bank?"));
const transferCalls = () => calls.filter((c) => c.url.endsWith("/transfer"));

const realFetch = globalThis.fetch;

beforeEach(() => {
  /* The registry cache in bank-resolve.ts is module state with a one-hour TTL.
     Resetting the modules is what gives each test a cold cache, and it is also
     why there is no second cache anywhere in this file. */
  vi.resetModules();
  vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_vallo");
  calls.length = 0;
  holds.length = 0;
  audits.length = 0;
  claims.clear();
  registryDown = false;
  transferGate = null;
  transferMode = "ok";
  ledgerSpies.setEntryStatus.mockClear();
  balanceMinor = 1_000_000;
  installBank();

  rpc.hasServiceRole.mockReturnValue(true);
  rpc.callSecurityRpc
    .mockReset()
    .mockImplementation(async (fn: string, args: Record<string, unknown>) => {
      const id = `${args["scope"]}\u0000${args["subject"]}\u0000${args["key"]}`;
      if (fn === "claim_idempotency") {
        const held = claims.get(id);
        if (!held) {
          claims.set(id, { state: "running" });
          return { ok: true, data: { state: "fresh", result: null } };
        }
        if (held.state === "running") return { ok: true, data: { state: "in_flight", result: null } };
        /* Postgres hands the recorded value back through JSON, so anything
           that does not survive a round trip must not survive here either. */
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

const WITHDRAW = { amount: "5,000", accountNumber: "0123456789" };

/* ==================================================================== */
/* BLOCK 1: which banks this door will pay                              */
/* ==================================================================== */

describe("the withdraw door asks the live registry, not a hand-typed list", () => {
  /**
   * THE ASSERTION THAT MAKES THE REST OF THIS BLOCK MEAN ANYTHING.
   *
   * Without it, every test below could go green against a hand list that had
   * quietly been widened to include Sparkle, and the file would be reporting
   * that it TRIED rather than what HAPPENED.
   */
  it("uses codes that are provably NOT in the curated list", () => {
    const curated = new Set(WALLET_BANKS.map((b) => b.code));
    expect(curated.has("51310")).toBe(false);
    expect(curated.has("566")).toBe(false);
    expect(curated.has("301")).toBe(false);
    /* And the curated list is genuinely the short one it is described as. */
    expect(WALLET_BANKS.length).toBeLessThan(REGISTRY.length + 30);
  });

  it("pays a Sparkle account, which the curated twenty three has never carried", async () => {
    const { withdraw } = await load();

    const result = await withdraw({ ok: false, error: "" }, form({ ...WITHDRAW, bankCode: "51310" }));

    expect(result.ok).toBe(true);
    if (!result.ok || !result.data) return;
    expect(result.data.bankName).toBe("Sparkle Microfinance Bank");
    expect(result.data.reference.startsWith("rm-wd-")).toBe(true);
    expect(result.data.accountLast4).toBe("6789");

    /* One hold, in integer kobo, under the reference the webhook settles. */
    expect(holds).toHaveLength(1);
    expect(holds[0]!.amountMinor).toBe(500_000);
    expect(holds[0]!.metadata["bank_code"]).toBe("51310");
    expect(holds[0]!.metadata["bank_name"]).toBe("Sparkle Microfinance Bank");

    /* And the payout instruction carries the registry's code, not a guess. */
    const recipient = calls.find((c) => c.url.endsWith("/transferrecipient"));
    expect(recipient?.body).toMatchObject({ bank_code: "51310", name: "ADAOBI O NWOSU" });
    expect(transferCalls()).toHaveLength(1);
    expect(transferCalls()[0]!.body).toMatchObject({ amount: 500_000, reference: result.data.reference });
  });

  it("pays a VFD account and a Jaiz account too", async () => {
    const { withdraw } = await load();

    const vfd = await withdraw({ ok: false, error: "" }, form({ ...WITHDRAW, bankCode: "566" }));
    const jaiz = await withdraw({ ok: false, error: "" }, form({ ...WITHDRAW, bankCode: "301" }));

    expect(vfd.ok && vfd.data?.bankName).toBe("VFD Microfinance Bank");
    expect(jaiz.ok && jaiz.data?.bankName).toBe("Jaiz Bank");
  });

  it("REFUSES a code the registry does not carry, and names the field", async () => {
    const { withdraw } = await load();

    const result = await withdraw({ ok: false, error: "" }, form({ ...WITHDRAW, bankCode: "000" }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("Choose a bank from the list.");
    expect(result.fieldErrors?.bankCode).toBeTruthy();

    /* Nothing was held and nobody was paid. */
    expect(holds).toHaveLength(0);
    expect(transferCalls()).toHaveLength(0);
  });

  /**
   * THE ONE THAT MATTERS MOST IN THIS BLOCK.
   *
   * Widening the schema moved the membership check onto a NETWORK CALL. If
   * that call failing were treated as "the code is probably fine", a live
   * payout path would accept any string as a bank the moment the processor
   * had a bad minute. This asserts the opposite, and it asserts it at the
   * money: no hold, no recipient, no transfer.
   */
  it("REFUSES when the registry cannot be read, and never lets the code through", async () => {
    registryDown = true;
    const { withdraw } = await load();

    const result = await withdraw({ ok: false, error: "" }, form({ ...WITHDRAW, bankCode: "51310" }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(holds).toHaveLength(0);
    expect(transferCalls()).toHaveLength(0);
    expect(calls.some((c) => c.url.endsWith("/transferrecipient"))).toBe(false);
    /* The account was never even resolved: the refusal is before the spend. */
    expect(calls.some((c) => c.url.includes("/bank/resolve"))).toBe(false);
  });

  it("says the registry was unreadable rather than telling the person to pick again", async () => {
    registryDown = true;
    const { withdraw } = await load();

    const result = await withdraw({ ok: false, error: "" }, form({ ...WITHDRAW, bankCode: "51310" }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    /* Sending somebody back to a list we could not read, to make the same
       choice again, reads as the platform calling their bank fake. */
    expect(result.error).not.toBe("Choose a bank from the list.");
    expect(result.error).toContain("try again in a moment");
    expect(result.error).toContain("balance is untouched");
    expect(result.fieldErrors?.bankCode).toBeFalsy();
  });

  it("refuses an empty bank code at the schema, before any network call", async () => {
    const { withdraw } = await load();

    const result = await withdraw({ ok: false, error: "" }, form({ ...WITHDRAW, bankCode: "" }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors?.bankCode).toBeTruthy();
    expect(calls).toHaveLength(0);
  });

  it("reuses the one-hour registry cache rather than asking per withdrawal", async () => {
    balanceMinor = 10_000_000;
    const { withdraw } = await load();

    await withdraw({ ok: false, error: "" }, form({ ...WITHDRAW, bankCode: "51310" }));
    await withdraw({ ok: false, error: "" }, form({ ...WITHDRAW, bankCode: "566" }));
    await withdraw({ ok: false, error: "" }, form({ ...WITHDRAW, bankCode: "301" }));

    expect(holds).toHaveLength(3);
    expect(registryCalls()).toHaveLength(1);
  });

  it("the courtesy read on the sheet answers for a registry bank as well", async () => {
    const { lookupAccountName } = await load();

    const found = await lookupAccountName("51310", "0123456789");

    expect(found).toEqual({ ok: true, accountName: "ADAOBI O NWOSU" });
  });

  it("the courtesy read REFUSES OUT LOUD instead of going silent", async () => {
    const { lookupAccountName } = await load();

    /* It returned `{ ok: false, reason: "" }` for anything outside the
       curated list, so the sheet showed nothing at all: no name, no refusal,
       a field that simply never answered while the person pressed Withdraw. */
    const unknown = await lookupAccountName("000", "0123456789");
    expect(unknown).toEqual({ ok: false, reason: "Choose a bank from the list." });

    registryDown = true;
    vi.resetModules();
    const cold = await load();
    const down = await cold.lookupAccountName("51310", "0123456789");
    expect(down.ok).toBe(false);
    if (down.ok) return;
    expect(down.reason).toContain("try again in a moment");
  });
});

/* ==================================================================== */
/* BLOCK 2: two taps                                                    */
/* ==================================================================== */

describe("two taps on a withdrawal move the money once", () => {
  it("holds once, transfers once, and replays the first receipt", async () => {
    const { withdraw } = await load();
    const submit = { ...WITHDRAW, bankCode: "058", idempotencyKey: "tap-1" };

    const first = await withdraw({ ok: false, error: "" }, form(submit));
    const second = await withdraw({ ok: false, error: "" }, form(submit));

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok || !first.data || !second.data) return;

    /* The receipt is the FIRST one, down to the reference. A second
       withdrawal would have minted a second `rm-wd-` uuid. */
    expect(second.data.reference).toBe(first.data.reference);
    expect(second.data).toEqual(first.data);

    /* And the money moved once, at the two places it could have moved. */
    expect(holds).toHaveLength(1);
    expect(transferCalls()).toHaveLength(1);
    expect(
      audits.filter((a) => a.action === "wallet.withdrawal.hold_placed"),
    ).toHaveLength(1);
  });

  it("without a key it is unguarded, which is what the sheet posts today", async () => {
    const { withdraw } = await load();
    const submit = { ...WITHDRAW, bankCode: "058" };

    const first = await withdraw({ ok: false, error: "" }, form(submit));
    const second = await withdraw({ ok: false, error: "" }, form(submit));

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok || !first.data || !second.data) return;
    /* Two references, two holds, two transfers. Recorded rather than
       celebrated: this is the state the withdraw sheet is in until it mints a
       key, and it is why its panel still has no retry button. */
    expect(second.data.reference).not.toBe(first.data.reference);
    expect(holds).toHaveLength(2);
    expect(transferCalls()).toHaveLength(2);
  });

  it("a different key is a different withdrawal", async () => {
    const { withdraw } = await load();

    const first = await withdraw({ ok: false, error: "" }, form({ ...WITHDRAW, bankCode: "058", idempotencyKey: "a" }));
    const second = await withdraw({ ok: false, error: "" }, form({ ...WITHDRAW, bankCode: "058", idempotencyKey: "b" }));

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok || !first.data || !second.data) return;
    expect(second.data.reference).not.toBe(first.data.reference);
    expect(holds).toHaveLength(2);
  });

  it("a REFUSAL stays retryable under the same key", async () => {
    balanceMinor = 100_00;
    const { withdraw } = await load();
    const submit = { ...WITHDRAW, bankCode: "058", idempotencyKey: "same" };

    const short = await withdraw({ ok: false, error: "" }, form(submit));
    expect(short.ok).toBe(false);
    if (short.ok) return;
    expect(short.fieldErrors?.amount).toBeTruthy();

    /* They fund the wallet and press Withdraw again on the same mounted form,
       so the same key arrives. Replaying the refusal for the whole TTL would
       tell somebody with money in their wallet that they have none. */
    balanceMinor = 1_000_000;
    const funded = await withdraw({ ok: false, error: "" }, form(submit));

    expect(funded.ok).toBe(true);
    expect(holds).toHaveLength(1);
    expect(transferCalls()).toHaveLength(1);
  });

  it("tells the second tap the first is still going through, and moves nothing", async () => {
    const { withdraw } = await load();
    const submit = { ...WITHDRAW, bankCode: "058", idempotencyKey: "inflight" };

    let open!: () => void;
    transferGate = new Promise<void>((resolve) => {
      open = resolve;
    });

    const first = withdraw({ ok: false, error: "" }, form(submit));
    /* Let the first attempt reach the transfer call and stop there. */
    await vi.waitFor(() => expect(transferCalls()).toHaveLength(1));

    const second = await withdraw({ ok: false, error: "" }, form(submit));
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error).toContain("still going through");

    open();
    const settled = await first;
    expect(settled.ok).toBe(true);
    /* The second tap never touched the money. */
    expect(holds).toHaveLength(1);
    expect(transferCalls()).toHaveLength(1);
  });
});

/* ==================================================================== */
/* MON-01: a transfer that never answered keeps its hold                */
/* ==================================================================== */

describe("a withdrawal whose transfer outcome is unknown (MON-01)", () => {
  it("keeps the hold PENDING when the transfer call times out, and says the bank has not confirmed", async () => {
    transferMode = "timeout";
    const { withdraw } = await load();

    const result = await withdraw({ ok: false, error: "" }, form({ ...WITHDRAW, bankCode: "058" }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/has not confirmed/);
    expect(holds).toHaveLength(1);
    /* The hold was NOT released: nothing moved it to FAILED. */
    expect(ledgerSpies.setEntryStatus).not.toHaveBeenCalled();
    expect(audits.some((a) => a.action === "wallet.withdrawal.outcome_unknown")).toBe(true);
  });

  it("releases the hold when Paystack refuses the transfer outright", async () => {
    transferMode = "refused";
    const { withdraw } = await load();

    const result = await withdraw({ ok: false, error: "" }, form({ ...WITHDRAW, bankCode: "058" }));

    expect(result.ok).toBe(false);
    expect(ledgerSpies.setEntryStatus).toHaveBeenCalledWith(
      adminClient,
      expect.stringMatching(/^rm-wd-/),
      "FAILED",
      expect.objectContaining({ failure: expect.stringMatching(/starter business/) }),
    );
  });
});
