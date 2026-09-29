/**
 * DOC-06: the bank accounts a withdrawal is paid into had no test. Pinned:
 * the stored account name is the one Paystack resolves, never one the caller
 * supplies; nothing is resolved, stored, changed or removed for a signed-out
 * caller, past the money limit, or for an account Paystack will not confirm;
 * and every write is scoped to the caller's own rows.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

/* The passcode lock (docs/PASSCODE.md) reads the request's cookies, which a
   unit test has none of; it is proven in lib/passcode/*.test.ts. Unlocked here
   unless a test says otherwise. */
const passcode = vi.hoisted(() => ({ refusal: null as string | null }));
vi.mock("../passcode/money", () => ({ passcodeMoneyRefusal: async () => passcode.refusal }));
import { fakeSupabase } from "../testing/fake-supabase";

const state = vi.hoisted(() => ({
  session: null as unknown,
  allowed: true,
  configured: true,
  resolved: { ok: true, accountName: "ADA OBI" } as unknown,
  bank: { ok: true, name: "Test Bank" } as unknown,
  resolveCalls: 0,
  admin: null as unknown,
}));

vi.mock("../actions/session", () => ({
  resolveSession: async () => state.session,
  NOT_CONFIGURED_MESSAGE: "not configured",
  SIGNED_OUT_MESSAGE: "signed out",
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("../security/money-limits", () => ({
  guardMoney: async () => (state.allowed ? { allowed: true } : { allowed: false, message: "limit reached" }),
}));
vi.mock("../security/idempotency", () => ({
  IN_FLIGHT_MESSAGE: "in flight",
  withIdempotency: async (_opts: unknown, work: () => Promise<unknown>) => ({ status: "ran", result: await work() }),
}));
vi.mock("@/lib/money/audit", () => ({ recordMoneyAudit: async () => undefined }));
vi.mock("@/lib/supabase/service", () => ({ getAdminClient: () => state.admin }));
vi.mock("./notices", () => ({
  bankAccountAddedNotice: async () => undefined,
  bankAccountRemovedNotice: async () => undefined,
  bankDefaultChangedNotice: async () => undefined,
}));
vi.mock("./paystack", () => ({ isPaystackConfigured: () => state.configured }));
vi.mock("./bank-resolve", async () => {
  const { z } = await import("zod");
  return {
    accountNumberSchema: z.string().regex(/^\d{10}$/, "Ten digits."),
    cachedBanks: async () => [],
    lookupBank: async () => state.bank,
    resolveBankAccountName: async () => {
      state.resolveCalls += 1;
      return state.resolved;
    },
  };
});

const { addBankAccount, resolveBankAccount, setDefaultBankAccount, removeBankAccount } = await import("./bank-accounts-actions");

const ME = "11111111-1111-4111-8111-111111111111";
const ACCOUNT = "77777777-7777-4777-8777-777777777777";

let own: ReturnType<typeof fakeSupabase>;
/* DB-05: a new account is filed by the service role, never by the member's
   own client, so the writer is a second fake with the same script. */
let service: ReturnType<typeof fakeSupabase>;
function signedIn(script: Parameters<typeof fakeSupabase>[0] = {}) {
  own = fakeSupabase(script);
  service = fakeSupabase(script);
  state.session = { state: "signed-in", user: { id: ME }, supabase: own.client };
  state.admin = service.client;
}

const ROW = {
  id: ACCOUNT,
  bank_code: "058",
  bank_name: "Test Bank",
  account_number: "0123456789",
  resolved_account_name: "ADA OBI",
  is_default: false,
  created_at: "2026-09-24T00:00:00Z",
};

beforeEach(() => {
  state.allowed = true;
  state.configured = true;
  state.resolved = { ok: true, accountName: "ADA OBI" };
  state.bank = { ok: true, name: "Test Bank" };
  state.resolveCalls = 0;
  signedIn({ bank_accounts: { insert: { data: ROW }, select: { data: ROW }, update: { data: null, count: 1 } } });
});

describe("addBankAccount", () => {
  it("stores the account with the name Paystack resolved, for the signed-in user", async () => {
    const input = { bankCode: "058", accountNumber: "0123456789", resolved_account_name: "SOMEONE ELSE", user_id: "x" };
    expect(await addBankAccount(input as never)).toMatchObject({ ok: true, data: { accountName: "ADA OBI" } });
    const [insert] = service.of("bank_accounts", "insert");
    expect(insert?.values).toMatchObject({ user_id: ME, resolved_account_name: "ADA OBI", bank_name: "Test Bank" });
    expect(own.of("bank_accounts", "insert")).toHaveLength(0);
  });

  it("stores nothing when Paystack will not confirm the account", async () => {
    state.resolved = { ok: false, failure: "not-confirmed" };
    expect(await addBankAccount({ bankCode: "058", accountNumber: "0123456789" })).toMatchObject({
      ok: false,
      fieldErrors: { accountNumber: expect.any(String) },
    });
    expect(own.wrote()).toBe(false);
    expect(service.wrote()).toBe(false);
  });

  it("stores nothing, and never asks Paystack, past the money limit", async () => {
    state.allowed = false;
    expect(await addBankAccount({ bankCode: "058", accountNumber: "0123456789" })).toMatchObject({ ok: false, error: "limit reached" });
    expect(state.resolveCalls).toBe(0);
    expect(own.wrote()).toBe(false);
    expect(service.wrote()).toBe(false);
  });

  it("stores nothing for a signed-out caller, a bad number, or with Paystack unconfigured", async () => {
    state.session = { state: "signed-out" };
    expect((await addBankAccount({ bankCode: "058", accountNumber: "0123456789" })).ok).toBe(false);
    signedIn();
    expect((await addBankAccount({ bankCode: "058", accountNumber: "12345" })).ok).toBe(false);
    state.configured = false;
    expect((await addBankAccount({ bankCode: "058", accountNumber: "0123456789" })).ok).toBe(false);
    expect(state.resolveCalls).toBe(0);
    expect(own.wrote()).toBe(false);
    expect(service.wrote()).toBe(false);
  });

  it("refuses a bank code that is not on the registry", async () => {
    state.bank = { ok: false, failure: "unknown" };
    expect((await addBankAccount({ bankCode: "999", accountNumber: "0123456789" })).ok).toBe(false);
    expect(own.wrote()).toBe(false);
    expect(service.wrote()).toBe(false);
  });
});

describe("resolveBankAccount", () => {
  it("asks Paystack only for a signed-in caller inside the limit", async () => {
    expect(await resolveBankAccount({ bankCode: "058", accountNumber: "0123456789" })).toMatchObject({ ok: true, data: { accountName: "ADA OBI" } });
    state.allowed = false;
    expect((await resolveBankAccount({ bankCode: "058", accountNumber: "0123456789" })).ok).toBe(false);
    state.session = { state: "signed-out" };
    expect((await resolveBankAccount({ bankCode: "058", accountNumber: "0123456789" })).ok).toBe(false);
    expect(state.resolveCalls).toBe(1);
  });
});

describe("setDefaultBankAccount and removeBankAccount", () => {
  it("scope every read and write to the caller's own live rows", async () => {
    expect((await setDefaultBankAccount(ACCOUNT)).ok).toBe(true);
    expect((await removeBankAccount(ACCOUNT)).ok).toBe(true);
    for (const update of own.of("bank_accounts", "update")) {
      expect(update.filters).toEqual(expect.arrayContaining([["eq", "user_id", ME], ["is", "deleted_at", null]]));
    }
    expect(own.of("bank_accounts", "update")).toHaveLength(2);
  });

  it("change nothing for an account that is not the caller's", async () => {
    signedIn({ bank_accounts: { select: { data: null } } });
    expect((await setDefaultBankAccount(ACCOUNT)).ok).toBe(false);
    expect((await removeBankAccount(ACCOUNT)).ok).toBe(false);
    expect(own.wrote()).toBe(false);
    expect(service.wrote()).toBe(false);
  });

  it("change nothing past the money limit, or for a malformed id", async () => {
    state.allowed = false;
    expect((await setDefaultBankAccount(ACCOUNT)).ok).toBe(false);
    expect((await removeBankAccount(ACCOUNT)).ok).toBe(false);
    state.allowed = true;
    expect((await removeBankAccount("acct-1")).ok).toBe(false);
    expect(own.calls).toHaveLength(0);
  });

  it("does not claim a change when the guarded update touched no row", async () => {
    signedIn({ bank_accounts: { select: { data: ROW }, update: { data: null, count: 0 } } });
    expect((await setDefaultBankAccount(ACCOUNT)).ok).toBe(false);
  });
});
