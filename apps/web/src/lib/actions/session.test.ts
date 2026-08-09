import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The session memo.
 *
 * `resolveSession` is wrapped in React's `cache`, which turns the platform's
 * most-called server function into one auth round trip per request instead of
 * one per caller. The file's own header argues why that is safe. This spec
 * holds the two properties that argument depends on:
 *
 *   1. Two resolutions inside one request make ONE `auth.getUser()` call.
 *   2. The answer is identical, so a caller cannot tell it was memoised.
 *
 * It also holds the three outcomes themselves, because "unconfigured",
 * "signed-out" and "signed-in" are three genuinely different instructions to a
 * server action and collapsing any two of them is how an action starts
 * pretending.
 */

const env = vi.hoisted(() => ({ isSupabaseConfigured: vi.fn(() => true) }));
const getUser = vi.hoisted(() => vi.fn());
const server = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/lib/supabase/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/env")>();
  return { ...actual, ...env };
});

vi.mock("@/lib/supabase/server", () => server);

/**
 * A request scope, because a Vitest process is not one.
 *
 * React's `cache` stores its memo in whatever the current async dispatcher
 * hands back from `getCacheForType`, and when there is no dispatcher it simply
 * calls straight through with no memoisation at all. In the real app Next
 * installs that dispatcher per request over `AsyncLocalStorage`, which is what
 * makes the memo request-scoped and therefore safe. In a bare test there is no
 * dispatcher, so without this helper `cache` is a no-op and the memo could
 * silently stop working with every test still green.
 *
 * So this installs the smallest dispatcher that is faithful to the real one: a
 * Map per scope, cleared when the scope ends. It reaches for a React internal
 * to do it, which is a thing to do in a test and not in application code, and
 * the trade is worth naming: without it, THE ONE PROPERTY THIS FILE EXISTS TO
 * PROVE cannot be observed anywhere in the suite.
 */
type AsyncDispatcher = { getCacheForType: <T>(create: () => T) => T };

function enterRequestScope(): () => void {
  const internals = (
    React as unknown as {
      __SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: {
        A: AsyncDispatcher | null;
      };
    }
  ).__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

  const previous = internals.A;
  const store = new Map<unknown, unknown>();
  internals.A = {
    getCacheForType<T>(create: () => T): T {
      if (!store.has(create)) store.set(create, create());
      return store.get(create) as T;
    },
  };
  return () => {
    internals.A = previous;
  };
}

/**
 * A fresh module registry per test, so one test's memo is never the next one's
 * answer. This is the same reason the memo is safe in production: its lifetime
 * is a scope, not the process.
 */
async function loadSession() {
  vi.resetModules();
  return import("./session");
}

describe("resolveSession", () => {
  beforeEach(() => {
    getUser.mockReset();
    server.createClient.mockReset();
    env.isSupabaseConfigured.mockReset();
    env.isSupabaseConfigured.mockReturnValue(true);
    server.createClient.mockImplementation(async () => ({ auth: { getUser } }));
  });

  it("reports unconfigured without reaching for a client", async () => {
    env.isSupabaseConfigured.mockReturnValue(false);
    const { resolveSession } = await loadSession();

    expect(await resolveSession()).toEqual({ state: "unconfigured" });
    expect(server.createClient).not.toHaveBeenCalled();
  });

  it("reports signed-out when there is no user, and never invents one", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { resolveSession } = await loadSession();

    expect(await resolveSession()).toEqual({ state: "signed-out" });
  });

  it("returns the user and an RLS-bound client when signed in", async () => {
    const user = { id: "user-1", email: "ada@example.ng" };
    getUser.mockResolvedValue({ data: { user } });
    const { resolveSession } = await loadSession();

    const result = await resolveSession();
    expect(result.state).toBe("signed-in");
    if (result.state !== "signed-in") throw new Error("unreachable");
    expect(result.user).toBe(user);
    expect(result.supabase).toBeDefined();
  });

  /**
   * The performance property, stated as a test so it cannot quietly regress.
   *
   * Before the memo, `/home` alone resolved the session twice: once in the
   * layout through `getShellIdentity` and once in the page through
   * `getHomeOverview`. Both of those were already wrapped in `cache`, which is
   * exactly why the duplication was invisible; the memo was on the callers
   * rather than on the shared call.
   */
  it("makes one auth round trip however many callers ask", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const { resolveSession } = await loadSession();
    const leave = enterRequestScope();

    try {
      const [a, b, c] = await Promise.all([
        resolveSession(),
        resolveSession(),
        resolveSession(),
      ]);
      const d = await resolveSession();

      expect(getUser).toHaveBeenCalledTimes(1);
      expect(a).toBe(b);
      expect(b).toBe(c);
      expect(c).toBe(d);
    } finally {
      leave();
    }
  });

  /**
   * The safety half of the memo. Two requests are two scopes, so the second one
   * must ask again rather than inherit. A memo that survived a scope would be a
   * way to serve one person's session to the next caller, which is the only
   * genuinely dangerous thing a session cache can do.
   */
  it("does not leak an answer across scopes", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const { resolveSession } = await loadSession();

    const leaveFirst = enterRequestScope();
    const first = await resolveSession();
    leaveFirst();
    expect(first.state).toBe("signed-in");

    getUser.mockResolvedValue({ data: { user: null } });
    const leaveSecond = enterRequestScope();
    const second = await resolveSession();
    leaveSecond();

    expect(second).toEqual({ state: "signed-out" });
    expect(getUser).toHaveBeenCalledTimes(2);
  });
});
