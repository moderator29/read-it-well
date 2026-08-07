import { NextResponse } from "next/server";

/**
 * A Google Places photo, fetched with our key and served without it.
 *
 * Partner venues shipped no photos at all. Not because Google withholds them,
 * but because the media URL carries the API key as a query parameter, and this
 * is a SERVER key: putting it in an `<img src>` publishes it to every visitor
 * and every scraper, and a published Places key is somebody else's bill. So the
 * provider set `photos: []`, every partner card fell back to its gradient tile,
 * and a shelf of real hotels looked like placeholder furniture.
 *
 * This is the ordinary answer to that: one hop through our own origin. The
 * browser asks us, we ask Google with the key, and the bytes come back. The key
 * never leaves the process and the URL a page renders is same-origin, which
 * also means `next/image` needs no `remotePatterns` entry for it.
 *
 * ## What is actually dangerous here, and what stops it
 *
 * A route that fetches a URL built from user input is a server side request
 * forgery waiting to happen. Two things make this one safe, and they are both
 * structural rather than a validation pass somebody can forget:
 *
 * 1. **The caller never supplies a URL.** It supplies a photo NAME, and that
 *    name is matched against `places/<id>/photos/<ref>` before anything is
 *    built. Nothing else is accepted, so there is no input that reaches the
 *    fetch as a host, a scheme or a path traversal.
 * 2. **The host is a constant in this file.** Even a name that somehow passed
 *    the pattern can only ever be interpolated into a `places.googleapis.com`
 *    URL.
 *
 * The width is clamped to a small set rather than passed through, because an
 * unbounded `maxWidthPx` is an unbounded bill.
 *
 * ## Caching
 *
 * Google's terms allow a place_id to be kept indefinitely and place DETAILS
 * only briefly, which is why `providers/places.ts` holds details for three
 * minutes. Photo BYTES are the least volatile thing Google serves us and the
 * most expensive to refetch, so they are cached for a day at the edge. That is
 * conservative next to the ceiling and it is what keeps a scroll through a
 * shelf of hotels from spending a request per card per paint.
 */

const MEDIA_HOST = "https://places.googleapis.com/v1";

/**
 * `places/<place id>/photos/<photo reference>`.
 *
 * Both segments are Google's own opaque tokens. Deliberately strict: no dots,
 * no slashes beyond the two, so `..` cannot appear and the shape cannot be
 * widened into a different endpoint.
 */
const PHOTO_NAME = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;

/** The only widths anybody may ask for. An open parameter is an open bill. */
const WIDTHS = new Set([200, 400, 800, 1200]);
const DEFAULT_WIDTH = 800;

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const key = process.env.GOOGLE_PLACES_API_KEY ?? "";
  if (key.length === 0) {
    // No key is not an error worth a body. The card already draws its tile.
    return new NextResponse(null, { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  const name = params.get("name") ?? "";
  if (!PHOTO_NAME.test(name)) {
    return NextResponse.json({ error: "bad photo reference" }, { status: 400 });
  }

  const asked = Number(params.get("w") ?? DEFAULT_WIDTH);
  const width = WIDTHS.has(asked) ? asked : DEFAULT_WIDTH;

  const upstream = `${MEDIA_HOST}/${name}/media?maxWidthPx=${width}&skipHttpRedirect=true`;

  try {
    /* `skipHttpRedirect` asks Google for JSON naming the CDN URL rather than a
       302 to it. Following the redirect ourselves would stream every byte of
       every photo through this function; instead we take the URL and hand the
       browser a redirect to Google's own CDN, which is faster for the visitor
       and costs us nothing but the lookup. The key is spent here and never
       appears in what the browser is given. */
    const lookup = await fetch(upstream, {
      headers: { "X-Goog-Api-Key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });
    if (!lookup.ok) return new NextResponse(null, { status: 404 });

    const body = (await lookup.json()) as { photoUri?: unknown };
    const uri = typeof body.photoUri === "string" ? body.photoUri : "";
    // Only ever a Google CDN URL, checked rather than trusted, because this
    // value becomes a Location header.
    if (!/^https:\/\/[a-z0-9.-]*\.(googleusercontent|ggpht|google)\.com\//i.test(uri)) {
      return new NextResponse(null, { status: 404 });
    }

    return NextResponse.redirect(uri, {
      status: 307,
      headers: { "cache-control": "public, max-age=86400, s-maxage=86400" },
    });
  } catch {
    /* A timeout or a network fault is a missing photo, not a broken page. The
       card falls back to its gradient tile exactly as it does today. */
    return new NextResponse(null, { status: 404 });
  }
}
