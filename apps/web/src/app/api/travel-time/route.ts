import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/actions/session";
import { consume, subjectForUser } from "@/lib/security/rate-limit";
import { getListingRepository } from "@/lib/listings/repository";
import {
  drivingTime,
  isPlausibleOrigin,
  spokenDistance,
  spokenDuration,
  travelTimeConfigured,
} from "@/lib/maps/travel-time";

/**
 * How long it takes to get to one place from where the caller is standing.
 *
 * This has to be a route rather than server-rendered with the page, because the
 * origin is the browser's and the browser only learns it after asking somebody
 * for permission. There is no version of this that the server knows at render
 * time, and pre-rendering a guess would be the invented number the whole
 * feature exists to avoid.
 *
 * ## The destination is a listing id, never a coordinate
 *
 * That is the important line in this file. A route that accepted `to: {lat,lng}`
 * would be a free Google Routes proxy on the public internet, billed to us, and
 * it would be found. Taking a listing id instead means the only journeys we
 * will price are journeys to places we actually list, which is exactly the
 * feature and nothing else.
 *
 * Three more limits behind that one:
 *
 * - **A session is required.** The listing pages this serves are already behind
 *   sign-in, so this costs a real visitor nothing and costs a scraper an
 *   account.
 * - **Rate limited per user**, because a signed-in caller can still loop, and
 *   every call is a billed request.
 * - **Restaurants only.** This is where distance decides the booking. Nobody
 *   cross-references a hotel against their current position, and widening it
 *   later is a smaller mistake than paying for it now.
 *
 * The answer is a formatted string rather than a raw number of seconds, so that
 * the rounding stays in one place. A duration predicted through Lagos traffic is
 * not accurate to the minute, and a component that received 1403 seconds would
 * sooner or later render "23 min" and claim a precision this does not have.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One person, one page, a few retries. Every call is billed. */
const LIMIT = 12;
const WINDOW_SECONDS = 60;

type Body = { listingId?: unknown; lat?: unknown; lng?: unknown };

function unavailable(): NextResponse {
  // One shape for every "no answer" case, on purpose. A visitor is told the
  // same thing whether the key is missing, the venue has no coordinate or the
  // route does not exist, because all three mean the card simply shows no
  // travel time, and distinguishing them would leak configuration.
  return NextResponse.json({ outcome: "unavailable" }, { status: 200 });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!travelTimeConfigured()) return unavailable();

  const session = await resolveSession();
  if (session.state !== "signed-in") {
    return NextResponse.json({ outcome: "unavailable" }, { status: 401 });
  }

  const verdict = await consume({
    bucket: "travel_time",
    subject: subjectForUser(session.user.id),
    limit: LIMIT,
    windowSeconds: WINDOW_SECONDS,
  });
  if (!verdict.allowed) {
    return NextResponse.json(
      { outcome: "unavailable" },
      { status: 429, headers: { "retry-after": String(verdict.retryAfterSeconds) } },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return unavailable();
  }

  const listingId = typeof body.listingId === "string" ? body.listingId : "";
  const from = {
    lat: typeof body.lat === "number" ? body.lat : Number.NaN,
    lng: typeof body.lng === "number" ? body.lng : Number.NaN,
  };
  if (listingId.length === 0 || !isPlausibleOrigin(from)) return unavailable();

  // Resolved through the repository, so a partner venue and one of ours are
  // looked up the same way and neither can be addressed by coordinate.
  const listing = await getListingRepository()
    .byId(listingId)
    .catch(() => null);
  if (!listing || listing.kind !== "restaurant") return unavailable();
  if (listing.lat === undefined || listing.lng === undefined) return unavailable();

  const result = await drivingTime(from, { lat: listing.lat, lng: listing.lng });
  if (result.outcome !== "ok") {
    if (result.outcome === "error") console.warn(`[travel-time] ${result.reason}`);
    return unavailable();
  }

  return NextResponse.json(
    {
      outcome: "ok",
      duration: spokenDuration(result.seconds),
      distance: spokenDistance(result.metres),
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
