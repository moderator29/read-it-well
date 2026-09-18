import { beforeEach, describe, expect, it, vi } from "vitest";

type Verdict = Awaited<ReturnType<typeof import("@/lib/security/rate-limit").consume>>;

const limiter = vi.hoisted(() => ({
  consume: vi.fn(),
  ipFromHeaders: vi.fn(() => "197.210.0.1"),
  subjectForIp: vi.fn((ip: string) => `ip:${ip}`),
}));

const gecko = vi.hoisted(() => ({ fetchCoin: vi.fn() }));

vi.mock("@/lib/security/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security/rate-limit")>();
  return { ...actual, ...limiter };
});

vi.mock("@/lib/crypto/coingecko", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/crypto/coingecko")>();
  return { ...actual, ...gecko };
});

const { GET } = await import("./route");

function call(id: string, query = "") {
  return GET(new Request(`https://vallo.ng/api/crypto/coins/${id}${query}`), {
    params: Promise.resolve({ id }),
  });
}

describe("GET /api/crypto/coins/[id]", () => {
  beforeEach(() => {
    limiter.consume.mockReset();
    limiter.consume.mockResolvedValue({ allowed: true, degraded: false } satisfies Verdict);
    gecko.fetchCoin.mockReset();
  });

  it("passes a slug and the quote currency through", async () => {
    gecko.fetchCoin.mockResolvedValue({ ok: true, data: { id: "bitcoin" }, cachedAt: "x" });
    const response = await call("bitcoin", "?vs=usd");
    expect(response.status).toBe(200);
    expect(gecko.fetchCoin).toHaveBeenCalledWith("bitcoin", "usd");
  });

  it("refuses a non-slug id before fetching", async () => {
    const response = await call("..%2Fetc");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, reason: "bad_request" });
    expect(gecko.fetchCoin).not.toHaveBeenCalled();
  });

  it("answers unconfigured honestly", async () => {
    gecko.fetchCoin.mockResolvedValue({ ok: false, reason: "unconfigured" });
    const response = await call("bitcoin");
    expect(await response.json()).toEqual({ ok: false, reason: "unconfigured" });
  });

  it("is rate limited per address", async () => {
    limiter.consume.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 9,
      retryIn: "in under a minute",
    } satisfies Verdict);
    const response = await call("bitcoin");
    expect(response.status).toBe(429);
    expect(gecko.fetchCoin).not.toHaveBeenCalled();
  });
});
