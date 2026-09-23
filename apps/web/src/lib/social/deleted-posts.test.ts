import { describe, expect, it } from "vitest";
import { conversationIsGone, isDeleted, pruneDeleted } from "./deleted-posts";

/**
 * The one rule behind item 4: a deleted row stays in a conversation only while
 * something that is still there hangs off it.
 */
type Row = { id: string; parentId: string | null; status: string };
const shape = (row: Row) => ({ id: row.id, parentId: row.parentId, deleted: isDeleted(row.status) });
const ids = (rows: Row[]) => pruneDeleted(rows, shape).map((row) => row.id);

describe("pruneDeleted", () => {
  it("drops a deleted reply nobody answered", () => {
    expect(
      ids([
        { id: "a", parentId: "root", status: "LIVE" },
        { id: "b", parentId: "root", status: "REMOVED" },
      ]),
    ).toEqual(["a"]);
  });

  it("keeps a deleted reply somebody answered, so the thread does not break", () => {
    expect(
      ids([
        { id: "b", parentId: "root", status: "REMOVED" },
        { id: "c", parentId: "b", status: "LIVE" },
      ]),
    ).toEqual(["b", "c"]);
  });

  it("keeps a deleted reply whose only live answer is deeper down", () => {
    expect(
      ids([
        { id: "b", parentId: "root", status: "REMOVED" },
        { id: "c", parentId: "b", status: "REMOVED" },
        { id: "d", parentId: "c", status: "LIVE" },
      ]),
    ).toEqual(["b", "c", "d"]);
  });

  it("drops a whole chain of deleted rows with nothing live at the end", () => {
    expect(
      ids([
        { id: "b", parentId: "root", status: "REMOVED" },
        { id: "c", parentId: "b", status: "REMOVED" },
        { id: "e", parentId: "root", status: "HELD" },
      ]),
    ).toEqual(["e"]);
  });

  it("survives a cycle a hand-edited row could create", () => {
    expect(
      ids([
        { id: "x", parentId: "y", status: "REMOVED" },
        { id: "y", parentId: "x", status: "REMOVED" },
      ]),
    ).toEqual([]);
  });
});

describe("conversationIsGone", () => {
  it("is gone only when the root is deleted and nothing is left under it", () => {
    expect(conversationIsGone(true, 0)).toBe(true);
    expect(conversationIsGone(true, 1)).toBe(false);
    expect(conversationIsGone(false, 0)).toBe(false);
  });
});
