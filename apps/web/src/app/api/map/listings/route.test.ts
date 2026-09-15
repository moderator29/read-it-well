import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The viewport endpoint.
 *
 * `lib/listings/bounds.test.ts` proves the box rules as pure functions. This
 * file proves the things only the handler can be wrong about: that a refusal
 * reaches the caller as a status they can act on, that an unknown filter value
 * is rejected rather than dropped, and that the limiter is consulted BEFORE any
 * work is done. That last one is the whole point of having a limiter: a limiter
 * that runs after the query has already been issued has limited nothing.
 */

/*
 * The mocks are typed against the REAL return types rather than against their
 * default implementations, for the reason the Paystack webhook spec spells out
 * next door: `vi.fn(async () => ({ allowed: true }))` infers the narrow literal,
 * and the rate-limited test can then never say `allowed: false` without a type
 * error against a mock narrower than the function it stands in for.
 */
type Verdict = Awaited<ReturnType<typeof import("@/lib/security/rate-limit").consume>>;
type BoundsResult = Awaited<
  ReturnType<typeof import("@/lib/listings/bounds").listingsInBounds>
>;

const limiter = vi.hoisted(() => ({
  consume: vi.fn(),
  ipFromHeaders: vi.fn(() => "197.210.0.1"),
  subjectForIp: vi.fn((ip: string) => `ip:${ip}`),
}));

const bounds = vi.hoisted(() => ({ listingsInBounds: vi.fn() }));

vi.mock("@/lib/security/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security/rate-limit")>();
  return { ...actual, ...limiter };
});

vi.mock("@/lib/listings/bounds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/listings/bounds")>();
  return { ...actual, ...bounds };
});

const { GET } = await import("./route");

const LAGOS = "west=3.38&south=6.41&east=3.52&north=6.47";

function get(query: string): Request {
  return new Request(`https://vallo.ng/api/map/listings?${query}`);
}

describe("map viewport endpoint", () => {
  beforeEach(() => {
    limiter.consume.mockReset();
    limiter.consume.mockResolvedValue({ allowed: true, degraded: false } satisfies Verdict);
    bounds.listingsInBounds.mockReset();
    bounds.listingsInBounds.mockResolvedValue({ ok: true, pins: [] } satisfies BoundsResult);
  });

  it("returns pins for an ordinary viewport", async () => {
    bounds.listingsInBounds.mockResolvedValue({
      ok: true,
      pins: [{ id: "a", title: "Flat", lat: 6.44, lng: 3.42 }],
    });

    const response = await GET(get(LAGOS));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.pins).toHaveLength(1);
    expect(body.capped).toBe(false);
  });

  it("says so when the answer was truncated, rather than implying it is complete", async () => {
    const { MAX_PINS } = await import("@/lib/listings/bounds");
    bounds.listingsInBounds.mockResolvedValue({
      ok: true,
      pins: Array.from({ length: MAX_PINS }, (_, i) => ({ id: String(i) })),
    });

    const body = await (await GET(get(LAGOS))).json();
    expect(body.capped).toBe(true);
  });

  /**
   * Three refusals, three statuses, because the map's response to each differs.
   * Collapsing them into one 400 would tell the surface "something was wrong"
   * when it needs to know whether to say "zoom in" or "you have panned off
   * Nigeria", and an empty result for the second reads as "no listings here".
   */
  it("distinguishes the three refusals", async () => {
    bounds.listingsInBounds.mockResolvedValue({ ok: false, reason: "malformed" });
    expect((await GET(get("west=abc"))).status).toBe(400);

    bounds.listingsInBounds.mockResolvedValue({ ok: false, reason: "too-wide" });
    const wide = await GET(get(LAGOS));
    expect(wide.status).toBe(422);
    expect((await wide.json()).reason).toBe("too-wide");

    bounds.listingsInBounds.mockResolvedValue({ ok: false, reason: "out-of-range" });
    const out = await GET(get(LAGOS));
    expect(out.status).toBe(422);
    expect((await out.json()).reason).toBe("out-of-range");
  });

  it("rejects an unknown kind or intent rather than quietly dropping it", async () => {
    expect((await GET(get(`${LAGOS}&kind=castle`))).status).toBe(400);
    expect((await GET(get(`${LAGOS}&intent=barter`))).status).toBe(400);
    expect(bounds.listingsInBounds).not.toHaveBeenCalled();
  });

  it("passes a known kind and intent through", async () => {
    await GET(get(`${LAGOS}&kind=rental&intent=rent&bedrooms=2&maxPrice=5000000`));
    expect(bounds.listingsInBounds).toHaveBeenCalledWith(
      { west: 3.38, south: 6.41, east: 3.52, north: 6.47 },
      expect.objectContaining({
        kind: "rental",
        intent: "rent",
        bedrooms: 2,
        maxPriceMinor: 5_000_000,
      }),
    );
  });

  /**
   * The limiter must run first. A limiter consulted after the database has
   * already been asked has not limited anything.
   */
  it("refuses a rate limited caller before doing any work", async () => {
    limiter.consume.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 120,
      retryIn: "in about 2 minutes",
    } satisfies Verdict);

    const response = await GET(get(LAGOS));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("120");
    expect((await response.json()).error).toContain("in about 2 minutes");
    expect(bounds.listingsInBounds).not.toHaveBeenCalled();
  });

  it("counts by address, in its own bucket", async () => {
    await GET(get(LAGOS));
    expect(limiter.consume).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: "map_bounds", subject: "ip:197.210.0.1" }),
    );
  });

  it("lets an intermediary cache a viewport briefly", async () => {
    const response = await GET(get(LAGOS));
    expect(response.headers.get("cache-control")).toContain("s-maxage=30");
  });
});
