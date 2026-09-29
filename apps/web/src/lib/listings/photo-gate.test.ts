import { describe, expect, it } from "vitest";
import { fileLine, isHeic, judgePhoto, looksLikeImage, MIN_PHOTO_LONG_EDGE, uploadErrorText } from "./photo-gate";

const jpeg = { type: "image/jpeg", name: "IMG_0001.jpg" };

describe("judgePhoto", () => {
  it("accepts a portrait photo whose long edge meets the minimum", () => {
    expect(judgePhoto(jpeg, { width: 1200, height: 1600 })).toBe("ok");
    expect(judgePhoto(jpeg, { width: 3024, height: 4032 })).toBe("ok");
  });

  it("accepts a WhatsApp forward at 1600 on the long edge, either way round", () => {
    expect(judgePhoto(jpeg, { width: 1600, height: 1200 })).toBe("ok");
    expect(judgePhoto(jpeg, { width: 1200, height: 1600 })).toBe("ok");
  });

  it("refuses a photo whose long edge is under the minimum", () => {
    expect(judgePhoto(jpeg, { width: 1080, height: MIN_PHOTO_LONG_EDGE - 1 })).toBe("too-small");
    expect(judgePhoto(jpeg, { width: 800, height: 600 })).toBe("too-small");
  });

  it("says HEIC, not too narrow, when the browser cannot decode an iPhone photo", () => {
    expect(judgePhoto({ type: "image/heic", name: "IMG_1.HEIC" }, null)).toBe("heic-undecodable");
    expect(judgePhoto({ type: "", name: "IMG_1.heic" }, null)).toBe("heic-undecodable");
    expect(judgePhoto({ type: "image/heif", name: "x" }, { width: 0, height: 0 })).toBe("heic-undecodable");
  });

  it("names any other decode failure as undecodable", () => {
    expect(judgePhoto(jpeg, null)).toBe("undecodable");
  });

  it("measures a HEIC the browser could decode (Safari) like any photo", () => {
    expect(judgePhoto({ type: "image/heic", name: "a.heic" }, { width: 3024, height: 4032 })).toBe("ok");
  });

  it("refuses a file that is not an image", () => {
    expect(judgePhoto({ type: "application/pdf", name: "deed.pdf" }, null)).toBe("not-image");
    expect(judgePhoto({ type: "", name: "notes.txt" }, null)).toBe("not-image");
  });
});

describe("isHeic and looksLikeImage", () => {
  it("reads the name when the type is empty", () => {
    expect(isHeic({ type: "", name: "photo.HEIF" })).toBe(true);
    expect(isHeic(jpeg)).toBe(false);
    expect(looksLikeImage({ type: "", name: "photo.heic" })).toBe(true);
    expect(looksLikeImage({ type: "", name: "photo" })).toBe(false);
  });
});

describe("uploadErrorText", () => {
  const fallback = "That photo did not finish uploading. Please try it again.";
  const words = { tooBig: "over 10MB", wrongType: "Use a JPEG, PNG or WebP photo.", signedOut: "Sign in again", failed: fallback };

  it("names a size refusal", () => {
    expect(uploadErrorText({ statusCode: "413", message: "Payload too large" }, words)).toMatch(/over 10MB/);
    expect(uploadErrorText({ message: "The object exceeded the maximum allowed size" }, words)).toMatch(/over 10MB/);
  });

  it("names a type refusal", () => {
    expect(uploadErrorText({ statusCode: 415, message: "mime type image/tiff is not supported" }, words)).toMatch(/JPEG, PNG or WebP/);
  });

  it("names a permission refusal", () => {
    expect(uploadErrorText({ statusCode: "403", message: "new row violates row-level security policy" }, words)).toMatch(/Sign in again/);
  });

  it("falls back for a dropped connection", () => {
    expect(uploadErrorText({ message: "Failed to fetch" }, words)).toBe(fallback);
    expect(uploadErrorText(null, words)).toBe(fallback);
  });
});

describe("fileLine", () => {
  it("prefixes the file name and shortens a long one", () => {
    expect(fileLine("a.jpg", "Too small")).toBe("a.jpg: Too small");
    const long = `${"x".repeat(50)}.jpg`;
    expect(fileLine(long, "r").length).toBeLessThan(long.length + 3);
    expect(fileLine("", "r")).toBe("r");
  });
});
