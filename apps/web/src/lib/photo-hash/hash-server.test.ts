import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { greyPixels } from "./hash-server";
import { MATCH_MAX_BITS, dHash, hamming } from "./dhash";

/** A synthetic "room": a gradient with a few blocks, as PNG bytes. */
async function room(seed: number, width = 640, height = 480): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const block = ((Math.floor(x / (80 + seed * 7)) + Math.floor(y / (60 + seed * 5))) % 3) * 60;
      const v = (x * (seed + 1) + y * (seed + 2) / 3 + block) % 256;
      const i = (y * width + x) * 3;
      raw[i] = v;
      raw[i + 1] = (v + seed * 40) % 256;
      raw[i + 2] = 255 - v;
    }
  }
  return sharp(raw, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

describe("hashing a real image file (V-45)", () => {
  it("gives the same scene the same hash after a resize and a JPEG round trip", async () => {
    const original = await room(1);
    const reposted = await sharp(original).resize(320).jpeg({ quality: 55 }).toBuffer();
    const a = dHash(await greyPixels(original));
    const b = dHash(await greyPixels(reposted));
    expect(hamming(a, b)).toBeLessThanOrEqual(MATCH_MAX_BITS);
  });

  it("tells a different scene apart", async () => {
    const a = dHash(await greyPixels(await room(1)));
    const b = dHash(await greyPixels(await room(4)));
    expect(hamming(a, b)).toBeGreaterThan(MATCH_MAX_BITS);
  });

  it("is written by the service role only, and hashed after every attach", () => {
    const src = readFileSync(join(__dirname, "hash-server.ts"), "utf8");
    expect(src).toContain('rpc("set_listing_photo_phash"');
    expect(src).toContain("if (!hasServiceRole()) return null;");
    const actions = readFileSync(join(__dirname, "../agent/listings-actions.ts"), "utf8");
    expect(actions).toContain("after(() => hashListingPhotos(listingId));");
  });
});
