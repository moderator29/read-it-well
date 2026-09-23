import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * UX-24: a signed-out profile read must not name a column `anon` is denied.
 *
 * PostgREST answers `permission denied` for the WHOLE read when one selected
 * column is not granted, so a signed-out `/u/<handle>` that still asked for
 * `home_area_id` would stop rendering the profile at all the moment the
 * grant was narrowed. The fake client below refuses exactly the way the
 * database does, and records what each read asked for.
 */

vi.mock("server-only", () => ({}));

const DENIED = ["occupation_code", "lga_code", "state_code", "home_area_id"];
const asked: { table: string; columns: string; signedIn: boolean }[] = [];

type Result = { data: unknown; error: { code: string; message: string } | null; count?: number };

function fakeClient(signedIn: boolean) {
  const builder = (table: string): unknown => {
    let result: Result = { data: null, error: null };
    const chain: Record<string, unknown> = {};
    const self = new Proxy(chain, {
      get(_target, prop: string) {
        if (prop === "then") {
          return (resolve: (value: Result) => unknown) => resolve(result);
        }
        return (...args: unknown[]) => {
          if (prop === "select") {
            const columns = String(args[0] ?? "*");
            asked.push({ table, columns, signedIn });
            if (table === "social_profiles") {
              const named = columns.split(",").map((c) => c.trim());
              const refused = !signedIn && (named.includes("*") || named.some((c) => DENIED.includes(c)));
              result = refused
                ? { data: null, error: { code: "42501", message: "permission denied for table social_profiles" } }
                : {
                    data: {
                      user_id: "11111111-1111-4111-8111-111111111111",
                      handle: "tolu",
                      display_label: "Tolu",
                      avatar_path: null,
                      is_agent: false,
                      bio: "",
                      bio_status: "LIVE",
                      pronouns: null,
                      link: null,
                      contact_policy: "REQUEST",
                      pidgin_ok: false,
                      ...(named.includes("home_area_id") ? { home_area_id: null } : {}),
                      cover_path: null,
                      follower_count: 0,
                      following_count: 0,
                      post_count: 0,
                      handle_claimed_at: "2026-09-01T00:00:00Z",
                    },
                    error: null,
                  };
            }
          }
          return self;
        };
      },
    });
    return self;
  };
  return {
    from: (table: string) => builder(table),
    rpc: () => Promise.resolve({ data: null, error: null }),
  };
}

let session: { state: string; supabase?: unknown; user?: { id: string } } = { state: "signed-out" };

vi.mock("../actions/session", () => ({ resolveSession: () => Promise.resolve(session) }));
vi.mock("../supabase/server", () => ({ createClient: () => Promise.resolve(fakeClient(false)) }));
vi.mock("../supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("not configured in this test");
  },
}));
vi.mock("../trust/badge-tier", () => ({ readPersonBadges: () => Promise.resolve(new Map()) }));

const { loadPublicProfile, ANON_PROFILE_COLUMNS } = await import("./profiles-queries");

describe("a signed-out read of a profile (UX-24)", () => {
  beforeEach(() => {
    asked.length = 0;
  });

  it("names none of the columns anon is denied", () => {
    const named = ANON_PROFILE_COLUMNS.split(",").map((c) => c.trim());
    for (const column of DENIED) expect(named).not.toContain(column);
    expect(named).toContain("handle");
    expect(named).toContain("display_label");
  });

  it("still renders the profile for somebody who is not signed in", async () => {
    session = { state: "signed-out" };
    const state = await loadPublicProfile("tolu");
    const profileReads = asked.filter((r) => r.table === "social_profiles");
    expect(profileReads.length).toBeGreaterThan(0);
    for (const read of profileReads) {
      for (const column of DENIED) expect(read.columns).not.toContain(column);
    }
    expect(state.state).not.toBe("malformed");
  });

  it("keeps the home area for a signed-in reader", async () => {
    session = { state: "signed-in", supabase: fakeClient(true), user: { id: "22222222-2222-4222-8222-222222222222" } };
    await loadPublicProfile("tolu");
    const first = asked.find((r) => r.table === "social_profiles");
    expect(first?.columns).toContain("home_area_id");
  });
});
