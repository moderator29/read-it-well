import "server-only";

/**
 * The one HTTP path every partner provider uses.
 *
 * Two rules make the provider layer safe to hang off a page render:
 *
 * 1. Nothing throws. A DNS failure, a 401, a socket abort and a body that is
 *    not JSON all come back as `{ ok: false, reason }`, so a provider can map
 *    an upstream problem into an empty result without a try/catch per call.
 * 2. Every call carries a deadline. The caller computes one absolute deadline
 *    for its whole conversation with an upstream and passes it to each hop, so
 *    three sequential calls share one budget rather than each getting the full
 *    one. When the budget is already spent the call is not even attempted.
 *
 * Reasons are for server logs only. They carry the status code and the host,
 * never a request body, so a credential cannot end up in a log line.
 */

export type HttpOutcome<T> = { ok: true; data: T } | { ok: false; reason: string };

/** Milliseconds left before `deadline`, floored at zero. */
export function remaining(deadline: number): number {
  return Math.max(0, deadline - Date.now());
}

export async function requestJson<T = unknown>(
  url: string,
  init: RequestInit,
  deadline: number,
): Promise<HttpOutcome<T>> {
  const budget = remaining(deadline);
  if (budget <= 0) return { ok: false, reason: "budget spent before the call" };

  let host = "upstream";
  try {
    host = new URL(url).host;
  } catch {
    return { ok: false, reason: "malformed url" };
  }

  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(budget),
      // Partner rates and venue details are live data behind someone else's
      // terms of service. Nothing here is allowed into the Next data cache.
      cache: "no-store",
    });
    if (!response.ok) {
      return { ok: false, reason: `${host} answered ${response.status}` };
    }
    const body = (await response.json()) as T;
    return { ok: true, data: body };
  } catch (error) {
    const name = error instanceof Error ? error.name : "unknown";
    if (name === "TimeoutError" || name === "AbortError") {
      return { ok: false, reason: `${host} timed out` };
    }
    return { ok: false, reason: `${host} unreachable` };
  }
}

/* ------------------------------------------------------------------ JSON reading
 *
 * Upstream payloads are `unknown` until proven otherwise. These four readers are
 * the only way this layer touches a parsed response, so a shape change at
 * Amadeus or Google turns into a missing field and a skipped listing rather
 * than a thrown page.
 */

export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
