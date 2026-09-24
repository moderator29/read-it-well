/**
 * OPS-03: the uptime monitor's URL. 200 or 503 from the public catalogue read,
 * a bare path only (a query string is a fresh cache key per request), and a
 * per-address limit, so it cannot be used to drive database reads.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

let probe = { ok: true, reason: "ok" };
let allowed = true;
const probeCatalogue = vi.fn(async () => probe);
vi.mock("@/lib/ops/catalogue-canary", () => ({ probeCatalogue: () => probeCatalogue() }));
vi.mock("@/lib/security/rate-limit", () => ({
  consume: async () => (allowed ? { allowed: true, degraded: false } : { allowed: false, retryAfterSeconds: 42, retryIn: "" }),
  ipFromHeaders: () => "203.0.113.9",
  subjectForIp: (ip: string) => `ip:${ip}`,
}));

const { GET } = await import("./route");
const call = (url = "https://www.vallospaces.com/api/health/catalogue") => GET(new Request(url));

beforeEach(() => {
  probe = { ok: true, reason: "ok" };
  allowed = true;
  probeCatalogue.mockClear();
});

describe("GET /api/health/catalogue", () => {
  it("answers 200 and ok when the public catalogue read is healthy, cached briefly at the edge", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, reason: "ok" });
    expect(res.headers.get("cache-control")).toContain("s-maxage=30");
  });

  it("answers 503 with the reason token, and no rows, when it is not", async () => {
    probe = { ok: false, reason: "public_read_failed" };
    const res = await call();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, reason: "public_read_failed", checkedAt: expect.any(String) });
  });

  it("redirects a query string to the bare path without touching the database", async () => {
    const res = await call("https://www.vallospaces.com/api/health/catalogue?bust=123");
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://www.vallospaces.com/api/health/catalogue");
    expect(probeCatalogue).not.toHaveBeenCalled();
  });

  it("refuses an address over its limit with 429, without reading", async () => {
    allowed = false;
    const res = await call();
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("42");
    expect(probeCatalogue).not.toHaveBeenCalled();
  });
});
