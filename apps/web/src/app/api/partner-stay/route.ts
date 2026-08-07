import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/actions/session";
import { consume, subjectForUser } from "@/lib/security/rate-limit";
import { getListingRepository } from "@/lib/listings/repository";
import { prebookOffer, priceMoved } from "@/lib/inventory/providers/liteapi-prebook";

/**
 * The step between tapping Book on a partner hotel and arriving at the checkout
 * that sells it.
 *
 * Three things happen here and none of them is a payment:
 *
 * 1. **The rate is revalidated.** The price on the card came from a search, and
 *    a search is a photograph of what a room cost when it was taken. Prebook
 *    asks what it costs now.
 * 2. **The intent is recorded**, so the guest has a history. Until this existed,
 *    tapping Book meant leaving with no trace: their /bookings page showed
 *    nothing and support could not answer "what did I book".
 * 3. **They are handed over**, on the truest number we have.
 *
 * ## Every failure still hands them over
 *
 * This is the rule that shapes the whole file. A revalidation that times out, a
 * missing key, an offer with no reference, a database that will not accept the
 * record: not one of those is a reason to stop somebody booking a hotel. They
 * all fall through to the same destination with the price we already had. The
 * only thing a failure costs is the extra confidence, which is exactly the right
 * thing to lose.
 *
 * The destination is never taken from the request. It is rebuilt from the
 * listing the id resolves to, so this cannot be used to send anybody anywhere
 * except the whitelabel host the environment names.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A person books a handful of rooms, not a hundred. Each call costs upstream. */
const LIMIT = 15;
const WINDOW_SECONDS = 300;

type Body = { listingId?: unknown };

export async function POST(request: Request): Promise<NextResponse> {
  const session = await resolveSession();
  if (session.state !== "signed-in") {
    return NextResponse.json({ outcome: "unavailable" }, { status: 401 });
  }

  const verdict = await consume({
    bucket: "partner_stay",
    subject: subjectForUser(session.user.id),
    limit: LIMIT,
    windowSeconds: WINDOW_SECONDS,
  });
  if (!verdict.allowed) {
    return NextResponse.json({ outcome: "unavailable" }, { status: 429 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ outcome: "unavailable" }, { status: 400 });
  }
  const listingId = typeof body.listingId === "string" ? body.listingId : "";
  if (listingId.length === 0) {
    return NextResponse.json({ outcome: "unavailable" }, { status: 400 });
  }

  const listing = await getListingRepository()
    .byId(listingId)
    .catch(() => null);

  // The destination comes from the listing, never from the caller.
  const bookUrl = listing?.partner?.bookUrl;
  if (!listing || listing.kind !== "hotel" || !bookUrl) {
    return NextResponse.json({ outcome: "unavailable" }, { status: 404 });
  }

  const shownMinor = listing.priceMinor;
  let finalMinor: number | null = null;
  let prebookId: string | null = null;

  const offerRef = listing.partner?.offerRef;
  if (offerRef) {
    const prebooked = await prebookOffer(offerRef).catch(() => null);
    if (prebooked?.outcome === "ok") {
      prebookId = prebooked.prebookId;
      finalMinor = prebooked.minor;
    }
  }

  /* The dates the price was quoted for, read back off the link rather than
     recomputed. The provider built that URL from the same window it priced, so
     taking them from anywhere else risks a record that disagrees with where the
     guest was actually sent. */
  let checkin: string | null = null;
  let checkout: string | null = null;
  try {
    const params = new URL(bookUrl).searchParams;
    checkin = params.get("checkin");
    checkout = params.get("checkout");
  } catch {
    // A malformed link is the provider's problem and costs only the record.
  }

  if (checkin && checkout) {
    // Fire and forget by design. A history that fails to write must never stop
    // somebody booking a hotel, so the outcome is not even read.
    try {
      await session.supabase.from("partner_stay_intents").insert({
        guest_id: session.user.id,
        provider: listing.partner?.provider ?? "liteapi",
        provider_hotel_id: listing.id,
        hotel_name: listing.title,
        checkin,
        checkout,
        quoted_minor: finalMinor ?? (shownMinor > 0 ? shownMinor : null),
        ...(prebookId ? { prebook_id: prebookId } : {}),
      });
    } catch {
      // Nothing to do. See above.
    }
  }

  return NextResponse.json(
    {
      outcome: "ok",
      href: bookUrl,
      /* Only ever true when we actually confirmed a different number. An
         unreachable revalidation says nothing rather than warning about a move
         it never measured. */
      moved: finalMinor !== null && priceMoved(shownMinor, finalMinor),
      finalMinor,
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
