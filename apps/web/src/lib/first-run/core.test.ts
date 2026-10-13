import { describe, expect, it } from "vitest";

import { isFirstRunFeature, markFirstRun, readFirstRun, type FirstRunDb } from "./core";

function db(over: Partial<FirstRunDb> & { rows?: Set<string> } = {}): FirstRunDb & { rows: Set<string> } {
  const rows = over.rows ?? new Set<string>();
  return {
    rows,
    userId: over.userId ?? (async () => "u1"),
    hasRow: over.hasRow ?? (async (_u, f) => rows.has(f)),
    mark: over.mark ?? (async (f) => void rows.add(f)),
  };
}

describe("first-run store (W7-R1)", () => {
  it("answers unseen, then seen after a mark", async () => {
    const d = db();
    expect(await readFirstRun(d, "host")).toBe("unseen");
    await markFirstRun(d, "host");
    await markFirstRun(d, "host");
    expect(await readFirstRun(d, "host")).toBe("seen");
    expect([...d.rows]).toEqual(["host"]);
  });

  it("signed out, a failing read, or a bad key is unknown, so the cookie decides", async () => {
    expect(await readFirstRun(db({ userId: async () => null }), "host")).toBe("unknown");
    expect(
      await readFirstRun(
        db({
          hasRow: async () => {
            throw new Error("down");
          },
        }),
        "host",
      ),
    ).toBe("unknown");
    expect(await readFirstRun(db(), "Not A Feature")).toBe("unknown");
  });

  it("a failing write never throws", async () => {
    await expect(
      markFirstRun(
        db({
          mark: async () => {
            throw new Error("down");
          },
        }),
        "host",
      ),
    ).resolves.toBeUndefined();
  });

  it("the key rule matches the database check", () => {
    expect(isFirstRunFeature("agreements")).toBe(true);
    expect(isFirstRunFeature("a".repeat(41))).toBe(false);
    expect(isFirstRunFeature("1host")).toBe(false);
  });
});
