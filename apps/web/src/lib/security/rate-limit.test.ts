import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The limiter tripping, proven rather than believed.
 *
 * Postgres is the counter; this test stands in for it with a Map so the
 * module's own behaviour is what is under test: the verdict shape, the
 * retry copy, the deny cache that answers a spent subject without a round
 * trip, and the fail-open rule when the store is gone.
 */

const counts = new Map<string, number>();
let storeDown = false;
let calls = 0;

vi.mock("./service-rpc", () => ({
  hasServiceRole: () => true,
  callSecurityRpc: async (fn: string, args: Record<string, unknown>) => {
    calls += 1;
    if (storeDown) return { ok: false, reason: "timed out" };
    if (fn !== "consume_rate_limit") return { ok: false, reason: "unknown fn" };
    const key = `${args.bucket}|${args.subject}`;
    const next = (counts.get(key) ?? 0) + 1;
    counts.set(key, next);
    return { ok: true, data: next <= (args.limit_count as number) };
  },
}));

import { consume, retryIn, subjectForEmail, subjectForIp, subjectForUser } from "./rate-limit";

describe("consume", () => {
  beforeEach(() => {
    counts.clear();
    storeDown = false;
    calls = 0;
  });

  it("allows up to the limit and then refuses with a time to come back", async () => {
    const request = { bucket: "t_trip", subject: subjectForUser("u1"), limit: 3, windowSeconds: 600 };
    for (let i = 0; i < 3; i += 1) {
      expect(await consume(request)).toEqual({ allowed: true, degraded: false });
    }
    const denied = await consume(request);
    expect(denied.allowed).toBe(false);
    if (denied.allowed) throw new Error("unreachable");
    expect(denied.retryAfterSeconds).toBeGreaterThan(0);
    expect(denied.retryAfterSeconds).toBeLessThanOrEqual(600);
    expect(denied.retryIn.startsWith("in ")).toBe(true);
  });

  it("answers a spent subject from the deny cache without another round trip", async () => {
    const request = { bucket: "t_cache", subject: subjectForUser("u2"), limit: 1, windowSeconds: 600 };
    await consume(request);
    await consume(request);
    const before = calls;
    const again = await consume(request);
    expect(again.allowed).toBe(false);
    expect(calls).toBe(before);
  });

  it("keeps subjects and buckets apart", async () => {
    const a = { bucket: "t_apart", subject: subjectForUser("a"), limit: 1, windowSeconds: 600 };
    const b = { ...a, subject: subjectForUser("b") };
    const c = { ...a, bucket: "t_other" };
    await consume(a);
    expect((await consume(a)).allowed).toBe(false);
    expect((await consume(b)).allowed).toBe(true);
    expect((await consume(c)).allowed).toBe(true);
  });

  it("fails open, and says so, when the store cannot be reached", async () => {
    storeDown = true;
    const verdict = await consume({
      bucket: "t_open",
      subject: subjectForIp("203.0.113.9"),
      limit: 1,
      windowSeconds: 60,
    });
    expect(verdict).toEqual({ allowed: true, degraded: true });
  });

  it("treats a misconfigured request as no limit rather than denying everyone", async () => {
    expect(
      await consume({ bucket: "", subject: subjectForUser("x"), limit: 5, windowSeconds: 60 }),
    ).toEqual({ allowed: true, degraded: false });
    expect(
      await consume({ bucket: "t", subject: subjectForUser("x"), limit: 0, windowSeconds: 60 }),
    ).toEqual({ allowed: true, degraded: false });
    expect(calls).toBe(0);
  });
});

describe("subjects", () => {
  it("namespaces ids and addresses so they cannot collide", () => {
    expect(subjectForUser("abc")).toBe("user:abc");
    expect(subjectForIp("abc")).toBe("ip:abc");
  });

  it("hashes an email and ignores case and whitespace", () => {
    const a = subjectForEmail(" Ada@Example.com ");
    const b = subjectForEmail("ada@example.com");
    expect(a).toBe(b);
    expect(a.startsWith("email:")).toBe(true);
    expect(a).not.toContain("ada");
  });
});

describe("retryIn", () => {
  it("rounds to something a person can act on", () => {
    expect(retryIn(10)).toBe("in under a minute");
    expect(retryIn(70)).toBe("in about a minute");
    expect(retryIn(247)).toBe("in about 4 minutes");
    expect(retryIn(3_500)).toBe("in about an hour");
    expect(retryIn(7_200)).toBe("in about 2 hours");
    expect(retryIn(90_000)).toBe("tomorrow");
  });
});
