import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Minting a price share card writes a public row through the service role and
 * is open to a signed-out reader, so it is rate limited: per person, or per
 * address when there is no account.
 */

const state = vi.hoisted(() => ({
  allowed: true,
  signedIn: false,
  minted: 0,
  subjects: [] as string[],
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "197.210.0.1" }) }));
vi.mock("../supabase/env", () => ({ isSupabaseConfigured: () => true }));
vi.mock("../supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "unconfigured",
  resolveSession: async () =>
    state.signedIn ? { state: "signed-in", user: { id: "user-1" }, supabase: {} } : { state: "signed-out" },
}));
vi.mock("./rpc", () => ({
  insertPriceCheckWatch: vi.fn(),
  priceCheckRpc: vi.fn(async () => {
    state.minted += 1;
    return { data: "share-1", error: null };
  }),
}));
vi.mock("../security/rate-limit", () => ({
  consume: vi.fn(async (request: { subject: string }) => {
    state.subjects.push(request.subject);
    return state.allowed
      ? { allowed: true, degraded: false }
      : { allowed: false, retryAfterSeconds: 60, retryIn: "in about a minute" };
  }),
  ipFromHeaders: (h: Headers) => h.get("x-forwarded-for") ?? "unknown",
  subjectForIp: (ip: string) => `ip:${ip}`,
  subjectForUser: (id: string) => `user:${id}`,
}));

const { shareAreaPrices } = await import("./actions");

const CARD = {
  scope: "area",
  stateCode: "LA",
  listingIntent: "rent",
  lowMinor: 100_000_000,
  midMinor: 150_000_000,
  highMinor: 200_000_000,
  listingCount: 5,
};

beforeEach(() => {
  state.allowed = true;
  state.signedIn = false;
  state.minted = 0;
  state.subjects = [];
});

describe("shareAreaPrices is rate limited", () => {
  it("mints within the limit, counted by address when signed out", async () => {
    const result = await shareAreaPrices(CARD);
    expect(result).toEqual({ ok: true, data: { id: "share-1" } });
    expect(state.subjects).toEqual(["ip:197.210.0.1"]);
  });

  it("counts a signed-in reader by account", async () => {
    state.signedIn = true;
    await shareAreaPrices(CARD);
    expect(state.subjects).toEqual(["user:user-1"]);
  });

  it("mints nothing over the limit and says when to try again", async () => {
    state.allowed = false;
    const result = await shareAreaPrices(CARD);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("in about a minute");
    expect(state.minted).toBe(0);
  });
});
