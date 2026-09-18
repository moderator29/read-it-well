import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { consume, ipFromHeaders, subjectForIp } from "@/lib/security/rate-limit";

import { VS_CURRENCIES, type CryptoFailureReason, type CryptoResult } from "./types";

/**
 * What the three crypto routes share: the limiter, the schemas and the reply.
 *
 * THE LIMITER RUNS FIRST, before any parsing and before any upstream call,
 * because a limiter that runs after the work has been done has limited
 * nothing. It counts by address, since the surface is public and there is no
 * account to count by, and it fails open exactly as every other limiter in the
 * codebase does: a broken counter must never blank a price table for everyone.
 *
 * THE REPLY IS THE CONTRACT AND NOTHING ELSE. `{ ok, data, cachedAt }` or
 * `{ ok, reason }`, no upstream body, no message, no header we did not choose.
 */

/** Reads per address per minute. A person scrolling a table, not a scraper. */
export const CRYPTO_RATE_LIMIT = 60;
export const CRYPTO_RATE_WINDOW_SECONDS = 60;

/**
 * A minute at the edge, and two more of stale while the next read lands.
 * Matches the in-process TTL, so a value is never served older from the CDN
 * than it would be from the process.
 */
const CACHE_CONTROL = "public, max-age=0, s-maxage=60, stale-while-revalidate=120";

/* ----------------------------------------------------------------- schemas */

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{0,63}$/);

/**
 * Query parameters coerce to a default rather than refuse, so every GET the
 * surface can build answers the contract. A per of 500 is fifty; a page of 0
 * is one; a vs of "eur" is ngn. Refusing would add a reason the ledger does
 * not name for a case the surface never produces.
 */
export const marketsQuerySchema = z.object({
  vs: z.enum(VS_CURRENCIES).catch("ngn"),
  per: z.coerce.number().int().min(1).max(100).catch(50),
  page: z.coerce.number().int().min(1).max(10).catch(1),
});

export const coinQuerySchema = z.object({
  vs: z.enum(VS_CURRENCIES).catch("ngn"),
});

export const coinIdSchema = slug;

export const pairsQuerySchema = z.object({
  network: slug.catch("eth"),
  query: z
    .string()
    .trim()
    .max(64)
    .regex(/^[\p{L}\p{N} ._/-]*$/u)
    .catch(""),
});

export function searchParamsToObject(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of new URL(url).searchParams) out[key] = value;
  return out;
}

/* ----------------------------------------------------------------- replies */

const STATUS: Record<CryptoFailureReason, number> = {
  /* A state, not an error: the surface draws its dark screen from it. */
  unconfigured: 200,
  rate_limited: 429,
  upstream: 502,
  bad_request: 400,
};

export function cryptoReply<T>(result: CryptoResult<T>): NextResponse {
  if (result.ok) {
    return NextResponse.json(result, {
      status: 200,
      headers: { "cache-control": CACHE_CONTROL },
    });
  }
  return NextResponse.json(result, {
    status: STATUS[result.reason],
    /* A failure is never cached at the edge: the next minute may be fine. */
    headers: { "cache-control": "no-store" },
  });
}

/**
 * Consult the limiter for this caller. Null means proceed; otherwise it is the
 * refusal, ready to return.
 */
export async function cryptoRateLimit(request: Request): Promise<NextResponse | null> {
  const verdict = await consume({
    bucket: "crypto",
    subject: subjectForIp(ipFromHeaders(request.headers)),
    limit: CRYPTO_RATE_LIMIT,
    windowSeconds: CRYPTO_RATE_WINDOW_SECONDS,
  });
  if (verdict.allowed) return null;
  return NextResponse.json(
    { ok: false, reason: "rate_limited" } satisfies CryptoResult<never>,
    {
      status: 429,
      headers: {
        "cache-control": "no-store",
        "retry-after": String(verdict.retryAfterSeconds),
      },
    },
  );
}
