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
 * Reasons are for server logs and the admin diagnostic only. They carry the
 * status code, the host, and the upstream's own explanation, put through
 * `redactSecrets` first, so a credential cannot end up in a log line.
 */

export type HttpOutcome<T> = { ok: true; data: T } | { ok: false; reason: string };

/**
 * Every credential this process holds, so none of them can be echoed back.
 *
 * Read on each call rather than captured once: these are read from the
 * environment, a deploy can change them, and a stale copy would mean a live key
 * passing through unredacted. The list is short and the reads are free.
 *
 * This is belt and braces. An upstream is not supposed to quote your key back
 * at you, and the ones here do not. But the whole point of the change below is
 * that we no longer know what an upstream will say, so the guarantee has to
 * hold without knowing.
 */
function secrets(): string[] {
  return [
    process.env.GOOGLE_PLACES_API_KEY,
    process.env.GOOGLE_ROUTES_API_KEY,
    process.env.LITEAPI_KEY,
    process.env.AMADEUS_CLIENT_ID,
    process.env.AMADEUS_CLIENT_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.NEXT_PUBLIC_MAPTILER_KEY,
  ].filter((value): value is string => typeof value === "string" && value.length >= 8);
}

export function redactSecrets(text: string): string {
  let out = text;
  for (const secret of secrets()) out = out.split(secret).join("[redacted]");
  return out;
}

/**
 * What the upstream said about its own refusal, in one short line.
 *
 * This used to be discarded, and discarding it was the difference between a
 * diagnostic that names the fix and one that does not. Google answers a 403
 * with a body that says which of five completely different things is wrong:
 * the API not enabled on the project, billing off, the key restricted to
 * referrers it will never see from a server, the key restricted to a different
 * set of APIs, or the key expired. "answered 403" is the same string for all
 * five, and the owner cannot act on it.
 *
 * Bounded hard at 300 characters, JSON-shaped first (`error.message` is where
 * Google and most others put it), raw text second, and redacted either way.
 */
function explain(body: string): string {
  const text = body.trim();
  if (text.length === 0) return "";
  let said = text;
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const error = record["error"];
      const inner =
        error && typeof error === "object" ? (error as Record<string, unknown>) : record;
      const message = inner["message"] ?? inner["error_description"] ?? inner["detail"];
      if (typeof message === "string" && message.length > 0) said = message;
    }
  } catch {
    /* Not JSON. The raw text, trimmed, is still better than nothing. */
  }
  const flat = redactSecrets(said).replace(/\s+/g, " ").trim();
  return flat.length > 300 ? `${flat.slice(0, 297)}...` : flat;
}

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
      /* Read the body before giving up on it. `response.text()` cannot throw
         on a body that is not JSON, and a failed read is not worth failing the
         refusal over: the status and the host are still worth reporting. */
      let said = "";
      try {
        said = explain(await response.text());
      } catch {
        /* Body unreadable. The status alone still says something. */
      }
      return {
        ok: false,
        reason: said ? `${host} answered ${response.status}: ${said}` : `${host} answered ${response.status}`,
      };
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
