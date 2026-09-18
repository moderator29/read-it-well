import { beforeEach, describe, expect, it, vi } from "vitest";

import { cached, clearCryptoCache } from "./cache";

/**
 * The three behaviours the proxy leans on: a fresh value is not refetched, a
 * failed refresh serves the stale value, and a cold failure reaches the
 * caller rather than becoming an empty table.
 */
describe("crypto cache", () => {
  beforeEach(() => clearCryptoCache());

  it("serves a fresh value from memory", async () => {
    let clock = 1_000;
    const load = vi.fn(async () => "a");
    const first = await cached("k", 60_000, load, () => clock);
    clock += 30_000;
    const second = await cached("k", 60_000, load, () => clock);
    expect(load).toHaveBeenCalledTimes(1);
    expect(second.data).toBe("a");
    expect(second.cachedAt).toBe(first.cachedAt);
  });

  it("reloads once the TTL has passed", async () => {
    let clock = 1_000;
    let value = "a";
    const load = vi.fn(async () => value);
    await cached("k", 60_000, load, () => clock);
    clock += 61_000;
    value = "b";
    const again = await cached("k", 60_000, load, () => clock);
    expect(load).toHaveBeenCalledTimes(2);
    expect(again.data).toBe("b");
  });

  it("serves the stale value when the refresh fails", async () => {
    let clock = 1_000;
    let fail = false;
    const load = vi.fn(async () => {
      if (fail) throw new Error("upstream down");
      return "a";
    });
    const first = await cached("k", 60_000, load, () => clock);
    clock += 61_000;
    fail = true;
    const stale = await cached("k", 60_000, load, () => clock);
    expect(stale.data).toBe("a");
    expect(stale.cachedAt).toBe(first.cachedAt);
  });

  it("lets a cold failure reach the caller", async () => {
    await expect(
      cached("cold", 60_000, async () => {
        throw new Error("upstream down");
      }),
    ).rejects.toThrow("upstream down");
  });

  it("collapses concurrent loads of one key into one call", async () => {
    let resolve: (v: string) => void = () => {};
    const load = vi.fn(() => new Promise<string>((r) => (resolve = r)));
    const a = cached("k", 60_000, load);
    const b = cached("k", 60_000, load);
    resolve("x");
    const [ra, rb] = await Promise.all([a, b]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(ra.data).toBe("x");
    expect(rb.data).toBe("x");
  });

  it("keeps keys apart", async () => {
    await cached("one", 60_000, async () => 1);
    const two = await cached("two", 60_000, async () => 2);
    expect(two.data).toBe(2);
  });
});
