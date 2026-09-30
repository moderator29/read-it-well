import "server-only";

import type { JobVerdict } from "../../bookings/lifecycle";
import { backfillPhotoHashes } from "../../photo-hash/hash-server";
import type { AdminClient } from "../rpc";

/**
 * C8: THE DUPLICATE-PHOTO HASHES FILL THEMSELVES.
 *
 * `listing_photo_hashes` held 0 rows against 228 `listing_photos` on
 * 30 September, because the backfill was a button on the review desk
 * (`PhotoBackfillButton.tsx`) that nobody pressed. New uploads are hashed on
 * submit (`listings-actions.ts`, `after(hashListingPhotos)`); this job hashes
 * the older ones, a bounded batch per run (`BACKFILL_BATCH` per round, a few
 * rounds), so the table fills over a few nights without a person.
 *
 * Scheduled by pg_cron through the app (migration
 * 20260930084536_c8_photo_hash_backfill_nightly.sql), behind the cron bearer
 * like every job here. A run that could not hash at all (no service role) is
 * attention; a run with nothing left to do is a clean no-op.
 */
const ROUNDS = 4;

export function photoBackfillVerdict(rounds: (number | null)[]): JobVerdict {
  const failed = rounds.some((r) => r === null);
  const hashed = rounds.reduce<number>((sum, r) => sum + (r ?? 0), 0);
  const counts = { hashed, rounds: rounds.length };
  if (failed && hashed === 0) {
    return {
      outcome: "attention",
      counts,
      detail: {},
      alert: { kind: "photo_hash.backfill_unavailable", severity: "info", detail: { rounds: rounds.length } },
    };
  }
  return { outcome: "ok", counts, detail: {}, alert: null };
}

export async function photoHashBackfill(_admin: AdminClient): Promise<JobVerdict> {
  const rounds: (number | null)[] = [];
  for (let i = 0; i < ROUNDS; i += 1) {
    const hashed = await backfillPhotoHashes();
    rounds.push(hashed);
    /* Nothing left, or nothing possible: stop early. */
    if (hashed === null || hashed === 0) break;
  }
  return photoBackfillVerdict(rounds);
}
