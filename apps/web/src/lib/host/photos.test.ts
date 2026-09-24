import { describe, expect, it } from "vitest";

import {
  MAX_BUSINESS_PHOTOS,
  PHOTO_MAX_BYTES,
  nextPhotoPosition,
  rejectPhoto,
} from "./photos";

/**
 * The two rules a venue's photographs stand on, in the form a machine can
 * check: what the bucket will accept, and which slot a new photograph takes.
 *
 * The second one is the interesting half. `business_photos.position` is unique
 * per venue and position 0 is the cover in every reader, so a wrong answer
 * here is either an insert that fails on the unique index with a refusal
 * nobody can act on, or a photograph that quietly becomes the picture on the
 * venue's card when nobody asked it to.
 */
describe("nextPhotoPosition", () => {
  it("gives the cover slot to the first photograph", () => {
    expect(nextPhotoPosition([])).toBe(0);
  });

  it("appends after a full run", () => {
    expect(nextPhotoPosition([0, 1, 2])).toBe(3);
  });

  it("fills the hole left by a photograph that was taken down", () => {
    /* The cover of three was removed, so the next upload becomes the cover.
       That is the only reordering control the surface offers. */
    expect(nextPhotoPosition([1, 2])).toBe(0);
    expect(nextPhotoPosition([0, 2, 3])).toBe(1);
  });

  it("does not care what order the taken slots arrive in", () => {
    expect(nextPhotoPosition([3, 0, 1])).toBe(2);
  });

  it("refuses an eleventh photograph rather than writing one the column bans", () => {
    const full = Array.from({ length: MAX_BUSINESS_PHOTOS }, (_, index) => index);
    expect(nextPhotoPosition(full)).toBeNull();
  });

  it("never answers with a position the check constraint would refuse", () => {
    for (let taken = 0; taken < MAX_BUSINESS_PHOTOS; taken += 1) {
      const answer = nextPhotoPosition(Array.from({ length: taken }, (_, i) => i));
      expect(answer).not.toBeNull();
      expect(answer).toBeGreaterThanOrEqual(0);
      expect(answer).toBeLessThan(MAX_BUSINESS_PHOTOS);
    }
  });
});

describe("rejectPhoto", () => {
  it("accepts what a phone produces", () => {
    expect(rejectPhoto({ type: "image/jpeg", size: 2_000_000 })).toBeNull();
    expect(rejectPhoto({ type: "image/webp", size: 10 })).toBeNull();
  });

  it("refuses HEIC, which the server cannot strip metadata from (SEC-04); iOS converts to JPEG at the picker", () => {
    expect(rejectPhoto({ type: "image/heic", size: 4_000_000 })).toContain("JPG");
  });

  it("refuses a PDF, which the bucket would refuse too", () => {
    expect(rejectPhoto({ type: "application/pdf", size: 10 })).toContain("JPG");
  });

  it("refuses a photograph over the bucket's own ceiling", () => {
    const refusal = rejectPhoto({ type: "image/jpeg", size: PHOTO_MAX_BYTES + 1 });
    expect(refusal).toContain("10MB");
  });

  it("accepts a photograph exactly at the ceiling", () => {
    expect(rejectPhoto({ type: "image/jpeg", size: PHOTO_MAX_BYTES })).toBeNull();
  });
});
