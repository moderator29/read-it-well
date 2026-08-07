import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { configuredPartnerProviders, partnerHealth } from "@/lib/inventory";

/**
 * Is the partner inventory actually working?
 *
 * Every failure in `lib/inventory` is swallowed by design, because a partner
 * feed must never break a search. That is right for a visitor and useless for
 * whoever just pasted a key into Vercel: an empty hotel shelf looks the same
 * whether the key is missing, refused, rate limited, switched off in
 * `feature_flags`, or simply pointed at a city with no supply. Those are five
 * different problems with five different fixes, and until this route existed
 * there was no way to tell them apart from outside the process.
 *
 * It answers JSON rather than a page, which is not laziness: the admin console
 * is fully localised and every string in it exists in four languages, so a
 * diagnostic screen would mean inventing Yoruba, Hausa and Igbo copy for
 * "upstream answered 401". This carries no user-facing copy at all. It is a
 * tool for the person holding the keys, and it reads like one.
 *
 * Three things it deliberately does:
 *
 * - **Runs a real search.** A key that parses is not a key that works. This
 *   spends one live request per provider, which is exactly what makes the
 *   answer trustworthy, and exactly why it is behind the admin guard.
 * - **Separates configured from enabled.** A provider with a key and its flag
 *   off answers "disabled". That is fixed in the database, not in Vercel, and
 *   the two are told apart here rather than guessed at.
 * - **Never returns a credential.** The health record carries an outcome, a
 *   count, a duration and an error reason built from a status code and a host.
 *   No key, no request body, no upstream payload.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const access = await requireAdmin();
  if (access.state !== "admin") {
    // The same refusal for every non-admin state, including "unconfigured".
    // This route reports on credentials, so it does not describe its own
    // reachability to somebody who has not proved they are staff.
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Optional, so the check can be pointed at the city being complained about
  // rather than only at the default market.
  const q = new URL(request.url).searchParams.get("q")?.trim();
  const filter = q ? { q } : {};

  const providers = await partnerHealth(filter);

  return NextResponse.json(
    {
      searched: q ?? null,
      configured: configuredPartnerProviders(),
      providers,
      /* The shelf a visitor would actually see for this filter, which is the
         number the owner is really asking about. It is the sum before
         de-duplication, so a total higher than the search page shows is not a
         fault: it is two feeds describing the same hotel, collapsing to one
         card (lib/inventory/dedupe.ts). */
      totalListings: providers.reduce((sum, entry) => sum + entry.listings, 0),
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
