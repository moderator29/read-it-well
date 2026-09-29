import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SEC-03: the support acknowledgement goes to whatever address the filer
 * typed. A signed-out filer's words are not echoed in it (reference only),
 * and one address receives at most three a day, however many tickets name it.
 */
const state = vi.hoisted(() => ({
  signedIn: false,
  sent: [] as { to: string; subject: string; html: string; text: string }[],
  counts: new Map<string, number>(),
  degraded: false,
}));

function tickets() {
  const chain: Record<string, unknown> = {};
  for (const m of ["insert", "select"]) chain[m] = () => chain;
  chain["single"] = async () => ({ data: { id: "t1" }, error: null });
  return { from: () => chain };
}

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }) }));
vi.mock("../flags", () => ({ isFeatureEnabled: async () => true }));
vi.mock("../supabase/env", () => ({ isSupabaseConfigured: () => true }));
vi.mock("../supabase/admin", () => ({ createAdminClient: () => tickets() }));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "nc",
  resolveSession: async () =>
    state.signedIn ? { state: "signed-in", user: { id: "u1" }, supabase: tickets() } : { state: "signed-out" },
}));
vi.mock("../email/client", () => ({
  bestEffortEmail: async (work: () => Promise<unknown>) => {
    await work();
  },
  sendMessage: async (to: string, message: { subject: string; html: string; text: string }) => {
    state.sent.push({ to, ...message });
  },
}));
vi.mock("../security/rate-limit", async (importOriginal) => {
  const real = await importOriginal<typeof import("../security/rate-limit")>();
  return {
    ...real,
    consume: async ({ bucket, subject, limit }: { bucket: string; subject: string; limit: number }) => {
      if (state.degraded) return { allowed: true, degraded: true };
      const key = `${bucket}|${subject}`;
      const n = (state.counts.get(key) ?? 0) + 1;
      state.counts.set(key, n);
      return n <= limit ? { allowed: true, degraded: false } : { allowed: false, retryIn: "in an hour" };
    },
  };
});

const { fileSupportTicket } = await import("./actions");

const ATTACK = {
  name: "Wallet-frozen-verify-at-evil.example",
  email: "someone@example.invalid",
  topic: "other" as const,
  body: "Verify now at evil example dot com or lose your funds",
};

beforeEach(() => {
  state.signedIn = false;
  state.sent = [];
  state.counts.clear();
  state.degraded = false;
});

describe("the support acknowledgement is not a relay", () => {
  it("sends a signed-out filer the reference only, none of their words", async () => {
    const result = await fileSupportTicket(ATTACK);
    expect(result.ok).toBe(true);
    expect(state.sent).toHaveLength(1);
    const mail = JSON.stringify(state.sent[0]);
    expect(mail).toMatch(/VAL-SUP-\d{5}/);
    for (const words of ["evil", "Wallet-frozen"]) expect(mail).not.toContain(words);
  });

  it("still echoes a signed-in member's own question back to them (control)", async () => {
    state.signedIn = true;
    await fileSupportTicket({ ...ATTACK, topic: "payment", body: "When does my refund land?" });
    expect(JSON.stringify(state.sent[0])).toContain("When does my refund land?");
  });

  it("mails one address at most three times a day; the tickets themselves still file", async () => {
    const results = [];
    for (let i = 0; i < 5; i += 1) results.push(await fileSupportTicket({ ...ATTACK, name: `n${i}` }));
    expect(results.every((r) => r.ok)).toBe(true);
    expect(state.sent).toHaveLength(3);
  });

  it("counts one Gmail inbox once, however its address is dotted or tagged; mail still goes to the address typed", async () => {
    const spellings = ["some.one@gmail.com", "someone+a@gmail.com", "Some.One+b@googlemail.com", "s.o.m.e.o.n.e@gmail.com"];
    for (const email of spellings) await fileSupportTicket({ ...ATTACK, email });
    expect(state.sent.map((m) => m.to)).toEqual(spellings.slice(0, 3));
  });

  it("sends nothing when the counter cannot be read; the ticket still files", async () => {
    state.degraded = true;
    const result = await fileSupportTicket(ATTACK);
    expect(result.ok).toBe(true);
    expect(state.sent).toHaveLength(0);
  });
});
