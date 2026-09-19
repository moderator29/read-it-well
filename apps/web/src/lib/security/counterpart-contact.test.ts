import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * WHO GETS HANDED A NUMBER, PROVED FROM BOTH ENDS.
 *
 * A call control in a thread header and on an inspection row is the first
 * place this product ever discloses one person's phone number to another, and
 * the number lives in `profiles`, which no reader's own client can see. So the
 * rule is tested rather than trusted, in both directions: the entitled reader
 * gets a number a dialler will take, and every other case resolves to nothing
 * at all, which draws no control.
 *
 * The cases that matter are the failures. A block in EITHER direction
 * withholds, because a block is bidirectional invisibility and a stale row on
 * screen must not become a way to ring somebody who blocked you. A read that
 * could not answer withholds too, which is the opposite of what messaging does
 * with the same table and is deliberate: a failed block check on a WRITE has
 * the database's restrictive policies underneath it, and a disclosure has
 * nothing underneath it at all.
 */

const supabaseAdmin = vi.hoisted(() => ({ createAdminClient: vi.fn() }));
vi.mock("../supabase/admin", () => supabaseAdmin);

const { callableNumber, callableNumberFor, callableNumbersFor } = await import(
  "./counterpart-contact"
);

const ME = "11111111-1111-4111-8111-111111111111";
const THEM = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";

type Result = { data: unknown; error: unknown };

function builder(result: Result): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "or", "in", "eq", "limit"]) chain[method] = () => chain;
  chain.then = (resolve: (value: Result) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

function mountAdmin(options: {
  blocks?: { user_id: string; other_id: string }[];
  blockError?: { message: string } | null;
  profiles?: { id: string; phone: string | null }[];
  profileError?: { message: string } | null;
}) {
  supabaseAdmin.createAdminClient.mockReturnValue({
    from(table: string) {
      if (table === "blocks") {
        return builder({ data: options.blocks ?? [], error: options.blockError ?? null });
      }
      if (table === "profiles") {
        return builder({ data: options.profiles ?? [], error: options.profileError ?? null });
      }
      throw new Error(`unexpected table: ${table}`);
    },
  });
}

beforeEach(() => {
  supabaseAdmin.createAdminClient.mockReset();
});

describe("callableNumber", () => {
  it("puts a stored number into the canonical form a dialler takes", () => {
    expect(callableNumber("0803 123 4567")).toBe("+2348031234567");
    expect(callableNumber("+234 803 123 4567")).toBe("+2348031234567");
  });

  it("is null for nothing, and never invents one", () => {
    expect(callableNumber(null)).toBeNull();
    expect(callableNumber("")).toBeNull();
    expect(callableNumber("   ")).toBeNull();
  });
});

describe("callableNumbersFor", () => {
  it("hands over the number of somebody the reader is entitled to ring", async () => {
    mountAdmin({ profiles: [{ id: THEM, phone: "0803 123 4567" }] });
    const numbers = await callableNumbersFor(ME, [THEM]);
    expect(numbers.get(THEM)).toBe("+2348031234567");
  });

  it("withholds when the reader has blocked them", async () => {
    mountAdmin({
      blocks: [{ user_id: ME, other_id: THEM }],
      profiles: [{ id: THEM, phone: "0803 123 4567" }],
    });
    expect(await callableNumberFor(ME, THEM)).toBeNull();
  });

  it("withholds when THEY have blocked the reader", async () => {
    mountAdmin({
      blocks: [{ user_id: THEM, other_id: ME }],
      profiles: [{ id: THEM, phone: "0803 123 4567" }],
    });
    expect(await callableNumberFor(ME, THEM)).toBeNull();
  });

  it("withholds every number when the block check itself could not answer", async () => {
    mountAdmin({
      blockError: { message: "down" },
      profiles: [{ id: THEM, phone: "0803 123 4567" }],
    });
    expect(await callableNumberFor(ME, THEM)).toBeNull();
  });

  it("withholds when there is no service key", async () => {
    supabaseAdmin.createAdminClient.mockImplementation(() => {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    });
    expect(await callableNumberFor(ME, THEM)).toBeNull();
  });

  it("is null rather than empty for a party who has put no number on file", async () => {
    mountAdmin({ profiles: [{ id: THEM, phone: null }] });
    const numbers = await callableNumbersFor(ME, [THEM]);
    expect(numbers.has(THEM)).toBe(false);
  });

  it("blocks one party without withholding the other", async () => {
    mountAdmin({
      blocks: [{ user_id: OTHER, other_id: ME }],
      profiles: [
        { id: THEM, phone: "0803 123 4567" },
        { id: OTHER, phone: "0805 000 1111" },
      ],
    });
    const numbers = await callableNumbersFor(ME, [THEM, OTHER]);
    expect(numbers.get(THEM)).toBe("+2348031234567");
    expect(numbers.has(OTHER)).toBe(false);
  });

  it("never asks the database about a reader's own id or a malformed one", async () => {
    mountAdmin({ profiles: [{ id: THEM, phone: "0803 123 4567" }] });
    expect((await callableNumbersFor(ME, [ME])).size).toBe(0);
    expect((await callableNumbersFor(ME, ["not-a-uuid"])).size).toBe(0);
    expect((await callableNumbersFor("not-a-uuid", [THEM])).size).toBe(0);
    expect(supabaseAdmin.createAdminClient).not.toHaveBeenCalled();
  });
});
