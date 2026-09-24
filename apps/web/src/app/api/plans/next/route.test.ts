import { beforeEach, describe, expect, it, vi } from "vitest";

const seam = vi.hoisted(() => ({ answer: null as unknown, calls: [] as unknown[] }));
vi.mock("@/lib/security/rate-limit", () => ({ consume: async () => ({ allowed: true, degraded: false }) }));
vi.mock("@/lib/wallet/ledger", () => ({
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
});
