import { describe, expect, it } from "vitest";

import { photoPathBelongsTo } from "./report-photo-path";

/**
 * I1b. A SIGNED UPLOAD PROVES WHERE THE BYTES WENT. IT DOES NOT PROVE WHAT THE
 * CALLER THEN SAYS ABOUT THEM.
 *
 * The bucket's own policy reads the first path segment, so nobody can write
 * bytes into another inspection's folder. `addReportPhoto` writes a row in a
 * different schema, and nothing about that storage policy stops a caller
 * posting somebody else's path alongside their own inspection id and hanging
 * that photo off their report. This is the check that stops it, and these are
 * the strings that matter.
 */

const ID = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

describe("photoPathBelongsTo", () => {
  it("accepts the shape this file issues, for every extension it issues", () => {
    for (const ext of ["jpg", "png", "webp", "heic", "pdf"]) {
      expect(photoPathBelongsTo(ID, `${ID}/abc-123.${ext}`), ext).toBe(true);
    }
  });

  it("refuses a path belonging to another inspection, which is the whole point", () => {
    expect(photoPathBelongsTo(ID, `${OTHER}/abc-123.jpg`)).toBe(false);
  });

  it("refuses a traversal dressed as a filename", () => {
    expect(photoPathBelongsTo(ID, `${ID}/../${OTHER}/abc.jpg`)).toBe(false);
    expect(photoPathBelongsTo(ID, `../${ID}/abc.jpg`)).toBe(false);
  });

  it("refuses an extension we never issue", () => {
    expect(photoPathBelongsTo(ID, `${ID}/abc.svg`)).toBe(false);
    expect(photoPathBelongsTo(ID, `${ID}/abc.html`)).toBe(false);
    expect(photoPathBelongsTo(ID, `${ID}/abc.jpg.html`)).toBe(false);
  });

  it("refuses a leaf that is only an extension, or has none", () => {
    /* `.jpg`.split(".").pop() is "jpg", so a naive check accepts a dotfile. */
    expect(photoPathBelongsTo(ID, `${ID}/.jpg`)).toBe(false);
    expect(photoPathBelongsTo(ID, `${ID}/abc`)).toBe(false);
  });

  it("refuses a path with no folder and a path with too many", () => {
    expect(photoPathBelongsTo(ID, "abc.jpg")).toBe(false);
    expect(photoPathBelongsTo(ID, `${ID}/nested/abc.jpg`)).toBe(false);
  });

  it("refuses an empty path rather than treating it as harmless", () => {
    expect(photoPathBelongsTo(ID, "")).toBe(false);
  });
});
