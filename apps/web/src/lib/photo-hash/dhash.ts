/**
 * THE DIFFERENCE HASH (V-45). Pure: pixels in, 64 bits out.
 *
 * A photograph is shrunk to 9 by 8 grey pixels (the server does that with
 * sharp; see `hash-server.ts`). Along each of the eight rows, each of the
 * eight neighbouring pairs gives one bit: 1 when the left pixel is brighter.
 * Resizing, recompression, a WhatsApp round trip and a mild colour change
 * move a handful of bits; a different room moves about half of them.
 *
 * The 64 bits are stored as a SIGNED bigint (Postgres has no unsigned 64-bit
 * type), so the top bit becomes the sign. `toSigned64` and `fromSigned64` are
 * the only doors between the two, and `hamming` works on either.
 */

export const HASH_WIDTH = 9;
export const HASH_HEIGHT = 8;

/** Within this many differing bits, two photographs are the same scene. Mirrors the SQL. */
export const MATCH_MAX_BITS = 6;

const MASK64 = (BigInt(1) << BigInt(64)) - BigInt(1);

/** The unsigned hash of a 9 by 8 grey image, row-major. */
export function dHash(grey: ArrayLike<number>): bigint {
  if (grey.length !== HASH_WIDTH * HASH_HEIGHT) {
    throw new Error(`dHash wants ${HASH_WIDTH * HASH_HEIGHT} grey pixels, got ${grey.length}`);
  }
  let hash = BigInt(0);
  for (let y = 0; y < HASH_HEIGHT; y += 1) {
    for (let x = 0; x < HASH_WIDTH - 1; x += 1) {
      const left = grey[y * HASH_WIDTH + x] ?? 0;
      const right = grey[y * HASH_WIDTH + x + 1] ?? 0;
      hash = (hash << BigInt(1)) | (left > right ? BigInt(1) : BigInt(0));
    }
  }
  return hash;
}

/** Unsigned 64-bit to the signed value Postgres stores. */
export function toSigned64(unsigned: bigint): bigint {
  return BigInt.asIntN(64, unsigned & MASK64);
}

/** The signed value back to its 64 unsigned bits. */
export function fromSigned64(signed: bigint): bigint {
  return BigInt.asUintN(64, signed);
}

/** How many of the 64 bits differ. */
export function hamming(a: bigint, b: bigint): number {
  let x = BigInt.asUintN(64, a ^ b);
  let n = 0;
  while (x > BigInt(0)) {
    x &= x - BigInt(1);
    n += 1;
  }
  return n;
}

export type PhotoMatch = {
  photoId: string;
  photoPosition: number;
  matchListingId: string;
  matchReference: string | null;
  matchRejected: boolean;
  distance: number;
};

/** `public.listing_photo_matches` rows, narrowed. Rows that do not parse are dropped. */
export function photoMatchesFrom(rows: unknown): PhotoMatch[] {
  if (!Array.isArray(rows)) return [];
  const out: PhotoMatch[] = [];
  for (const r of rows as Record<string, unknown>[]) {
    if (typeof r?.photo_id !== "string" || typeof r.match_listing_id !== "string") continue;
    out.push({
      photoId: r.photo_id,
      photoPosition: typeof r.photo_position === "number" ? r.photo_position : 0,
      matchListingId: r.match_listing_id,
      matchReference: typeof r.match_reference === "string" ? r.match_reference : null,
      matchRejected: r.match_rejected === true,
      distance: typeof r.distance === "number" ? r.distance : MATCH_MAX_BITS,
    });
  }
  return out;
}

/**
 * The reviewer's one-line summary: how many of this listing's photographs
 * appear elsewhere, and how many of those on a rejected listing. Counts
 * PHOTOGRAPHS, not pairs: one photo lifted onto three listings is one.
 */
export function matchSummary(matches: PhotoMatch[], total: number): { matched: number; onRejected: number; total: number } {
  const matched = new Set(matches.map((m) => m.photoId));
  const onRejected = new Set(matches.filter((m) => m.matchRejected).map((m) => m.photoId));
  return { matched: matched.size, onRejected: onRejected.size, total };
}

/** `public.listing_photo_hash_coverage`, narrowed; null when it does not parse. */
export function coverageFrom(data: unknown): { photos: number; hashed: number; pool: number; poolWaiting: number } | null {
  const r = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  if (!r || typeof r !== "object") return null;
  const n = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null);
  const photos = n(r.photos);
  const hashed = n(r.hashed);
  const pool = n(r.pool);
  const poolWaiting = n(r.pool_waiting);
  if (photos === null || hashed === null || pool === null || poolWaiting === null) return null;
  return { photos, hashed, pool, poolWaiting };
}

/**
 * The desk's summary sentence has to say how much was compared. "None of
 * these look like another" is true only when every photograph was hashed,
 * there was something to compare against, and nothing on Vallo is waiting.
 */
export function comparedFully(c: { photos: number; hashed: number; pool: number; poolWaiting: number }): boolean {
  /* Photographs elsewhere on Vallo still waiting to be hashed are photographs
     this listing has not been compared with, so "no match" waits for them. */
  return c.photos > 0 && c.hashed === c.photos && c.pool > 0 && c.poolWaiting === 0;
}
