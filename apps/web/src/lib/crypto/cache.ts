import "server-only";

/**
 * A keyed, in-process, time-to-live cache for upstream answers.
 *
 * `lib/cache/memo.ts` is the platform's one memo and this is deliberately not a
 * second copy of it. That memo holds ONE value per module-scope call and
 * absorbs every failure into a caller-supplied empty answer, which is right
 * for a reference table and wrong here twice over: the proxy caches one value
 * PER URL, and a failure has to reach the route as a reason the surface can
 * name ("upstream", "rate_limited") rather than as an empty markets table that
 * reads as "there are no coins".
 *
 * What it keeps from the memo, because those were the lessons: a fresh value
 * is served from memory until its TTL passes; concurrent loads of one key
 * collapse into one upstream call; a failed refresh serves the last good value
 * while it has one, since a minute-old price beats a blank screen during an
 * upstream wobble.
 *
 * Per instance, as every in-process cache is. That is fine for a public price
 * feed and would be wrong for anything a correctness argument depends on.
 */

export type Cached<T> = {
  data: T;
  /** ISO instant the value was loaded from upstream. */
  cachedAt: string;
};

type Held<T> = Cached<T> & { expires: number };

const MAX_KEYS = 500;

const held = new Map<string, Held<unknown>>();
const inFlight = new Map<string, Promise<Cached<unknown>>>();

function prune(now: number): void {
  for (const [key, entry] of held) {
    if (entry.expires <= now) held.delete(key);
  }
  if (held.size <= MAX_KEYS) return;
  // Still oversized after dropping the expired: drop the oldest insertions.
  const overflow = held.size - MAX_KEYS;
  let dropped = 0;
  for (const key of held.keys()) {
    held.delete(key);
    dropped += 1;
    if (dropped >= overflow) break;
  }
}

/**
 * The value for `key`, from memory while fresh, else from `load`.
 *
 * `load` may throw. With a stale value in hand the stale value is served and
 * the error is swallowed; with nothing in hand the error propagates, so the
 * caller decides what it means.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
  now: () => number = Date.now,
): Promise<Cached<T>> {
  const at = now();
  const fresh = held.get(key) as Held<T> | undefined;
  if (fresh && fresh.expires > at) return { data: fresh.data, cachedAt: fresh.cachedAt };

  const pending = inFlight.get(key) as Promise<Cached<T>> | undefined;
  if (pending) return pending;

  const refresh = (async (): Promise<Cached<T>> => {
    try {
      const data = await load();
      const loadedAt = now();
      const entry: Held<T> = {
        data,
        cachedAt: new Date(loadedAt).toISOString(),
        expires: loadedAt + ttlMs,
      };
      if (held.size >= MAX_KEYS) prune(loadedAt);
      held.set(key, entry);
      return { data, cachedAt: entry.cachedAt };
    } catch (error) {
      const stale = held.get(key) as Held<T> | undefined;
      if (stale) return { data: stale.data, cachedAt: stale.cachedAt };
      throw error;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, refresh as Promise<Cached<unknown>>);
  return refresh;
}

/** Forget everything. For tests. */
export function clearCryptoCache(): void {
  held.clear();
  inFlight.clear();
}
