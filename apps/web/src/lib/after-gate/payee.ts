import "server-only";

import { resolveSession } from "../actions/session";

/**
 * V-46. Whether a member of staff dated this listing's ownership or mandate,
 * the two records that let a move-in caption name a landlord.
 *
 * Read on the signed-in reader's own client, for one listing, separately from
 * the catalogue select: `anon` holds no grant on these two columns, and a
 * shared select that asked for them would fail every anonymous read of the
 * catalogue. An example listing never carries either record. Any failure
 * answers "no record", which prints the caption that names no landlord.
 */
export async function readPayeeRecords(listingId: string): Promise<{ mandateVerified: boolean; ownershipVerified: boolean }> {
  const none = { mandateVerified: false, ownershipVerified: false };
  const session = await resolveSession();
  if (session.state !== "signed-in") return none;
  try {
    const { data, error } = await session.supabase
      .from("listings")
      .select("mandate_verified_at, ownership_verified_at, is_demo")
      .eq("id", listingId)
      .maybeSingle();
    if (error || !data || data.is_demo) return none;
    return { mandateVerified: data.mandate_verified_at !== null, ownershipVerified: data.ownership_verified_at !== null };
  } catch {
    return none;
  }
}
