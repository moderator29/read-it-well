import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * OPS-12: the export route answers only a signed-in member, is paced, and
 * hands back a JSON attachment that no cache keeps.
 */
const seam = vi.hoisted(() => ({
  session: { state: "signed-out" } as Record<string, unknown>,
  allowed: true,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/actions/session", () => ({ resolveSession: async () => seam.session }));
vi.mock("@/lib/security/rate-limit", () => ({
  consume: async () =>
    seam.allowed ? { allowed: true, degraded: false } : { allowed: false, retryAfterSeconds: 60, retryIn: "in a minute" },
}));
vi.mock("@/lib/account/export", () => ({
  buildDataExport: async (_client: unknown, user: { id: string }) => ({
    format: "vallo.data-export.v1",
    generatedAt: "2026-09-24T01:02:03.000Z",
    account: { id: user.id },
  }),
}));

beforeEach(() => {
  seam.session = { state: "signed-out" };
  seam.allowed = true;
});

describe("GET /api/account/export", () => {
  it("refuses a signed-out caller", async () => {
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the member's own data as a JSON attachment, not cached", async () => {
    seam.session = { state: "signed-in", supabase: {}, user: { id: "957b3bd2-cce3-425d-bba9-5cd876ca3d62" } };
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="vallo-data-2026-09-24.json"');
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as { account: { id: string } };
    expect(body.account.id).toBe("957b3bd2-cce3-425d-bba9-5cd876ca3d62");
  });

  it("is paced", async () => {
    seam.session = { state: "signed-in", supabase: {}, user: { id: "u" } };
    seam.allowed = false;
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
  });
});
