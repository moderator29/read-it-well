import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { carriesPrivateMetadata, scrubImage, scrubStoredPhoto } from "./scrub";

/**
 * SEC-04 / OPS-13: a photograph with a GPS position in its EXIF comes out of
 * the server step with no EXIF at all, upright, and still an image; and a file
 * that is not a JPEG, PNG or WebP is removed rather than attached.
 */
async function gpsTaggedJpeg(orientation = 1): Promise<Buffer> {
  return sharp({ create: { width: 40, height: 20, channels: 3, background: { r: 10, g: 60, b: 200 } } })
    .jpeg()
    .withMetadata({ orientation })
    .withExif({
      IFD0: { Make: "PhoneMaker", Model: "Phone 15" },
      IFD3: {
        GPSLatitudeRef: "N",
        GPSLatitude: "6/1 27/1 3000/100",
        GPSLongitudeRef: "E",
        GPSLongitude: "3/1 23/1 4000/100",
      },
    })
    .toBuffer();
}

const hasBytes = (buf: Buffer, text: string) => buf.includes(Buffer.from(text, "latin1"));

describe("scrubbing a photograph's metadata on the server", () => {
  it("the fixture really carries GPS (so the test can fail)", async () => {
    const tagged = await gpsTaggedJpeg();
    expect(await carriesPrivateMetadata(tagged)).toBe(true);
    expect(hasBytes(tagged, "PhoneMaker")).toBe(true);
    const meta = await sharp(tagged).metadata();
    expect(meta.exif?.length ?? 0).toBeGreaterThan(0);
  });

  it("removes EXIF (GPS, make, model) and keeps a valid JPEG", async () => {
    const result = await scrubImage(await gpsTaggedJpeg());
    expect(result.ok && result.changed).toBe(true);
    if (!result.ok || !result.changed) return;
    expect(result.contentType).toBe("image/jpeg");
    expect(await carriesPrivateMetadata(result.bytes)).toBe(false);
    expect(hasBytes(result.bytes, "PhoneMaker")).toBe(false);
    expect(hasBytes(result.bytes, "Exif")).toBe(false);
    const meta = await sharp(result.bytes).metadata();
    expect(meta.format).toBe("jpeg");
  });

  it("applies the orientation tag before dropping it, so the photo stays upright", async () => {
    const result = await scrubImage(await gpsTaggedJpeg(6));
    if (!result.ok || !result.changed) throw new Error("expected a rewrite");
    const meta = await sharp(result.bytes).metadata();
    expect([meta.width, meta.height]).toEqual([20, 40]);
  });

  it("leaves a clean photograph alone", async () => {
    const clean = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#123456" } }).png().toBuffer();
    expect(await scrubImage(clean)).toEqual({ ok: true, changed: false, format: "png" });
  });

  it("refuses what is not a JPEG, PNG or WebP, whatever it was declared as", async () => {
    const gif = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#000" } }).gif().toBuffer();
    expect(await scrubImage(gif)).toEqual({ ok: false, reason: "unsupported-format" });
    expect(await scrubImage(Buffer.from("not an image at all"))).toEqual({ ok: false, reason: "not-an-image" });
  });

  it("overwrites the stored object in place, and removes one it cannot use", async () => {
    const tagged = await gpsTaggedJpeg();
    const store = new Map<string, Buffer>([["u/p/a.jpg", tagged], ["u/p/b.jpg", Buffer.from("junk")]]);
    const bucket = {
      download: async (path: string) => {
        const buf = store.get(path);
        return buf ? { data: new Blob([new Uint8Array(buf)]), error: null } : { data: null, error: new Error("404") };
      },
      upload: async (path: string, body: Buffer) => {
        store.set(path, body);
        return { error: null };
      },
      remove: async (paths: string[]) => {
        for (const path of paths) store.delete(path);
        return { error: null };
      },
    };
    expect(await scrubStoredPhoto(bucket, "u/p/a.jpg")).toEqual({ ok: true, changed: true });
    expect(await carriesPrivateMetadata(store.get("u/p/a.jpg") as Buffer)).toBe(false);
    expect(await scrubStoredPhoto(bucket, "u/p/b.jpg")).toEqual({ ok: false, reason: "not-an-image" });
    expect(store.has("u/p/b.jpg")).toBe(false);
    expect(await scrubStoredPhoto(bucket, "u/p/missing.jpg")).toEqual({ ok: false, reason: "missing" });
  });
});
