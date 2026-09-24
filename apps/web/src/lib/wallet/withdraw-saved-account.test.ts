import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A withdrawal to an account on file is paid to the name the bank gives
 * today, not the name stored on the row: before the first payout mints a
 * recipient, the account is resolved again and a holder that no longer
 * matches is refused with the balance untouched. Only the outer seams are
 * substituted: the session client (the saved row), the admin client (the hold
 * and the recipient cache) and `fetch` (the bank).
 */

type Row = {
  id: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  resolved_account_name: string;
  recipient_code: string | null;
};

const ACCOUNT_ID = "6f1c2b8e-4a55-4d7e-9a3b-2c1d0e9f8a7b";
const state = vi.hoisted(() => ({
  row: null as unknown,
  holds: [] as string[],
  cached: [] as unknown[],
  calls: [] as { url: string; body: Record<string, unknown> | null }[],
  bankName: "ADAOBI O NWOSU",
  resolveDown: false,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Map() }));
vi.mock("../security/money-limits", () => ({ guardMoney: async () => ({ allowed: true }) }));
/* The hundred's gates in front of the money (V-81 phone lock, V-19 hold): open
   here, because this file is about the bank's name, and each has its own tests. */
vi.mock("../security/money-lock-guard", () => ({ moneyLockRefusalFor: async () => null }));
vi.mock("../security/account-hold-guard", () => ({ accountHoldRefusal: async () => null }));
vi.mock("../flags", () => ({ isFeatureEnabled: async () => true }));
vi.mock("../email/client", () => ({ bestEffortEmail: vi.fn(), sendMessage: vi.fn() }));
vi.mock("../payments/yellowcard", () => ({
  createCollection: vi.fn(),
  isYellowCardConfigured: () => false,
  YellowCardError: class extends Error {},
}));
vi.mock("../payments/charge-saved-card", () => ({ chargeSavedCard: vi.fn() }));
vi.mock("./repository", () => ({ readStatement: vi.fn() }));
vi.mock("./audit", () => ({ recordMoneyAudit: async () => undefined }));
vi.mock("../security/service-rpc", () => ({ callSecurityRpc: vi.fn(), hasServiceRole: () => true }));

function chain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const step of ["select", "eq", "is", "in", "order", "limit"]) c[step] = () => c;
  c.maybeSingle = async () => ({ data: result, error: null });
  return c;
}

vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "unconfigured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () => ({
    state: "signed-in",
    user: { id: "user-1", email: "ada@example.invalid", user_metadata: {} },
    supabase: { from: () => chain(state.row) },
  }),
}));

const adminClient = {
  rpc: async (fn: string, args: Record<string, unknown>) => {
    if (fn !== "hold_wallet_withdrawal") return { data: null, error: { code: "42883" } };
    state.holds.push(String(args["hold_reference"]));
    return { data: { status: "ok", available_minor: 900_000, wallet_id: "w1" }, error: null };
  },
  from: () => ({
    update: (values: unknown) => {
      state.cached.push(values);
      return { eq: async () => ({ error: null }) };
    },
  }),
};

vi.mock("./ledger", () => ({
  availableBalanceMinor: async () => 1_000_000,
  displayNameFor: async () => "Ada",
  ensureWalletId: async () => "w1",
  findUserByEmail: async () => null,
  getAdminClient: () => adminClient,
  postEntry: vi.fn(),
  recordFunding: vi.fn(),
  setEntryStatus: vi.fn(async () => true),
  annotateEntry: vi.fn(),
  labelTransferLegs: vi.fn(),
}));

function envelope(data: unknown): Response {
  return new Response(JSON.stringify({ status: true, message: "ok", data }), { status: 200 });
}

function installBank(): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    state.calls.push({ url, body: typeof init?.body === "string" ? JSON.parse(init.body) : null });
    if (url.startsWith("https://api.paystack.co/bank/resolve")) {
      if (state.resolveDown) throw new TypeError("fetch failed");
      const number = new URL(url).searchParams.get("account_number") ?? "";
      return envelope({ account_number: number, account_name: state.bankName });
    }
    if (url === "https://api.paystack.co/transferrecipient") return envelope({ recipient_code: "RCP_minted" });
    if (url === "https://api.paystack.co/transfer") {
      const body = JSON.parse(String(init?.body)) as { reference: string };
      return envelope({ transfer_code: "TRF_test", reference: body.reference, status: "pending" });
    }
    throw new Error(`unexpected call to ${url}`);
  }) as typeof fetch;
}

function savedRow(overrides: Partial<Row> = {}): Row {
  return {
    id: ACCOUNT_ID,
    bank_code: "058",
    bank_name: "Guaranty Trust Bank",
    account_number: "0123456789",
    resolved_account_name: "Adaobi O. Nwosu",
    recipient_code: null,
    ...overrides,
  };
}

async function withdrawSaved() {
  const { withdraw } = await import("./actions");
  const data = new FormData();
  data.set("amount", "5000");
  data.set("bankAccountId", ACCOUNT_ID);
  return withdraw({ ok: false, error: "" }, data);
}

const urls = () => state.calls.map((c) => c.url);

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_vallo");
  state.holds.length = 0;
  state.cached.length = 0;
  state.calls.length = 0;
  state.bankName = "ADAOBI O NWOSU";
  state.resolveDown = false;
  installBank();
});

describe("a withdrawal to a saved account with no recipient yet", () => {
  it("asks the bank again and pays the bank's name when it matches", async () => {
    state.row = savedRow();
    const result = await withdrawSaved();
    expect(result.ok).toBe(true);
    expect(urls().some((u) => u.startsWith("https://api.paystack.co/bank/resolve"))).toBe(true);
    const recipient = state.calls.find((c) => c.url.endsWith("/transferrecipient"));
    expect(recipient?.body?.["name"]).toBe("ADAOBI O NWOSU");
    expect(state.holds).toHaveLength(1);
    expect(state.cached).toEqual([{ recipient_code: "RCP_minted" }]);
  });

  it("refuses a stored name the bank no longer gives, before any hold or transfer", async () => {
    state.row = savedRow({ resolved_account_name: "SOMEBODY ELSE ENTIRELY" });
    const result = await withdrawSaved();
    expect(result.ok).toBe(false);
    expect(state.holds).toHaveLength(0);
    expect(urls().some((u) => u.endsWith("/transferrecipient") || u.endsWith("/transfer"))).toBe(false);
  });

  it("refuses when the bank cannot be asked, before any hold", async () => {
    state.row = savedRow();
    state.resolveDown = true;
    const result = await withdrawSaved();
    expect(result.ok).toBe(false);
    expect(state.holds).toHaveLength(0);
  });
});

describe("a withdrawal to a saved account whose recipient the server minted", () => {
  it("uses the cached recipient without asking the bank again", async () => {
    state.row = savedRow({ recipient_code: "RCP_cached" });
    const result = await withdrawSaved();
    expect(result.ok).toBe(true);
    expect(urls().some((u) => u.startsWith("https://api.paystack.co/bank/resolve"))).toBe(false);
    const transfer = state.calls.find((c) => c.url.endsWith("/transfer"));
    expect(transfer?.body?.["recipient"]).toBe("RCP_cached");
  });
});
