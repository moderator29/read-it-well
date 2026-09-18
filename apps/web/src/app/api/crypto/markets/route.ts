import type { NextResponse } from "next/server";

import { fetchMarkets } from "@/lib/crypto/coingecko";
import {
  cryptoRateLimit,
  cryptoReply,
  marketsQuerySchema,
  searchParamsToObject,
} from "@/lib/crypto/route";

/**
 * GET /api/crypto/markets?vs=ngn&per=50&page=1
 *
 * The markets table for the Crypto surface, from CoinGecko through our cache.
 * Display only. Answers `{ ok: false, reason: "unconfigured" }` until the
 * founder's key is in the environment; see `lib/crypto/coingecko.ts` for why
 * it does not fall back to the keyless endpoint.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const refused = await cryptoRateLimit(request);
  if (refused) return refused;

  const query = marketsQuerySchema.parse(searchParamsToObject(request.url));
  return cryptoReply(await fetchMarkets(query));
}
