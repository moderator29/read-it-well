import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import {
  isBusinessKind,
  listerKindFromAgentType,
  listerKindsFromListingRoles,
  roleWords,
  type BusinessKind,
  type ListerKind,
  type RoleWord,
} from "./role-line";

/**
 * THE ROWS BEHIND THE ROLE LINE (`role-line.ts` says what each word means).
 *
 * Every read goes through the caller's own RLS-bound client and asks only for
 * what a stranger may already read: a published business's `kind` and
 * `owner_id` are granted to `anon` column by column, a published listing's
 * `listing_role` and `agent_id` likewise, and `social_profiles.agent_id` is
 * the projected id of an approved agent. A read that fails contributes no
 * word, so the line can come out shorter, never invented.
 */

type Client = SupabaseClient<Database>;

/** How many listings are enough to know which roles somebody lists under. */
const LISTING_SAMPLE = 25;

/** The kinds of the published businesses this person owns. */
export async function readPublishedBusinessKinds(client: Client, userId: string): Promise<BusinessKind[]> {
  try {
    const { data, error } = await client
      .from("businesses")
      .select("kind")
      .eq("owner_id", userId)
      .eq("status", "PUBLISHED");
    if (error || !Array.isArray(data)) return [];
    return data.map((row) => row.kind).filter(isBusinessKind);
  } catch {
    return [];
  }
}

/** The roles somebody else's published listings were listed under. */
async function readListingRoles(client: Client, userId: string): Promise<ListerKind[]> {
  try {
    const profile = await client.from("social_profiles").select("agent_id").eq("user_id", userId).maybeSingle();
    const agentId = profile.data?.agent_id;
    if (profile.error || typeof agentId !== "string") return [];
    const { data, error } = await client
      .from("listings")
      .select("listing_role")
      .eq("agent_id", agentId)
      .eq("status", "PUBLISHED")
      .limit(LISTING_SAMPLE);
    if (error || !Array.isArray(data)) return [];
    return listerKindsFromListingRoles(data.map((row) => row.listing_role));
  } catch {
    return [];
  }
}

/**
 * The signed-in person's own line. Their `agents` row is readable to them, so
 * an APPROVED one says exactly which they are; an application still in
 * review is not yet a role (the verify prompt under the header says where it
 * stands).
 */
export async function readOwnRoleWords(
  client: Client,
  userId: string,
  agent: { type: string | null; status: string | null } | null,
): Promise<RoleWord[]> {
  const businesses = await readPublishedBusinessKinds(client, userId);
  const listers: ListerKind[] = agent && agent.status === "APPROVED" ? [listerKindFromAgentType(agent.type)] : [];
  return roleWords({ listers, businesses });
}

/**
 * Somebody else's line. `isAgent` is the public marker of an approved
 * supply account; the listings say whether they let their own property or
 * somebody else's, and with nothing published the marker's own word stands.
 */
export async function readPublicRoleWords(client: Client, userId: string, isAgent: boolean): Promise<RoleWord[]> {
  const [businesses, listed] = await Promise.all([
    readPublishedBusinessKinds(client, userId),
    isAgent ? readListingRoles(client, userId) : Promise.resolve<ListerKind[]>([]),
  ]);
  const listers: ListerKind[] = isAgent ? (listed.length > 0 ? listed : ["agent"]) : [];
  return roleWords({ listers, businesses });
}
