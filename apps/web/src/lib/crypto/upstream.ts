import "server-only";

import type { CryptoFailureReason } from "./types";

/**
 * One bounded fetch against a public price API, and what its answer means.
 *
 * Both providers are reached through this so the two fetchers cannot disagree
 * about the things that matter at the boundary: the timeout, the fact that a
 * 429 from upstream is "rate_limited" rather than a generic failure (the
 * surface says "try again shortly" for one and "not available right now" for
 * the other), and the rule that nothing in an upstream error body is ever
 * read into a message. An upstream body can carry the key we sent in an echo
 * or a stack trace we did not ask for; the reason is all the route relays.
 */

/** How long a price call may wait. Nigerian mobile latency is the audience. */
const TIMEOUT_MS = 8_000;

export class UpstreamError extends Error {
  readonly reason: CryptoFailureReason;

  constructor(reason: CryptoFailureReason) {
    super(`crypto upstream: ${reason}`);
    this.name = "UpstreamError";
    this.reason = reason;
  }
}

/**
 * GET `url` and parse JSON, or throw an `UpstreamError` carrying the reason.
 *
 * The headers are the caller's: the API key travels in them and only in them,
 * never in the URL, so it can never land in a cache key or a log line.
 */
export async function fetchJson(url: string, headers: Record<string, string>): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json", ...headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new UpstreamError("upstream");
  }

  if (response.status === 429) throw new UpstreamError("rate_limited");
  if (response.status === 404) throw new UpstreamError("bad_request");
  if (!response.ok) throw new UpstreamError("upstream");

  try {
    return await response.json();
  } catch {
    throw new UpstreamError("upstream");
  }
}

/** The reason out of anything a fetcher threw. Unknown errors are upstream. */
export function reasonOf(error: unknown): CryptoFailureReason {
  return error instanceof UpstreamError ? error.reason : "upstream";
}

/* ---------------------------------------------------------- shape readers */

export function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** A finite number, or zero. Upstream nulls a field it has no figure for. */
export function num(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/** A list of finite numbers, dropping anything that is not one. */
export function numbers(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((n): n is number => typeof n === "number" && Number.isFinite(n));
}
