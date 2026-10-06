import "server-only";

import { resolveSession } from "../actions/session";
import { parseListerFeePolicy, type ListerFeePolicy } from "./lister-fee";

/**
 * THE RATE IN FORCE FOR ONE LISTING, READ ON THE SERVER (D51).
 *
 * The lister's platform fee is policy data in `money_policy`, in basis points,
 * with a version recorded against every acceptance. That read does not exist
 * yet: it is C2 REQUEST 1 to Session 2, `public.lister_fee_policy(p_listing,
 * p_property_type, p_listing_intent)` returning one row of `rate_version`,
 * `rail` ('escrow' | 'direct'), `fee_bps` and `cap_minor`, resolved by the
 * rail router and readable by the listing's own lister.
 *
 * Until it lands the call fails and this answers null, and the fee gate says
 * it cannot show the figures. It never falls back to a typed rate: a guessed
 * 400 is exactly the hardcoded number D51 forbids.
 */
export async function readListerFeePolicy(input: {
  listingId: string | null;
  propertyType: string | null;
  listingIntent: "rent" | "sale" | null;
}): Promise<ListerFeePolicy | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const { data, error } = await session.supabase.rpc("lister_fee_policy" as never, {
      p_listing: input.listingId,
      p_property_type: input.propertyType,
      p_listing_intent: input.listingIntent,
    } as never);
    if (error) return null;
    return parseListerFeePolicy(data);
  } catch {
    return null;
  }
}
