import "server-only";

import { resolveSession } from "../actions/session";
import type { PayeeContext } from "../listings/money-map";

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
/**
 * The whole payee context for one listing, for a screen that has only the id:
 * the lister's role and name beside the two dated records. The admin review
 * screen reads it so its captions follow the same rule as the listing page.
 */
export async function readPayeeContext(listingId: string): Promise<PayeeContext | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const { data, error } = await session.supabase
      .from("listings")
      .select("listing_role, mandate_verified_at, ownership_verified_at, is_demo, agent_id")
      .eq("id", listingId)
      .maybeSingle();
    if (error || !data) return null;
    let listerName: string | undefined;
    if (data.agent_id) {
      const { data: agent } = await session.supabase.from("agents").select("display_name").eq("id", data.agent_id).maybeSingle();
      listerName = agent?.display_name?.trim() || undefined;
    }
    return {
      listerRole: (data.listing_role ?? undefined) as PayeeContext["listerRole"],
      listerName,
      mandateVerified: !data.is_demo && data.mandate_verified_at !== null,
      ownershipVerified: !data.is_demo && data.ownership_verified_at !== null,
    };
  } catch {
    return null;
  }
}

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
