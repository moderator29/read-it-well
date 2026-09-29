import { describe, expect, it } from "vitest";
import { savedBoardKey, uniqueBoardKeys } from "./saved-board-key";

/**
 * The shortlist's slot keys (e2e 2026-09-29, bug 7: a React duplicate-key
 * warning on `SavedBoard`). A listing and a place with the same id are two
 * cards; the same row twice is one.
 */
describe("savedBoardKey", () => {
  const id = "0b7a3c1e-2f4d-4c1a-9f7e-6a5b4c3d2e1f";

  it("keeps a listing, a stay and a restaurant with one id apart", () => {
    const keys = [
      savedBoardKey({ id }),
      savedBoardKey({ id, place: { kind: "accommodation" } }),
      savedBoardKey({ id, place: { kind: "restaurant" } }),
    ];
    expect(new Set(keys).size).toBe(3);
  });

  it("collapses a repeated row to one slot, in first-seen order", () => {
    expect(uniqueBoardKeys([{ id: "a" }, { id: "b" }, { id: "a" }])).toEqual(["listing:a", "listing:b"]);
  });

  it("the board keys its list by it, not by the bare id", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const source = readFileSync(join(process.cwd(), "src/app/(app)/saved/SavedBoard.tsx"), "utf8");
    expect(source).toMatch(/<li key=\{key\}>/);
    expect(source).not.toMatch(/<li key=\{id\}>/);
  });
});
