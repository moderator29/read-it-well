import { describe, expect, it, vi } from "vitest";

/**
 * THE DEVICE LIST'S TWO SAFETY PROPERTIES, AND THEY ARE BOTH ABOUT WHAT IS
 * ABSENT RATHER THAN WHAT IS PRESENT.
 *
 *  1. NO PUSH TOKEN LEAVES THE DATABASE. `push_tokens.token` is a capability:
 *     whoever holds it can notify that handset. The read must name its
 *     columns and must never name that one, and must never use `*`, which
 *     would start carrying it the day somebody adds a column.
 *
 *  2. EVERY RETIREMENT IS SCOPED BY OWNER. The write goes through the service
 *     role, because `push_tokens` has no update policy at all, so row level
 *     security is not holding the line here and this code is. A missing
 *     `user_id` filter on a service-role update retires the whole platform's
 *     devices, and it would do it silently and irreversibly.
 *
 * Both are asserted against a recording double of the Supabase client rather
 * than a live database. The question asked before writing them was what they
 * would report if the thing they watch were broken, and the answer is checked
 * by mutation at the foot of this file's commit message: removing either
 * filter, or selecting `*`, fails here.
 */

type Call = { method: string; args: unknown[] };

/**
 * A Supabase query builder that writes down what was asked of it.
 *
 * It is thenable, so `await`ing the chain resolves like a real query, and
 * every builder method returns the same object, which is what the real client
 * does too.
 */
function recorder(result: { data: unknown; error: unknown }) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "update", "eq", "is", "order", "limit"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  const client = {
    from: (table: string) => {
      calls.push({ method: "from", args: [table] });
      return builder;
    },
  };
  return { calls, client };
}

function argsOf(calls: Call[], method: string): unknown[][] {
  return calls.filter((call) => call.method === method).map((call) => call.args);
}

const OWNER = "11111111-2222-4333-8444-555555555555";
const OTHER = "99999999-8888-4777-8666-555555555555";

describe("reading a person's devices", () => {
  it("never selects the token, and never selects everything", async () => {
    const { calls, client } = recorder({ data: [], error: null });
    vi.resetModules();
    vi.doMock("@/lib/actions/session", () => ({
      resolveSession: async () => ({ state: "signed-in", supabase: client, user: { id: OWNER } }),
    }));

    const { loadPushDevices } = await import("./devices");
    await loadPushDevices();

    const selects = argsOf(calls, "select").map((args) => String(args[0]));
    expect(selects).toHaveLength(1);
    const columns = selects[0] ?? "";

    /* The three that must never leave the table. `auth` is checked as a whole
       word so that `auth_id` style columns would not mask a real hit. */
    expect(columns).not.toContain("token");
    expect(columns).not.toContain("p256dh");
    expect(columns.split(/[\s,]+/)).not.toContain("auth");
    expect(columns).not.toContain("*");

    /* And the safe handle IS there, because a list that cannot tell two
       identical phones apart is not a list somebody can act on. */
    expect(columns).toContain("device_ref");
  });

  it("asks only for live devices", async () => {
    const { calls, client } = recorder({ data: [], error: null });
    vi.resetModules();
    vi.doMock("@/lib/actions/session", () => ({
      resolveSession: async () => ({ state: "signed-in", supabase: client, user: { id: OWNER } }),
    }));

    const { loadPushDevices } = await import("./devices");
    await loadPushDevices();

    expect(argsOf(calls, "is")).toContainEqual(["revoked_at", null]);
  });

  it("reports a failed read as unreadable rather than as an empty list", async () => {
    const { client } = recorder({ data: null, error: { message: "nope" } });
    vi.resetModules();
    vi.doMock("@/lib/actions/session", () => ({
      resolveSession: async () => ({ state: "signed-in", supabase: client, user: { id: OWNER } }),
    }));

    const { loadPushDevices } = await import("./devices");
    const state = await loadPushDevices();

    /* THE DIFFERENCE THAT MATTERS. "You have no devices" over a failed read
       is the screen inventing a fact, and the person would conclude the
       permission never took. */
    expect(state).toEqual({ state: "signed-in", devices: [], readable: false });
  });

  it("says signed out rather than reading anything", async () => {
    vi.resetModules();
    vi.doMock("@/lib/actions/session", () => ({
      resolveSession: async () => ({ state: "signed-out" }),
    }));

    const { loadPushDevices } = await import("./devices");
    expect(await loadPushDevices()).toEqual({ state: "signed-out" });
  });
});

describe("retiring a device", () => {
  async function revoke(target: { deviceId: string } | { all: true }) {
    const { calls, client } = recorder({ data: [{ id: "a" }], error: null });
    vi.resetModules();
    vi.doMock("@/lib/supabase/admin", () => ({ createAdminClient: () => client }));

    const { revokeTokens } = await import("./revoke");
    const outcome = await revokeTokens(OWNER, target);
    return { calls, outcome };
  }

  it("filters by owner when retiring one device", async () => {
    const { calls } = await revoke({ deviceId: "44444444-3333-4222-8111-000000000000" });
    expect(argsOf(calls, "eq")).toContainEqual(["user_id", OWNER]);
    expect(argsOf(calls, "eq")).toContainEqual(["id", "44444444-3333-4222-8111-000000000000"]);
  });

  it("filters by owner when retiring every device, which is the dangerous one", async () => {
    const { calls } = await revoke({ all: true });
    /* WITHOUT THIS EXACT LINE, "turn every device off" means every device on
       the platform. The service role does not have row level security to fall
       back on. */
    expect(argsOf(calls, "eq")).toContainEqual(["user_id", OWNER]);
    /* And nothing else, so the sweep is the person's own devices entire. */
    expect(argsOf(calls, "eq")).toHaveLength(1);
    expect(argsOf(calls, "eq")[0]?.[1]).not.toBe(OTHER);
  });

  it("leaves an already retired row alone so its timestamp keeps meaning something", async () => {
    const { calls } = await revoke({ all: true });
    expect(argsOf(calls, "is")).toContainEqual(["revoked_at", null]);
  });

  it("records who turned it off", async () => {
    const { calls } = await revoke({ all: true });
    const patch = argsOf(calls, "update")[0]?.[0] as Record<string, unknown>;
    expect(patch.revoked_reason).toBe("by_person");
    expect(typeof patch.revoked_at).toBe("string");
  });

  it("returns a count and never the rows, because a row carries a token", async () => {
    const { outcome } = await revoke({ all: true });
    expect(outcome).toEqual({ ok: true, revoked: 1 });
  });
});

describe("naming a device without reaching it", () => {
  it("prefers the label the device chose for itself", async () => {
    const { deviceName } = await import("./devices");
    expect(
      deviceName({
        id: "x",
        platform: "android",
        label: "Android phone",
        ref: "abc123abc123",
        lastSeen: { kind: "now" },
        firstSeen: { kind: "now" },
      }),
    ).toBe("Android phone");
  });

  it("falls back to the platform rather than to a blank or a placeholder", async () => {
    const { deviceName } = await import("./devices");
    const base = {
      id: "x",
      ref: "abc123abc123",
      lastSeen: { kind: "now" as const },
      firstSeen: { kind: "now" as const },
    };
    expect(deviceName({ ...base, platform: "ios", label: null })).toBe("iPhone or iPad");
    expect(deviceName({ ...base, platform: "android", label: "  " })).toBe("Android phone");
    expect(deviceName({ ...base, platform: "web", label: null })).toBe("A browser");
  });
});

describe("when a device was last reached", () => {
  it("reads each shape as a phrase somebody can act on", async () => {
    const { whenPhrase } = await import("./devices");
    expect(whenPhrase({ kind: "now" })).toBe("Just now");
    expect(whenPhrase({ kind: "minutes", minutes: 1 })).toBe("1 minute ago");
    expect(whenPhrase({ kind: "minutes", minutes: 14 })).toBe("14 minutes ago");
    expect(whenPhrase({ kind: "today", time: "14:05" })).toBe("Today at 14:05");
    expect(whenPhrase({ kind: "yesterday", time: "22:40" })).toBe("Yesterday at 22:40");
    expect(whenPhrase({ kind: "date", date: "3 Sep, 09:15" })).toBe("3 Sep, 09:15");
  });

  it("says nothing was recorded rather than inventing a time", async () => {
    const { whenPhrase } = await import("./devices");
    /* On a screen about trust, a confident wrong timestamp is worse than a
       gap. `Invalid Date` is worse than both. */
    expect(whenPhrase({ kind: "unknown" })).toBe("Not recorded");
  });
});
