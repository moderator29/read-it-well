import "server-only";

import { resolveSession } from "../actions/session";

/**
 * The gate details, for the one person entitled to them.
 *
 * Read through the caller's own RLS-bound client and nothing else. The policy
 * on `public.listing_access` names exactly three readers: the host, an admin,
 * and a guest holding a CONFIRMED booking on that listing. This module does not
 * re-implement that rule and must never be tempted to: it asks, and Postgres
 * answers with a row or with nothing.
 *
 * A refusal is indistinguishable from an absence on purpose. Both come back as
 * null, and the page says the same thing in both cases, so nobody can learn
 * whether a gate code exists by watching how the page changes.
 */

export type ListingAccessView = {
  estateName: string;
  gateDirections: string;
  securityPhone: string;
  accessCode: string;
};

export async function readListingAccess(
  listingId: string,
): Promise<ListingAccessView | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;

  try {
    const { data } = await session.supabase
      .from("listing_access")
      .select("estate_name, gate_directions, security_phone, access_code")
      .eq("listing_id", listingId)
      .maybeSingle();

    if (!data) return null;

    const view: ListingAccessView = {
      estateName: data.estate_name ?? "",
      gateDirections: data.gate_directions ?? "",
      securityPhone: data.security_phone ?? "",
      accessCode: data.access_code ?? "",
    };

    // An empty row is not access. It would render as a panel with four blank
    // lines, which reads as a bug rather than as an answer.
    const anything = Object.values(view).some((field) => field.trim().length > 0);
    return anything ? view : null;
  } catch {
    return null;
  }
}
