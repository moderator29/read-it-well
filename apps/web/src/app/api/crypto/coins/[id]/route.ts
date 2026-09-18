import type { NextResponse } from "next/server";

import { fetchCoin } from "@/lib/crypto/coingecko";
import {
  coinIdSchema,
  coinQuerySchema,
  cryptoRateLimit,
  cryptoReply,
  searchParamsToObject,
} from "@/lib/crypto/route";

/**
 * GET /api/crypto/coins/[id]?vs=ngn
 *
 * One coin for its detail page. The id is a CoinGecko slug ("bitcoin"); a
 * segment that is not a slug is refused before anything is fetched, because
 * it could only have come from a hand-edited URL.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const refused = await cryptoRateLimit(request);
  if (refused) return refused;

  const { id } = await context.params;
  const parsedId = coinIdSchema.safeParse(id);
  if (!parsedId.success) return cryptoReply({ ok: false, reason: "bad_request" });

  const { vs } = coinQuerySchema.parse(searchParamsToObject(request.url));
  return cryptoReply(await fetchCoin(parsedId.data, vs));
}
