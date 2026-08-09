import { NextResponse } from "next/server";

import {
  listingsInBounds,
  MAX_PINS,
  MAX_SPAN_DEGREES,
  type BoundsRefusal,
} from "@/lib/listings/bounds";
import type { ListingKind } from "@/lib/listings/types";
import { consume, ipFromHeaders, subjectForIp } from "@/lib/security/rate-limit";

/**
 * Pins for the box the map is currently showing.
 *
 * This is the server half of M-5: the map should ask for what is on screen
 * rather than for the catalogue. It exists as a route handler rather than as a
 * server action because panning a map is a READ that repeats as the viewport
 * moves, and a read that repeats wants a cacheable, cancellable GET with an
 * ordinary URL, not a POST that cannot be aborted cleanly mid-drag.
 *
 * ## It is public, and that is a decision rather than an oversight
 *
 * N-1 opened browsing to signed-out visitors, and a map a visitor cannot pan is
 * not a map. `public.listings_in_bounds` is granted to `anon` and is not
 * security definer, so RLS is still the authority on what comes back: only
 * PUBLISHED rows, exactly as `/search` already returns to the same caller.
 *
 * What being public changes is the SHAPE of the abuse, and there are two
 * defences, in two places, because they answer different questions.
 *
 *   `lib/listings/bounds.ts` bounds ONE REQUEST. A viewport is refused if it is
 *   malformed, wider than MAX_SPAN_DEGREES, or outside Nigeria, and the row
 *   count is capped at MAX_PINS. That is what stops a single call from being a
 *   catalogue export with coordinates.
 *
 *   THIS FILE bounds MANY REQUESTS. The per-request caps are worth little on
 *   their own, because a caller who cannot have the country in one request can
 *   tile it in four hundred. The limiter is what makes tiling expensive, and it
 *   counts by IP because there is no account to count by.
 *
 * ## The budget, and why it is generous
 *
 * A person panning a map with a debounce (M-6) issues a request every few
 * hundred milliseconds while their finger is moving, and a burst of a dozen in
 * ten seconds is ordinary use, not abuse. The window is therefore long and the
 * allowance high: this is priced to make SCRIPTED ENUMERATION slow, not to
 * discipline a fast scroller. The limiter fails open by design, which is
 * correct here for the same reason it is correct everywhere else: a broken
 * counter must not blank the map for everyone in Lagos.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Viewport reads allowed per address per window. */
const RATE_LIMIT = 240;

/** The window, in seconds. Five minutes. */
const RATE_WINDOW_SECONDS = 300;

/** The kinds the map may be asked to filter by. Anything else is refused. */
const KINDS: ReadonlySet<string> = new Set([
  "home",
  "rental",
  "shop",
  "office",
  "land",
  "restaurant",
]);

function num(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (raw === null || raw.trim().length === 0) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * A refusal a client can act on.
 *
 * Each carries the specific reason, because the map's response to each is
 * different: a too-wide box means zoom in and the surface should say so, an
 * out-of-range box means the reader has panned off Nigeria and the surface
 * should show that rather than an empty result which reads as "no listings
 * here". A single 400 would collapse three different instructions into one.
 */
const REFUSALS: Record<BoundsRefusal, { status: number; message: string }> = {
  malformed: { status: 400, message: "Give west, south, east and north as numbers." },
  "too-wide": {
    status: 422,
    message: `Zoom in. This map answers a view up to ${MAX_SPAN_DEGREES} degrees across.`,
  },
  "out-of-range": { status: 422, message: "That view is outside Nigeria." },
};

export async function GET(request: Request): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;

  const verdict = await consume({
    bucket: "map_bounds",
    subject: subjectForIp(ipFromHeaders(request.headers)),
    limit: RATE_LIMIT,
    windowSeconds: RATE_WINDOW_SECONDS,
  });

  if (!verdict.allowed) {
    return NextResponse.json(
      { error: `Too many map requests. Try again ${verdict.retryIn}.` },
      { status: 429, headers: { "retry-after": String(verdict.retryAfterSeconds) } },
    );
  }

  const kindParam = params.get("kind");
  if (kindParam !== null && !KINDS.has(kindParam)) {
    return NextResponse.json({ error: "Unknown kind." }, { status: 400 });
  }

  const intentParam = params.get("intent");
  if (intentParam !== null && intentParam !== "rent" && intentParam !== "sale") {
    return NextResponse.json({ error: "Unknown intent." }, { status: 400 });
  }

  const result = await listingsInBounds(
    {
      west: num(params, "west"),
      south: num(params, "south"),
      east: num(params, "east"),
      north: num(params, "north"),
    },
    {
      ...(intentParam ? { intent: intentParam } : {}),
      ...(kindParam ? { kind: kindParam as ListingKind } : {}),
      ...(num(params, "minPrice") === undefined
        ? {}
        : { minPriceMinor: num(params, "minPrice") }),
      ...(num(params, "maxPrice") === undefined
        ? {}
        : { maxPriceMinor: num(params, "maxPrice") }),
      ...(num(params, "bedrooms") === undefined ? {} : { bedrooms: num(params, "bedrooms") }),
      ...(num(params, "limit") === undefined ? {} : { limit: num(params, "limit") }),
    },
  );

  if (!result.ok) {
    const refusal = REFUSALS[result.reason];
    return NextResponse.json(
      { error: refusal.message, reason: result.reason },
      { status: refusal.status },
    );
  }

  return NextResponse.json(
    {
      pins: result.pins,
      /*
       * So the surface can say "showing the first 300 in this view" rather than
       * implying it is showing everything. A map that silently truncates is a
       * map that tells a reader a neighbourhood is empty when it is full.
       */
      capped: result.pins.length >= MAX_PINS,
    },
    {
      status: 200,
      headers: {
        /*
         * A published catalogue is the same for every anonymous caller, and a
         * map pans back over ground it has already covered constantly. Thirty
         * seconds of shared cache absorbs the re-pan without anybody seeing a
         * listing that is half a minute stale, which for a property that has
         * been on the market for weeks is not a meaningful difference.
         */
        "cache-control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
      },
    },
  );
}
