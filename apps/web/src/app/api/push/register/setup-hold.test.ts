import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * B-2 follow-up: a writing route holds a Google or Apple account that has not
 * finished setting up (terms + 18+). The proxy never redirects `/api`, so the
 * hold is the route's own, through `accountSetupOwed`.
 */

const seam = vi.hoisted(() => ({
  user: null as null | { id: string; app_metadata: Record<string, unknown> },
  rows: [] as { document: string }[],
  reads: 0,
  upserts: 0,
}));

vi.mock("@/lib/supabase/env", () => ({ isSupabaseConfigured: () => true }));
vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: seam.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          in: async () => {
            seam.reads += 1;
            return { data: seam.rows, error: null };
          },
        }),
      }),
    }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      /* The ownership check (a live token does not change hands): no row yet. */
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      upsert: () => {
        seam.upserts += 1;
        return { select: () => ({ maybeSingle: async () => ({ data: { device_ref: "ref-1" }, error: null }) }) };
      },
    }),
  }),
}));

const BODY = JSON.stringify({ platform: "android", token: "a-native-registration-token" });

function post() {
  return new Request("https://example.invalid/api/push/register", { method: "POST", body: BODY });
}

describe("POST /api/push/register: the finish-setup hold", () => {
  beforeEach(() => {
    seam.user = null;
    seam.rows = [];
    seam.reads = 0;
    seam.upserts = 0;
    vi.resetModules();
  });

  it("refuses a social-only account that owes the step, and writes nothing", async () => {
    seam.user = { id: "u-g", app_metadata: { provider: "google", providers: ["google"] } };
    const { POST } = await import("./route");

    const res = await POST(post());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ ok: false, reason: "setup_owed", next: "/sign-up/finish" });
    expect(seam.upserts).toBe(0);
  });

  it("allows the same account once the receipt is on file", async () => {
    seam.user = { id: "u-g", app_metadata: { provider: "google", providers: ["google"] } };
    seam.rows = [{ document: "terms" }, { document: "age_18_or_over" }];
    const { POST } = await import("./route");

    expect((await POST(post())).status).toBe(200);
    expect(seam.upserts).toBe(1);
  });

  it("never reads the record for an email account", async () => {
    seam.user = { id: "u-e", app_metadata: { provider: "email", providers: ["email"] } };
    const { POST } = await import("./route");

    expect((await POST(post())).status).toBe(200);
    expect(seam.reads).toBe(0);
  });
});
