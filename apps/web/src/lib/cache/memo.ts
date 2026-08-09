import "server-only";

/**
 * One in-process, time-to-live memo, because the codebase had grown three.
 *
 * `lib/platform-stats.ts` cached the landing page counts for five minutes,
 * `lib/listings/supabase-repository.ts` cached the `states` and `amenities`
 * reference tables for ten, and `lib/app/home-queries.ts` needed the same thing
 * for `states` and `local_governments` and did not have it. Each of the three
 * was a module-level `let cache = { value, expires }`, each worked, and each had
 * independently decided what to do when the read failed. Two of them cached the
 * failure.
 *
 * ## What this is, precisely, so nobody reaches for it wrongly
 *
 * This is a **per-instance** cache. On serverless, every warm instance holds its
 * own copy and a deploy clears them all. That is exactly right for reference
 * data that changes roughly never, and for marketing counts that do not need to
 * be accurate to the second.
 *
 * It is exactly WRONG for anything that has to be true across instances.
 * `lib/security/rate-limit.ts` opens with the story: a module-level Map was used
 * as a rate limiter, which meant a scripted caller got one full allowance per
 * instance and a fresh one after every restart, so it was not a limit at all.
 * That counter lives in Postgres now and must stay there. **Do not cache
 * anything here that a correctness argument depends on**: no balances, no
 * permissions, no limits, no escrow state.
 *
 * ## Three behaviours the ad hoc copies did not share
 *
 * 1. **A fresh value is served from memory** until its TTL expires.
 * 2. **A failed refresh keeps the last good value.** This is the reason to
 *    share the code at all. `getPlatformStats` stored `null` for five minutes
 *    after one bad read, so a two-second database blip cost the landing page its
 *    numbers for five minutes after the database had recovered. Stale reference
 *    data is nearly always better than no reference data, and where it is not,
 *    the caller should not be caching.
 * 3. **Concurrent refreshes collapse into one.** Three requests arriving at the
 *    moment a TTL expires used to make three identical database calls. The
 *    in-flight promise is shared, so they make one and all three wait on it.
 *
 * Nothing here throws. A loader that rejects with no previous value yields the
 * caller's own empty answer, which is the same contract every call site already
 * had.
 */

export type Memo<T> = {
  /** The value, fresh or refreshed. Never throws. */
  get: () => Promise<T>;
  /** Drop what is held, so the next `get` reloads. For tests and for writers. */
  clear: () => void;
};

export type MemoOptions<T> = {
  /** How long a loaded value stays fresh, in milliseconds. */
  ttlMs: number;
  /** Produces the value. May throw or reject; the memo absorbs it. */
  load: () => Promise<T>;
  /**
   * What to serve when the loader has never once succeeded.
   *
   * Required, and required on purpose: a memo that could hand back `undefined`
   * on a cold failure pushes the "did this work" question out to every call
   * site, which is how three of them ended up answering it differently. The
   * empty answer is a decision the owner of the data makes once, here.
   */
  empty: T;
  /**
   * True when a loaded value should be treated as a failure and not cached.
   *
   * Optional, and it exists for one real case: a loader that swallows its own
   * errors and returns `null` rather than rejecting. Without this the memo
   * cannot tell that answer apart from a genuine one and would hold it for the
   * full TTL. See `getPlatformStats`, where `null` means "we do not know" and
   * must never be cached for five minutes.
   */
  isFailure?: (value: T) => boolean;
};

type Held<T> = { value: T; expires: number };

/**
 * Build a memo. Call this once at module scope, never inside a function: a memo
 * created per call is a memo that never hits.
 */
export function memo<T>(options: MemoOptions<T>): Memo<T> {
  const { ttlMs, load, empty, isFailure } = options;

  let held: Held<T> | null = null;
  let inFlight: Promise<T> | null = null;

  const failed = (value: T): boolean => (isFailure ? isFailure(value) : false);

  async function refresh(): Promise<T> {
    try {
      const value = await load();
      if (failed(value)) {
        // A loader that reported its own failure in-band. Keep whatever we had,
        // and let the next caller try again rather than holding the failure.
        return held ? held.value : value;
      }
      held = { value, expires: Date.now() + ttlMs };
      return value;
    } catch {
      // The last good value outlives the outage that interrupted it. With no
      // last good value there is nothing honest to serve but the empty answer.
      return held ? held.value : empty;
    } finally {
      inFlight = null;
    }
  }

  return {
    async get(): Promise<T> {
      const now = Date.now();
      if (held && held.expires > now) return held.value;
      // Whoever arrives first starts the load; everybody else waits on it.
      inFlight ??= refresh();
      return inFlight;
    },
    clear(): void {
      held = null;
      inFlight = null;
    },
  };
}
