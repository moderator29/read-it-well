import type { NextResponse } from "next/server";

import { fetchPairs } from "@/lib/crypto/geckoterminal";
import {
  cryptoRateLimit,
  cryptoReply,
  pairsQuerySchema,
  searchParamsToObject,
} from "@/lib/crypto/route";

/**
 * GET /api/crypto/pairs?network=eth&query=
 *
 * Top DEX pools on a network, or the pools matching a term, from
 * GeckoTerminal. Needs no key, so it can answer before the markets route
 * can. Display only.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const refused = await cryptoRateLimit(request);
  if (refused) return refused;

  const query = pairsQuerySchema.parse(searchParamsToObject(request.url));
  return cryptoReply(await fetchPairs(query));
}
