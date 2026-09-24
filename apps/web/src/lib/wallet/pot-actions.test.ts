/**
 * DOC-06: savings pots move money between a wallet's spendable balance and a
 * pot, through `move_into_pot` / `move_out_of_pot` with the service role. No
 * test covered them. What is pinned: the owner passed to the database is
 * always the signed-in user (never anything the form says), nothing reaches
 * the database for a signed-out caller, a bad amount or a switched-off
 * wallet, and each database verdict becomes an honest refusal.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "../testing/fake-supabase";

const state = vi.hoisted(() => ({ session: null as unknown, admin: null as unknown, flag: true }));

vi.mock("../actions/session", () => ({
  resolveSession: async () => state.session,
  NOT_CONFIGURED_MESSAGE: "not configured",
  SIGNED_OUT_MESSAGE: "signed out",
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("../flags", () => ({ isFeatureEnabled: async () => state.flag }));
vi.mock("../payments/observability", () => ({ logMoney: () => undefined, failureReason: () => "x" }));
vi.mock("./ledger", () => ({ getAdminClient: () => state.admin }));

const { createPot, moveIntoPot, moveOutOfPot } = await import("./pot-actions");

const ME = "11111111-1111-4111-8111-111111111111";
const SOMEONE_ELSE = "99999999-9999-4999-8999-999999999999";
const POT = "55555555-5555-4555-8555-555555555555";

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

let own: ReturnType<typeof fakeSupabase>;
let admin: ReturnType<typeof fakeSupabase>;

function withRpc(answer: { data?: unknown; error?: unknown }) {
  admin = fakeSupabase({ move_into_pot: { rpc: answer }, move_out_of_pot: { rpc: answer } });
  state.admin = admin.client;
}

beforeEach(() => {
  state.flag = true;
  own = fakeSupabase({ wallet_pots: { insert: { data: { id: POT } } } });
  state.session = { state: "signed-in", user: { id: ME }, supabase: own.client };
  withRpc({ data: { status: "ok" } });
});

describe("moveIntoPot / moveOutOfPot", () => {
  it("moves money for the signed-in owner, in kobo, with a pot reference", async () => {
    expect(await moveIntoPot({ ok: true, data: null } as never, form({ potId: POT, amount: "5,000" }))).toMatchObject({ ok: true });
    const [call] = admin.of("move_into_pot", "rpc");
    expect(call?.values).toMatchObject({ owner_user: ME, pot: POT, amount: 500_000 });
    expect(String((call?.values as { move_reference: string }).move_reference)).toMatch(/^rm-pot-[0-9a-f-]{36}$/);
  });

  it("ignores an owner smuggled into the form: the database is always told the session's user", async () => {
    await moveOutOfPot({ ok: true, data: null } as never, form({ potId: POT, amount: "100", owner_user: SOMEONE_ELSE, userId: SOMEONE_ELSE }));
    expect(admin.of("move_out_of_pot", "rpc")[0]?.values).toMatchObject({ owner_user: ME });
  });

  it("touches nothing for a signed-out caller", async () => {
    state.session = { state: "signed-out" };
    expect(await moveIntoPot({ ok: true, data: null } as never, form({ potId: POT, amount: "100" }))).toMatchObject({ ok: false, error: "signed out" });
    expect(admin.calls).toHaveLength(0);
  });

  it("touches nothing for an amount it cannot read, or a pot id that is not an id", async () => {
    expect((await moveIntoPot({ ok: true, data: null } as never, form({ potId: POT, amount: "lots" }))).ok).toBe(false);
    expect((await moveIntoPot({ ok: true, data: null } as never, form({ potId: "pot-1", amount: "100" }))).ok).toBe(false);
    expect(admin.calls).toHaveLength(0);
  });

  it("touches nothing while the wallet is switched off", async () => {
    state.flag = false;
    expect((await moveIntoPot({ ok: true, data: null } as never, form({ potId: POT, amount: "100" }))).ok).toBe(false);
    expect(admin.calls).toHaveLength(0);
  });

  it("turns the database's verdicts into refusals, never into success", async () => {
    withRpc({ data: { status: "insufficient" } });
    expect(await moveIntoPot({ ok: true, data: null } as never, form({ potId: POT, amount: "100" }))).toMatchObject({
      ok: false,
      fieldErrors: { amount: expect.any(String) },
    });
    withRpc({ data: { status: "no_pot" } });
    expect(JSON.stringify(await moveOutOfPot({ ok: true, data: null } as never, form({ potId: POT, amount: "100" })))).toMatch(/no longer exists/);
    withRpc({ data: { status: "something_new" } });
    expect((await moveIntoPot({ ok: true, data: null } as never, form({ potId: POT, amount: "100" }))).ok).toBe(false);
    withRpc({ data: null, error: { code: "42883", message: "function move_into_pot does not exist" } });
    expect((await moveIntoPot({ ok: true, data: null } as never, form({ potId: POT, amount: "100" }))).ok).toBe(false);
  });

  it("treats a replayed move (duplicate) as done, not as a second move", async () => {
    withRpc({ data: { status: "duplicate" } });
    expect(await moveIntoPot({ ok: true, data: null } as never, form({ potId: POT, amount: "100" }))).toMatchObject({ ok: true });
    expect(admin.of("move_into_pot", "rpc")).toHaveLength(1);
  });
});

describe("createPot", () => {
  it("creates a pot owned by the signed-in user through their own client", async () => {
    expect(await createPot({ ok: true, data: null } as never, form({ name: "Rent", target: "500,000" }))).toMatchObject({ ok: true, data: { id: POT } });
    expect(own.of("wallet_pots", "insert")[0]?.values).toEqual({ user_id: ME, name: "Rent", target_minor: 50_000_000 });
  });

  it("refuses a bad target naming the target field, and inserts nothing", async () => {
    expect(await createPot({ ok: true, data: null } as never, form({ name: "Rent", target: "a lot" }))).toMatchObject({
      ok: false,
      fieldErrors: { target: expect.any(String) },
    });
    expect(own.calls).toHaveLength(0);
  });

  it("inserts nothing for a signed-out caller", async () => {
    state.session = { state: "signed-out" };
    expect((await createPot({ ok: true, data: null } as never, form({ name: "Rent" }))).ok).toBe(false);
    expect(own.calls).toHaveLength(0);
  });
});
