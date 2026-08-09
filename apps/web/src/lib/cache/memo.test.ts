import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { memo } from "./memo";

/**
 * The shared TTL memo.
 *
 * Three of these were written independently before this module existed and the
 * differences between them were not stylistic: two cached their own failures,
 * none of them collapsed a concurrent refresh. Those two properties are why the
 * helper is shared, so they are the two this file is mostly about.
 */
describe("memo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads once and serves from memory until the ttl expires", async () => {
    const load = vi.fn(async () => "lagos");
    const cached = memo({ ttlMs: 1_000, load, empty: "" });

    expect(await cached.get()).toBe("lagos");
    expect(await cached.get()).toBe("lagos");
    expect(load).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(999);
    expect(await cached.get()).toBe("lagos");
    expect(load).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2);
    expect(await cached.get()).toBe("lagos");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("collapses concurrent refreshes into one load", async () => {
    const gate: { resolve: (value: number) => void } = { resolve: () => {} };
    const load = vi.fn(
      () =>
        new Promise<number>((r) => {
          gate.resolve = r;
        }),
    );
    const cached = memo({ ttlMs: 1_000, load, empty: 0 });

    const all = Promise.all([cached.get(), cached.get(), cached.get()]);
    expect(load).toHaveBeenCalledTimes(1);

    gate.resolve(7);
    expect(await all).toEqual([7, 7, 7]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  /**
   * The entry this whole module exists for. A blip must not outlive itself.
   */
  it("keeps the last good value when a refresh throws", async () => {
    let attempt = 0;
    const load = vi.fn(async () => {
      attempt += 1;
      if (attempt === 2) throw new Error("database unreachable");
      return `value-${attempt}`;
    });
    const cached = memo({ ttlMs: 1_000, load, empty: "empty" });

    expect(await cached.get()).toBe("value-1");

    vi.advanceTimersByTime(1_001);
    expect(await cached.get()).toBe("value-1");

    // And the failure was not cached, so the very next call tries again.
    expect(await cached.get()).toBe("value-3");
  });

  it("serves the empty answer when the loader has never once succeeded", async () => {
    const load = vi.fn(async () => {
      throw new Error("no keys");
    });
    const cached = memo({ ttlMs: 1_000, load, empty: "nothing" });

    expect(await cached.get()).toBe("nothing");
    expect(await cached.get()).toBe("nothing");
    expect(load).toHaveBeenCalledTimes(2);
  });

  /**
   * For loaders that swallow their own errors and report failure in-band, which
   * is the shape `getPlatformStats` has: `null` there means "we do not know",
   * and caching it for five minutes is what turned a two-second blip into a
   * five-minute one.
   */
  it("does not cache a value the caller declares a failure", async () => {
    const values: (string | null)[] = [null, null, "real"];
    let i = 0;
    const load = vi.fn(async () => values[i++] ?? null);
    const cached = memo<string | null>({
      ttlMs: 60_000,
      load,
      empty: null,
      isFailure: (value) => value === null,
    });

    expect(await cached.get()).toBeNull();
    expect(await cached.get()).toBeNull();
    expect(await cached.get()).toBe("real");
    expect(load).toHaveBeenCalledTimes(3);

    // Once a real value lands it is held for the full ttl.
    expect(await cached.get()).toBe("real");
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("keeps the last good value when a later load reports failure in-band", async () => {
    const values: (string | null)[] = ["good", null];
    let i = 0;
    const load = vi.fn(async () => values[i++] ?? null);
    const cached = memo<string | null>({
      ttlMs: 1_000,
      load,
      empty: null,
      isFailure: (value) => value === null,
    });

    expect(await cached.get()).toBe("good");
    vi.advanceTimersByTime(1_001);
    expect(await cached.get()).toBe("good");
  });

  it("clear forces the next get to reload", async () => {
    const load = vi.fn(async () => "one");
    const cached = memo({ ttlMs: 60_000, load, empty: "" });

    await cached.get();
    expect(load).toHaveBeenCalledTimes(1);

    cached.clear();
    await cached.get();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
