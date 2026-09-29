import { describe, expect, it } from "vitest";
import { HEIC_NOT_SUPPORTED, isHeicLike, undecodablePhotoNotice } from "./photo-decode";

const FALLBACK = "We could not prepare that photo. Try another.";

describe("a photo the browser could not decode", () => {
  it("names HEIC and the fix, whether the browser gave a type or only a name", () => {
    expect(undecodablePhotoNotice({ type: "image/heic", name: "IMG_0001.HEIC" }, FALLBACK)).toBe(HEIC_NOT_SUPPORTED);
    expect(undecodablePhotoNotice({ type: "image/heif", name: "x" }, FALLBACK)).toBe(HEIC_NOT_SUPPORTED);
    expect(undecodablePhotoNotice({ type: "", name: "IMG_0001.heic" }, FALLBACK)).toBe(HEIC_NOT_SUPPORTED);
    expect(HEIC_NOT_SUPPORTED).toContain("JPEG or PNG");
    expect(HEIC_NOT_SUPPORTED).toContain("Most Compatible");
  });

  it("never calls it too narrow", () => {
    expect(HEIC_NOT_SUPPORTED.toLowerCase()).not.toContain("narrow");
  });

  it("keeps the wizard's own sentence for every other format", () => {
    expect(undecodablePhotoNotice({ type: "image/jpeg", name: "a.jpg" }, FALLBACK)).toBe(FALLBACK);
    expect(undecodablePhotoNotice({ type: "", name: "scan.tiff" }, FALLBACK)).toBe(FALLBACK);
  });

  it("recognises HEIC by type or extension only", () => {
    expect(isHeicLike({ type: "IMAGE/HEIC" })).toBe(true);
    expect(isHeicLike({ name: "photo.heif" })).toBe(true);
    expect(isHeicLike({ name: "heic.jpg", type: "image/jpeg" })).toBe(false);
    expect(isHeicLike({})).toBe(false);
  });
});
