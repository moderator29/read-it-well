import { beforeEach, describe, expect, it, vi } from "vitest";

type Verdict = Awaited<ReturnType<typeof import("@/lib/security/rate-limit").consume>>;

const limiter = vi.hoisted(() => ({
  consume: vi.fn(),
  ipFromHeaders: vi.fn(() => "197.210.0.1"),
  subjectForIp: vi.fn((ip: string) => `ip:${ip}`),
}));

const terminal = vi.hoisted(() => ({ fetchPairs: vi.fn() }));

vi.mock("@/lib/security/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security/rate-limit")>();
  return { ...actual, ...limiter };
});

vi.mock("@/lib/crypto/geckoterminal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/crypto/geckoterminal")>();
  return { ...actual, ...terminal };
});

const { GET } = await import("./route");

function get(query = ""): Request {
  return new Request(`https://vallospaces.com/api/crypto/pairs${query}`);
}

describe("GET /api/crypto/pairs", () => {
  beforeEach(() => {
    limiter.consume.mockReset();
    limiter.consume.mockResolvedValue({ allowed: true, degraded: false } satisfies Verdict);
    terminal.fetchPairs.mockReset();
  });

  it("answers the contract for the default network", async () => {
    terminal.fetchPairs.mockResolvedValue({ ok: true, data: [], cachedAt: "x" });
    const response = await GET(get());
    expect(response.status).toBe(200);
    expect(terminal.fetchPairs).toHaveBeenCalledWith({ network: "eth", query: "" });
    expect(await response.json()).toEqual({ ok: true, data: [], cachedAt: "x" });
  });

  it("trims the term and lower-cases the network", async () => {
    terminal.fetchPairs.mockResolvedValue({ ok: true, data: [], cachedAt: "x" });
    await GET(get("?network=Base&query=%20weth%20"));
    expect(terminal.fetchPairs).toHaveBeenCalledWith({ network: "base", query: "weth" });
  });

  it("relays an upstream failure as 502 and nothing else", async () => {
    terminal.fetchPairs.mockResolvedValue({ ok: false, reason: "upstream" });
    const response = await GET(get());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, reason: "upstream" });
  });

  it("is rate limited before upstream is asked", async () => {
    limiter.consume.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 5,
      retryIn: "in under a minute",
    } satisfies Verdict);
    const response = await GET(get());
    expect(response.status).toBe(429);
    expect(terminal.fetchPairs).not.toHaveBeenCalled();
  });
});
