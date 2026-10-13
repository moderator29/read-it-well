import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * THE PASSPORT'S READS, with the database stubbed. What the database function
 * itself refuses (blocks, off, hidden lines) is held by the probe
 * `supabase/tests/probes/pass02-vallo-passport-read.sql`; what is held
 * here is that the app asks nothing when nobody is signed in, shows nothing
 * the function did not return, and turns every refusal into one state.
 */

const VIEWER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OWNER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const calls: { fn: string; args: unknown }[] = [];
let signedIn = true;
let rows: Record<string, { data: unknown; error: unknown }> = {};
let handleRow: { data: unknown; error: unknown } = { data: { user_id: OWNER }, error: null };

const client = {
  rpc: (fn: string, args: unknown) => {
    calls.push({ fn, args });
    return Promise.resolve(rows[fn] ?? { data: null, error: null });
  },
  from: (table: string) => ({
    select: () => ({
      eq: (column: string, value: string) => ({
        maybeSingle: () => {
          calls.push({ fn: `from:${table}`, args: { column, value } });
          return Promise.resolve(table === "social_profiles" ? handleRow : (rows[`from:${table}`] ?? { data: null, error: null }));
        },
      }),
    }),
  }),
};

vi.mock("@/lib/actions/session", () => ({
  resolveSession: async () => (signedIn ? { state: "signed-in", supabase: client, user: { id: VIEWER } } : { state: "signed-out" }),
}));

const reported: unknown[] = [];
vi.mock("@/lib/observability/report", () => ({
  reportError: vi.fn(async (input: { error: unknown }) => {
    reported.push(input.error);
    return { sent: false, reason: "not_configured" };
  }),
}));

const ROW = {
  subject_id: OWNER,
  handle: "ada",
  display_name: "Ada Okafor",
  photo: null,
  roles: ["renter"],
  joined_at: "2026-08-07T08:00:00Z",
  verification: "none",
  rentals: null,
  stays: null,
  review_count: null,
  review_average: null,
  reply_band: null,
  pidgin_ok: null,
};

beforeEach(() => {
  calls.length = 0;
  reported.length = 0;
  signedIn = true;
  rows = { passport_read: { data: [ROW], error: null } };
  handleRow = { data: { user_id: OWNER }, error: null };
});

describe("reading another member's passport", () => {
  it("is refused before any call when nobody is signed in", async () => {
    signedIn = false;
    const { readPassportOf, readPassportCard, passportIsOpen, readMyPassport } = await import("./passport-read");
    expect(await readPassportOf(OWNER)).toEqual({ state: "signed-out" });
    expect(await readPassportCard(OWNER)).toBeNull();
    expect(await passportIsOpen(OWNER)).toBe(false);
    expect(await readMyPassport()).toBeNull();
    expect(calls).toEqual([]);
  });

  it("returns what the function returned, for a signed-in member", async () => {
    const { readPassportOf } = await import("./passport-read");
    const result = await readPassportOf(OWNER);
    expect(result.state).toBe("found");
    if (result.state === "found") {
      expect(result.facts.name).toBe("Ada Okafor");
      expect(result.facts.joinedAt).toBe("2026-08-07T08:00:00Z");
      /* Lines the function nulled are absent here: nothing is filled in. */
      expect(result.facts.rentals).toBeNull();
      expect(result.facts.photo).toBeNull();
    }
    expect(calls).toEqual([{ fn: "passport_read", args: { p_subject: OWNER } }]);
  });

  it("makes every refusal one state: off, blocked and unknown look the same", async () => {
    const { readPassportOf } = await import("./passport-read");
    /* The function returns no row for off and for a block. */
    rows.passport_read = { data: [], error: null };
    expect(await readPassportOf(OWNER)).toEqual({ state: "unavailable" });
    rows.passport_read = { data: null, error: { code: "42501", message: "denied" } };
    expect(await readPassportOf(OWNER)).toEqual({ state: "unavailable" });
    /* A row about somebody else is not trusted. */
    rows.passport_read = { data: [{ ...ROW, subject_id: VIEWER }], error: null };
    expect(await readPassportOf(OWNER)).toEqual({ state: "unavailable" });
  });

  it("sends a member's own address to their own passport page, with no read", async () => {
    const { readPassportOf } = await import("./passport-read");
    expect(await readPassportOf(VIEWER)).toEqual({ state: "self" });
    expect(calls).toEqual([]);
  });

  it("resolves a handle to an account first, and a handle nobody holds is unavailable", async () => {
    const { readPassportOf } = await import("./passport-read");
    expect((await readPassportOf("@Ada")).state).toBe("found");
    expect(calls[0]).toEqual({ fn: "from:social_profiles", args: { column: "handle", value: "ada" } });
    handleRow = { data: null, error: null };
    expect(await readPassportOf("nobody")).toEqual({ state: "unavailable" });
    expect(await readPassportOf("not a handle!")).toEqual({ state: "unavailable" });
  });

  it("reports a fault but stays quiet while the function is not deployed yet", async () => {
    const { readPassportOf } = await import("./passport-read");
    rows.passport_read = { data: null, error: { code: "PGRST202", message: "Could not find the function" } };
    expect(await readPassportOf(OWNER)).toEqual({ state: "unavailable" });
    expect(reported).toEqual([]);
    rows.passport_read = { data: null, error: { code: "XX000", message: "boom", details: "row (ada@example.com)" } };
    expect(await readPassportOf(OWNER)).toEqual({ state: "unavailable" });
    expect(reported).toHaveLength(1);
    expect(String((reported[0] as Error).message)).not.toContain("ada@example.com");
  });
});

describe("the passport as a card in a chat", () => {
  it("draws for the owner's own message too, through the same function", async () => {
    const { readPassportCard } = await import("./passport-read");
    expect((await readPassportCard(OWNER))?.userId).toBe(OWNER);
    expect(calls).toEqual([{ fn: "passport_read", args: { p_subject: OWNER } }]);
  });

  it("is null for a refusal, and asks nothing for something that is not an account id", async () => {
    const { readPassportCard } = await import("./passport-read");
    rows.passport_read = { data: [], error: null };
    expect(await readPassportCard(OWNER)).toBeNull();
    calls.length = 0;
    expect(await readPassportCard("not-a-uuid")).toBeNull();
    expect(calls).toEqual([]);
  });
});

describe("the owner's own reads", () => {
  it("reads every line with the switches", async () => {
    rows.my_passport = { data: [{ ...ROW, rentals: 2, enabled: false, hidden_lines: ["reviews", "bogus"] }], error: null };
    const { readMyPassport } = await import("./passport-read");
    const mine = await readMyPassport();
    expect(mine?.facts.rentals).toBe(2);
    expect(mine?.settings).toEqual({ enabled: false, hidden: ["reviews"] });
  });

  it("says whether the passport is on, with no row meaning on, and a failed read meaning unknown", async () => {
    const { readMyPassportOn } = await import("./passport-read");
    expect(await readMyPassportOn()).toBe(true);
    rows["from:passport_settings"] = { data: { enabled: false }, error: null };
    expect(await readMyPassportOn()).toBe(false);
    rows["from:passport_settings"] = { data: null, error: { code: "XX000", message: "boom" } };
    expect(await readMyPassportOn()).toBeNull();
  });

  it("answers the profile button's question only with a clear yes, and never about oneself", async () => {
    const { passportIsOpen } = await import("./passport-read");
    rows.passport_open = { data: true, error: null };
    expect(await passportIsOpen(OWNER)).toBe(true);
    rows.passport_open = { data: false, error: null };
    expect(await passportIsOpen(OWNER)).toBe(false);
    rows.passport_open = { data: null, error: { code: "XX000", message: "boom" } };
    expect(await passportIsOpen(OWNER)).toBe(false);
    rows.passport_open = { data: true, error: null };
    expect(await passportIsOpen(VIEWER)).toBe(false);
  });
});
