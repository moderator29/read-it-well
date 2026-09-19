import { describe, expect, it } from "vitest";

import { encodeFeedCursor, parseFeedCursor } from "./posts-cursor";

/**
 * The feed cursor.
 *
 * The bug these prove against: `private.open_place_entries` writes its SYSTEM
 * entries with `now()`, which is the transaction timestamp, so every place
 * opened by one migration shares an identical `created_at`. A cursor of the
 * instant alone, read back with a strict `<`, stepped over every row at that
 * instant the page had not served yet. The cursor now names the row, so a
 * second page can neither repeat nor skip one.
 */

const AT = "2026-09-18T10:00:00.123456+00:00";
const ID = "6f1c2b0e-3d4a-4b5c-8d6e-7f8091a2b3c4";

describe("encodeFeedCursor", () => {
  it("names the row a page stopped on, instant and id", () => {
    expect(encodeFeedCursor(AT, ID)).toBe(`${AT}|${ID}`);
  });

  it("round trips through the parser", () => {
    expect(parseFeedCursor(encodeFeedCursor(AT, ID))).toEqual({ at: AT, id: ID });
  });
});

describe("parseFeedCursor", () => {
  it("reads an instant and an id", () => {
    expect(parseFeedCursor(`${AT}|${ID}`)).toEqual({ at: AT, id: ID });
  });

  it("still reads a bare instant, so a tab open across a deploy pages on", () => {
    expect(parseFeedCursor("2026-09-18T10:00:00.000Z")).toEqual({
      at: "2026-09-18T10:00:00.000Z",
      id: null,
    });
    expect(parseFeedCursor("2026-09-18T10:00:00+01:00")).toEqual({
      at: "2026-09-18T10:00:00+01:00",
      id: null,
    });
  });

  it("refuses anything that is not a cursor", () => {
    for (const bad of [
      null,
      undefined,
      "",
      "   ",
      "yesterday",
      "2026-09-18",
      "2026-09-18T10:00:00.000Z|lekki",
      `yesterday|${ID}`,
      `${AT}|`,
      `|${ID}`,
    ]) {
      expect(parseFeedCursor(bad as string | null | undefined)).toBeNull();
    }
  });

  it("refuses a cursor longer than any real one, so nothing long reaches Postgres", () => {
    expect(parseFeedCursor(`${AT}|${ID}${"x".repeat(200)}`)).toBeNull();
  });

  it("keeps two rows at the same instant apart, which is the whole point", () => {
    const other = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
    const first = parseFeedCursor(encodeFeedCursor(AT, ID));
    const second = parseFeedCursor(encodeFeedCursor(AT, other));
    expect(first?.at).toBe(second?.at);
    expect(first?.id).not.toBe(second?.id);
  });
});
