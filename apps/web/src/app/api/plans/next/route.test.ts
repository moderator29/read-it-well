import { beforeEach, describe, expect, it, vi } from "vitest";

const seam = vi.hoisted(() => ({ answer: null as unknown, calls: [] as unknown[] }));
const limiter = vi.hoisted(() => ({ buckets: [] as string[], degraded: false }));
vi.mock("@/lib/security/rate-limit", () => ({
  consume: async (input: { bucket: string }) => {
    limiter.buckets.push(input.bucket);
    return { allowed: true, degraded: limiter.degraded };
  },
  ipFromHeaders: () => "203.0.113.9",
  subjectForIp: (ip: string) => `ip:${ip}`,
}));
vi.mock("@/lib/supabase/service", () => ({
  getAdminClient: () => ({
    rpc: async (_fn: string, args: unknown) => {
      seam.calls.push(args);
      return { data: seam.answer, error: null };
    },
  }),
}));

const TOKEN = "a".repeat(43);
const ask = (auth?: string) => new Request("https://www.vallospaces.com/api/plans/next", { headers: auth ? { authorization: auth } : {} });

beforeEach(() => {
  seam.answer = null;
  seam.calls = [];
  limiter.buckets = [];
  limiter.degraded = false;
});

describe("GET /api/plans/next (V-98)", () => {
  it("refuses without a well-formed token, before any read", async () => {
    const { GET } = await import("./route");
    expect((await GET(ask())).status).toBe(401);
    expect((await GET(ask("Bearer short"))).status).toBe(401);
    expect(seam.calls).toHaveLength(0);
  });
  it("sends only the hash, and 401s a token the database does not know", async () => {
    seam.answer = { status: "unauthorised" };
    const { GET } = await import("./route");
    expect((await GET(ask(`Bearer ${TOKEN}`))).status).toBe(401);
    expect(JSON.stringify(seam.calls)).not.toContain(TOKEN);
  });
  it("passes through only the fields the widget draws", async () => {
    seam.answer = { status: "ok", kind: "inspection", at: "2026-09-26T09:00:00Z", area: "Yaba", state: "LA", person: "Ada O.", address: "12 Herbert Macaulay Way", amount_minor: 5 };
    const { GET } = await import("./route");
    const response = await GET(ask(`Bearer ${TOKEN}`));
    const body = (await response.json()) as { next: Record<string, unknown> };
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.next).toMatchObject({ kind: "inspection", area: "Yaba", person: "Ada O." });
    expect(JSON.stringify(body)).not.toMatch(/Herbert|amount/);
  });
  it("counts the address before the token, and refuses when the limiter cannot count", async () => {
    seam.answer = { status: "ok", kind: "nothing" };
    const { GET } = await import("./route");
    expect((await GET(ask(`Bearer ${TOKEN}`))).status).toBe(200);
    expect(limiter.buckets).toEqual(["widget_next_up_ip", "widget_next_up"]);
    limiter.degraded = true;
    expect((await GET(ask(`Bearer ${TOKEN}`))).status).toBe(429);
  });
});
