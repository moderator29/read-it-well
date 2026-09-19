import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The markets endpoint: the limiter runs before anything else, the reply is
 * the contract and nothing else, and the cache header is on a good answer
 * and off a bad one.
 */
type Verdict = Awaited<ReturnType<typeof import("@/lib/security/rate-limit").consume>>;

const limiter = vi.hoisted(() => ({
  consume: vi.fn(),
  ipFromHeaders: vi.fn(() => "197.210.0.1"),
  subjectForIp: vi.fn((ip: string) => `ip:${ip}`),
}));

const gecko = vi.hoisted(() => ({ fetchMarkets: vi.fn() }));

vi.mock("@/lib/security/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security/rate-limit")>();
  return { ...actual, ...limiter };
});

vi.mock("@/lib/crypto/coingecko", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/crypto/coingecko")>();
  return { ...actual, ...gecko };
});

const { GET } = await import("./route");

function get(query = ""): Request {
  return new Request(`https://vallospaces.com/api/crypto/markets${query}`);
}

describe("GET /api/crypto/markets", () => {
  beforeEach(() => {
    limiter.consume.mockReset();
    limiter.consume.mockResolvedValue({ allowed: true, degraded: false } satisfies Verdict);
    gecko.fetchMarkets.mockReset();
  });

  it("answers the contract with a cache header on success", async () => {
    gecko.fetchMarkets.mockResolvedValue({
      ok: true,
      data: [{ id: "bitcoin" }],
      cachedAt: "2026-09-18T10:00:00.000Z",
    });
    const response = await GET(get("?vs=usd&per=10&page=2"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");
    expect(response.headers.get("cache-control")).toContain("stale-while-revalidate");
    expect(await response.json()).toEqual({
      ok: true,
      data: [{ id: "bitcoin" }],
      cachedAt: "2026-09-18T10:00:00.000Z",
    });
    expect(gecko.fetchMarkets).toHaveBeenCalledWith({ vs: "usd", per: 10, page: 2 });
  });

  it("answers unconfigured as 200 so the surface can draw its dark state", async () => {
    gecko.fetchMarkets.mockResolvedValue({ ok: false, reason: "unconfigured" });
    const response = await GET(get());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: false, reason: "unconfigured" });
  });

  it("answers upstream as 502 with nothing from upstream in it", async () => {
    gecko.fetchMarkets.mockResolvedValue({ ok: false, reason: "upstream" });
    const response = await GET(get());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, reason: "upstream" });
  });

  it("refuses a rate-limited caller before touching upstream", async () => {
    limiter.consume.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 42,
      retryIn: "in under a minute",
    } satisfies Verdict);
    const response = await GET(get());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    expect(await response.json()).toEqual({ ok: false, reason: "rate_limited" });
    expect(gecko.fetchMarkets).not.toHaveBeenCalled();
  });

  it("coerces a bad query to the defaults rather than refusing", async () => {
    gecko.fetchMarkets.mockResolvedValue({ ok: true, data: [], cachedAt: "x" });
    await GET(get("?vs=eur&per=999&page=abc"));
    expect(gecko.fetchMarkets).toHaveBeenCalledWith({ vs: "ngn", per: 50, page: 1 });
  });
});
