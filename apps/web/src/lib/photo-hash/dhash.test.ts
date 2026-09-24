import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  comparedFully,
  coverageFrom,
  HASH_HEIGHT,
  HASH_WIDTH,
  MATCH_MAX_BITS,
  dHash,
  fromSigned64,
  hamming,
  matchSummary,
  photoMatchesFrom,
  toSigned64,
} from "./dhash";

/** A 9 by 8 grey image from a function of (x, y). */
function image(f: (x: number, y: number) => number): number[] {
  const out: number[] = [];
  for (let y = 0; y < HASH_HEIGHT; y += 1) for (let x = 0; x < HASH_WIDTH; x += 1) out.push(f(x, y));
  return out;
}

describe("the difference hash (V-45)", () => {
  it("sets a bit where the left pixel is brighter, row by row", () => {
    expect(dHash(image((x) => 255 - x * 20))).toBe((BigInt(1) << BigInt(64)) - BigInt(1));
    expect(dHash(image((x) => x * 20))).toBe(BigInt(0));
  });

  it("barely moves under a brightness change and a little noise", () => {
    const scene = image((x, y) => (x * 37 + y * 91) % 200);
    const brighter = scene.map((v, i) => Math.min(255, v + 30 + (i % 7 === 0 ? 2 : 0)));
    expect(hamming(dHash(scene), dHash(brighter))).toBeLessThanOrEqual(MATCH_MAX_BITS);
  });

  it("tells two different rooms apart", () => {
    const a = dHash(image((x, y) => (x * 37 + y * 91) % 200));
    const b = dHash(image((x, y) => (x * 13 + y * 7 + ((x * y) % 5) * 40) % 250));
    expect(hamming(a, b)).toBeGreaterThan(MATCH_MAX_BITS);
  });

  it("round-trips through the signed value Postgres stores, top bit included", () => {
    const top = BigInt(1) << BigInt(63);
    expect(toSigned64(top)).toBeLessThan(BigInt(0));
    expect(fromSigned64(toSigned64(top | BigInt(5)))).toBe(top | BigInt(5));
    expect(hamming(toSigned64(top), toSigned64(top | BigInt(3)))).toBe(2);
  });

  it("refuses an image of the wrong size", () => {
    expect(() => dHash([1, 2, 3])).toThrow();
  });
});

describe("the reviewer's summary", () => {
  const rows = [
    { photo_id: "p1", photo_position: 0, match_listing_id: "L2", match_reference: "VL-ABCDEF", match_rejected: false, distance: 2 },
    { photo_id: "p1", photo_position: 0, match_listing_id: "L3", match_reference: null, match_rejected: true, distance: 3 },
    { photo_id: "p4", photo_position: 3, match_listing_id: "L2", match_reference: "VL-ABCDEF", match_rejected: false, distance: 0 },
    { junk: true },
  ];

  it("counts photographs, not pairs, and those on a rejected listing", () => {
    const matches = photoMatchesFrom(rows);
    expect(matches).toHaveLength(3);
    expect(matchSummary(matches, 8)).toEqual({ matched: 2, onRejected: 1, total: 8 });
    expect(photoMatchesFrom(null)).toEqual([]);
  });

  it("uses the same threshold as the database", () => {
    const sql = readFileSync(
      join(__dirname, "../../../../../supabase/migrations/20260924131200_v45_stolen_photographs_caught_at_review.sql"),
      "utf8",
    );
    expect(sql).toContain(`bit_count((ph.phash # oh.phash)::bit(64)) <= ${MATCH_MAX_BITS}`);
  });
});

describe("how much was compared", () => {
  it("reads the coverage and refuses a row it cannot trust", () => {
    expect(coverageFrom([{ photos: 8, hashed: 6, pool: 120, pool_waiting: 40 }])).toEqual({ photos: 8, hashed: 6, pool: 120, poolWaiting: 40 });
    expect(coverageFrom([{ photos: 8 }])).toBeNull();
  });

  it("calls a listing fully compared only with every photo hashed and something to compare against", () => {
    expect(comparedFully({ photos: 8, hashed: 8, pool: 120 })).toBe(true);
    expect(comparedFully({ photos: 8, hashed: 6, pool: 120 })).toBe(false);
    expect(comparedFully({ photos: 8, hashed: 8, pool: 0 })).toBe(false);
    expect(comparedFully({ photos: 8, hashed: 8, pool: 120, poolWaiting: 0 })).toBe(true);
    expect(comparedFully({ photos: 8, hashed: 8, pool: 120, poolWaiting: 3 })).toBe(false);
  });

  it("never says no match on a partial comparison, and imports sharp only when hashing", () => {
    const panel = readFileSync(join(__dirname, "../../app/admin/listings/[id]/PhotoProvenance.tsx"), "utf8");
    expect(panel).toContain(": full\n            ? DESK.photosNone");
    const server = readFileSync(join(__dirname, "hash-server.ts"), "utf8");
    expect(server).toContain('await import("sharp")');
    expect(server).not.toMatch(/^import sharp/m);
  });
});
