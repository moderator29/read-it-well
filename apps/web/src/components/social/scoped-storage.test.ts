import { describe, expect, it } from "vitest";
import { readAdopting, type KeyValueStore } from "./scoped-storage";

/** A Map behind the three Storage calls the rule uses. */
function store(initial: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const LEGACY = "nf_seen_stories";
const MINE = "nf_seen_stories:viewer-1";

describe("adopting the pre-scope key", () => {
  it("gives a signed-in viewer's empty scope the old list, once, and deletes the old key", () => {
    const s = store({ [LEGACY]: '["a","b"]' });
    expect(readAdopting(s, MINE, LEGACY, true)).toBe('["a","b"]');
    expect(s.data.get(MINE)).toBe('["a","b"]');
    expect(s.data.has(LEGACY)).toBe(false);
  });

  it("adopts into a scope that holds an empty list", () => {
    const s = store({ [LEGACY]: '["a"]', [MINE]: "[]" });
    expect(readAdopting(s, MINE, LEGACY, true)).toBe('["a"]');
  });

  it("never overwrites a viewer's own list, and retires the old key so no second account inherits it", () => {
    const s = store({ [LEGACY]: '["a"]', [MINE]: '["z"]' });
    expect(readAdopting(s, MINE, LEGACY, true)).toBe('["z"]');
    expect(s.data.has(LEGACY)).toBe(false);
    expect(readAdopting(s, "nf_seen_stories:viewer-2", LEGACY, true)).toBeNull();
  });

  it("leaves the old key alone for a signed-out reader, who reads only their own scope", () => {
    const s = store({ [LEGACY]: '["a"]' });
    expect(readAdopting(s, "nf_seen_stories:anon", LEGACY, false)).toBeNull();
    expect(s.data.get(LEGACY)).toBe('["a"]');
  });

  it("reads the scope as it is when there is no old key", () => {
    expect(readAdopting(store({ [MINE]: '["q"]' }), MINE, LEGACY, true)).toBe('["q"]');
    expect(readAdopting(store(), MINE, LEGACY, true)).toBeNull();
  });
});
