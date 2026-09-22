import { describe, expect, it } from "vitest";
import { readEvery } from "./money";

describe("readEvery", () => {
  it("pages until a short page and reports the set complete", async () => {
    const table = Array.from({ length: 2500 }, (_, i) => i);
    const calls: [number, number][] = [];
    const out = await readEvery<number>(async (from, to) => {
      calls.push([from, to]);
      return { data: table.slice(from, to + 1), error: null };
    });
    expect(out?.rows).toHaveLength(2500);
    expect(out?.complete).toBe(true);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });
  it("admits it stopped at the ceiling rather than calling it a total", async () => {
    const out = await readEvery<number>(async (from, to) => ({ data: Array.from({ length: to - from + 1 }, () => 1), error: null }), 2000);
    expect(out?.rows).toHaveLength(2000);
    expect(out?.complete).toBe(false);
  });
  it("returns nothing at all on an error, because half a sum is a wrong sum", async () => {
    let n = 0;
    const out = await readEvery<number>(async () => (n++ === 0 ? { data: Array(1000).fill(1), error: null } : { data: null, error: new Error("x") }));
    expect(out).toBeNull();
  });
});
