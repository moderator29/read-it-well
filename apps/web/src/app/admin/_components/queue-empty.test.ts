import { describe, expect, it } from "vitest";
import { QUEUE_EMPTY_MARK, queueEmptyKind, type QueueEmptyKind } from "./queue-empty";

/**
 * AN EMPTY QUEUE IS THREE DIFFERENT FACTS AND ONLY ONE OF THEM IS GOOD NEWS.
 *
 * This is the guard for a decision that was wrong for a whole sprint with
 * nothing able to catch it. `QueueEmpty` drew an emerald tick whenever it was
 * not told otherwise, and six console pages rendered it for "nothing matched
 * your filter". So an operator who searched a name that has no rows was shown
 * "all clear" over a queue that may hold hundreds of untouched items, on the
 * console whose whole promise is that it has shown you everything.
 *
 * The rules below are the ones that cannot be allowed to drift back:
 *
 *   - exactly ONE kind is drawn as success;
 *   - a filter result is never that one;
 *   - a queue nothing has ever arrived at is never that one either;
 *   - the three marks are three different marks, because a shape that repeats
 *     carries no information.
 *
 * It is a data test rather than a render, deliberately. The decision is now a
 * lookup and a two-branch function, which is exactly the shape that can be
 * proved without a DOM, and it was moved out of the JSX so that it could be.
 */

const ALL: QueueEmptyKind[] = ["cleared", "never", "no-match"];

describe("which of the three an empty queue is", () => {
  it("reads `cleared` only from a page that says rows have arrived", () => {
    expect(queueEmptyKind(undefined, true)).toBe("cleared");
    expect(queueEmptyKind(undefined, false)).toBe("never");
  });

  it("lets an explicit state override the boolean, in both directions", () => {
    /* The boolean cannot express a filter result, which is why `state` exists.
       A page passing both must get what it named. */
    expect(queueEmptyKind("no-match", true)).toBe("no-match");
    expect(queueEmptyKind("no-match", false)).toBe("no-match");
    expect(queueEmptyKind("never", true)).toBe("never");
    expect(queueEmptyKind("cleared", false)).toBe("cleared");
  });
});

describe("how the three are drawn", () => {
  it("draws exactly one of them as success", () => {
    const success = ALL.filter((kind) => QUEUE_EMPTY_MARK[kind].success);
    expect(success).toEqual(["cleared"]);
  });

  it("never congratulates an operator for a filter that matched nothing", () => {
    expect(QUEUE_EMPTY_MARK["no-match"].success).toBe(false);
    expect(QUEUE_EMPTY_MARK["no-match"].icon).not.toBe(QUEUE_EMPTY_MARK.cleared.icon);
  });

  it("never congratulates an operator for work that never arrived", () => {
    expect(QUEUE_EMPTY_MARK.never.success).toBe(false);
    expect(QUEUE_EMPTY_MARK.never.icon).not.toBe(QUEUE_EMPTY_MARK.cleared.icon);
  });

  it("gives the three of them three different marks", () => {
    const icons = ALL.map((kind) => QUEUE_EMPTY_MARK[kind].icon);
    expect(new Set(icons).size).toBe(ALL.length);
  });

  it("covers every kind, so a fourth cannot be added without a mark", () => {
    for (const kind of ALL) expect(QUEUE_EMPTY_MARK[kind]).toBeTruthy();
    expect(Object.keys(QUEUE_EMPTY_MARK).sort()).toEqual([...ALL].sort());
  });
});
