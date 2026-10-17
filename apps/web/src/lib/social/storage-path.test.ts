import { describe, expect, it } from "vitest";
import { storagePathBelongsTo } from "./storage-path";

const ME = "11111111-1111-4111-8111-111111111111";
const THEM = "22222222-2222-4222-8222-222222222222";

describe("a storage path in the owner's folder", () => {
  it("takes a file in the owner's own folder (control)", () => {
    expect(storagePathBelongsTo(ME, `${ME}/${THEM}.jpg`)).toBe(true);
    expect(storagePathBelongsTo(ME, `${ME.toUpperCase()}/a.jpg`)).toBe(true);
  });

  it("refuses a climb out of the folder", () => {
    expect(storagePathBelongsTo(ME, `${ME}/../${THEM}/x.jpg`)).toBe(false);
    expect(storagePathBelongsTo(ME, `${ME}/./x.jpg`)).toBe(false);
  });

  it("refuses another folder, an empty segment, a backslash and a control character", () => {
    expect(storagePathBelongsTo(ME, `${THEM}/x.jpg`)).toBe(false);
    expect(storagePathBelongsTo(ME, `${ME}//x.jpg`)).toBe(false);
    expect(storagePathBelongsTo(ME, `${ME}/x.jpg/`)).toBe(false);
    expect(storagePathBelongsTo(ME, `${ME}\\..\\x.jpg`)).toBe(false);
    expect(storagePathBelongsTo(ME, `${ME}/\t/x.jpg`)).toBe(false);
    expect(storagePathBelongsTo(ME, `${ME}x/a.jpg`)).toBe(false);
  });

  it("refuses an empty, a bare or an oversized path", () => {
    expect(storagePathBelongsTo(ME, "")).toBe(false);
    expect(storagePathBelongsTo(ME, ME)).toBe(false);
    expect(storagePathBelongsTo(ME, `${ME}/${"a".repeat(400)}`)).toBe(false);
    expect(storagePathBelongsTo("", "/a.jpg")).toBe(false);
  });
});
