import "server-only";

import { createClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/env";
import { readPersonBadges } from "../trust/badge-tier";
import type { Listing } from "./types";
import {
  composeListerCard,
  type ListerCard,
  type ListerProfileRow,
} from "@/components/app/listing/lister-card";

/**
 * THE "LISTED BY" CARD'S ROW, IN THREE SMALL PUBLIC READS.
 *
 *   1. `listings.agent_id` for this listing (a public column on a PUBLISHED
 *      row, the one the catalogue read already selects).
 *   2. The lister's `social_profiles` row by `agent_id`: the same public
 *      projection `/u/<handle>` reads (handle, name, photograph, side). The
 *      table's own policy hides a profile from somebody who blocked or was
 *      blocked by them, and then the card falls back to the published name.
 *   3. `person_badge.tier` for that person, through `readPersonBadges`.
 *
 * Nothing private travels: no phone, no email, and `contact_policy` is not
 * read because a listing's conversation is not governed by it (the profile's
 * own Message button is; see `lib/social/message-door.ts`).
 *
 * Any failure answers with what the listing itself already carries (the
 * published name and role), and an absent card when that is nothing.
 */
export async function readListerCard(listing: Listing): Promise<ListerCard | null> {
  const base = {
    listingRole: listing.listerRole ?? null,
    listerName: listing.listerName ?? null,
    isDemo: listing.isDemo === true,
  };
  if (!isSupabaseConfigured()) {
    return composeListerCard({ ...base, profile: null, tier: "none" });
  }
  try {
    const supabase = await createClient();
    const { data: row } = await supabase.from("listings").select("agent_id").eq("id", listing.id).maybeSingle();
    const agentId = (row as { agent_id?: string | null } | null)?.agent_id ?? null;
    if (!agentId) return composeListerCard({ ...base, profile: null, tier: "none" });

    const { data: profile } = await supabase
      .from("social_profiles")
      .select("user_id, handle, display_label, avatar_path, supply_role, handle_claimed_at")
      .eq("agent_id", agentId)
      .maybeSingle();
    const found = (profile ?? null) as (ListerProfileRow & { user_id: string }) | null;
    const badges = found && !base.isDemo ? await readPersonBadges(supabase, [found.user_id]) : new Map();
    return composeListerCard({
      ...base,
      profile: found,
      tier: (found && badges.get(found.user_id)) || "none",
    });
  } catch {
    return composeListerCard({ ...base, profile: null, tier: "none" });
  }
}
