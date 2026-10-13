import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The restaurant's deposit settings (track/restaurant-deposits): written as
 * the owner under RLS, switched off first so a half save asks for less, never
 * deleted, and closed entirely while `restaurant_deposits` is off. The same
 * switch, read on the server, gates the desk card's read and the guest's
 * preview read.
 */

const state = vi.hoisted(() => ({
  flag: true,
  owner: "11111111-1111-4111-8111-111111111111",
  calls: [] as string[],
  rules: [] as Record<string, unknown>[],
  windows: [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5" }] as Record<string, unknown>[],
}));

function chain(table: string, op: string, payload?: unknown) {
  const answer = () => {
    if (op === "select" && table === "businesses")
      return { data: { id: BIZ, owner_id: state.owner, kind: "restaurant" }, error: null };
    if (op === "select" && table === "service_windows") return { data: state.windows, error: null };
    if (op === "select" && table === "restaurant_deposit_rules") return { data: state.rules, error: null };
    return { data: null, error: null };
  };
  const c: Record<string, unknown> = {};
  for (const m of ["eq", "in", "order", "not", "is", "limit"]) {
    c[m] = (...args: unknown[]) => {
      if (op !== "select") state.calls.push(`${table}:${op}:${m}:${JSON.stringify(args)}`);
      return c;
    };
  }
  c.maybeSingle = async () => answer();
  c.then = (resolve: (v: unknown) => void) => resolve(answer());
  if (op !== "select") state.calls.push(`${table}:${op}${payload ? `:${JSON.stringify(payload)}` : ""}`);
  return c;
}

const client = {
  from: (table: string) => ({
    select: () => chain(table, "select"),
    update: (v: unknown) => chain(table, "update", v),
    insert: (v: unknown) => chain(table, "insert", v),
    delete: () => chain(table, "delete"),
  }),
  rpc: async () => ({ data: null, error: null }),
};

vi.mock("../flags/read", () => ({ flagIsOn: async () => state.flag }));
vi.mock("../locale", () => ({ getLocale: async () => "en" }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("../payments/payee-subaccount", () => ({ ensureHostSubaccount: async () => null }));
vi.mock("@/lib/supabase/service", () => ({ getAdminClient: () => null }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => client }));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "not configured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () => ({ state: "signed-in", user: { id: "11111111-1111-4111-8111-111111111111" }, supabase: client }),
}));

const BIZ = "22222222-2222-4222-8222-222222222222";
const ON = { on: true, amountMinor: 500_000, perGuest: true, minPartySize: 4, windowIds: null, refundUntilHours: 24 };

beforeEach(() => {
  Object.assign(state, { flag: true, owner: "11111111-1111-4111-8111-111111111111", calls: [], rules: [] });
});

describe("saveDepositSettings", () => {
  it("with restaurant_deposits off, refuses before anything is read or written", async () => {
    state.flag = false;
    const { saveDepositSettings } = await import("./deposit-settings-actions");
    const r = await saveDepositSettings({ businessId: BIZ, settings: ON });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toBe("Table deposits are not open yet.");
    expect(state.calls).toHaveLength(0);
  });

  it("refuses a venue this person does not own", async () => {
    state.owner = "99999999-9999-4999-8999-999999999999";
    const { saveDepositSettings } = await import("./deposit-settings-actions");
    const r = await saveDepositSettings({ businessId: BIZ, settings: ON });
    expect(!r.ok && r.error).toMatch(/Only the owner/);
    expect(state.calls).toHaveLength(0);
  });

  it("refuses an amount below 100 naira in words, before writing", async () => {
    const { saveDepositSettings } = await import("./deposit-settings-actions");
    const r = await saveDepositSettings({ businessId: BIZ, settings: { ...ON, amountMinor: 5_000 } });
    expect(!r.ok && r.error).toMatch(/at least 100 naira/);
    expect(state.calls).toHaveLength(0);
  });

  it("switches the old rows off first, then writes the new one; never deletes", async () => {
    state.rules = [
      { id: "r-old", business_id: BIZ, service_window_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5", min_party_size: null, amount_minor: 300_000, per_guest: false, refund_until_hours: 12, active: true, created_at: "2026-10-01T00:00:00Z" },
    ];
    const { saveDepositSettings } = await import("./deposit-settings-actions");
    const r = await saveDepositSettings({ businessId: BIZ, settings: ON });
    expect(r.ok).toBe(true);
    const writes = state.calls.filter((c) => /:(update|insert|delete)/.test(c) && !c.includes(":eq:") && !c.includes(":in:"));
    expect(writes[0]).toBe('restaurant_deposit_rules:update:{"active":false}');
    expect(writes[1]).toMatch(/^restaurant_deposit_rules:insert:/);
    expect(writes[1]).toContain('"min_party_size":4');
    expect(state.calls.some((c) => c.includes(":delete"))).toBe(false);
  });
});

describe("the reads are closed while the switch is off", () => {
  it("no desk card and no guest preview with restaurant_deposits off", async () => {
    state.flag = false;
    const { readDeskDeposits, readVenueDeposit } = await import("./deposit-settings");
    expect(await readDeskDeposits()).toBeNull();
    expect(await readVenueDeposit(BIZ, state.owner)).toBeNull();
  });
});
