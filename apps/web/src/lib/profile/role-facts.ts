import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import {
  isBusinessKind,
  listerKindFromSupplyRole,
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
 * `owner_id` are granted to `anon` column by column, and
 * `social_profiles.supply_role` is the projected side of an approved supply
 * account. A read that fails contributes no word, so the line can come out
 * shorter, never invented.
 */

type Client = SupabaseClient<Database>;

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

/**
 * The signed-in person's own line. Their `agents` row is readable to them, so
 * an APPROVED one says exactly which they are; an application still in
 * review is not yet a role (the verify prompt under the header says where it
 * stands).
 */
export async function readOwnRoleWords(
  client: Client,
  userId: string,
  agent: { role: string | null; status: string | null } | null,
): Promise<RoleWord[]> {
  const businesses = await readPublishedBusinessKinds(client, userId);
  const listers: ListerKind[] = agent && agent.status === "APPROVED" ? [listerKindFromSupplyRole(agent.role)] : [];
  return roleWords({ listers, businesses });
}

/**
 * Somebody else's line. `supplyRole` is `social_profiles.supply_role`, the
 * public projection of an approved supply account's side: set means landlord
 * or agent, null means no supply account, whatever they have published.
 */
export async function readPublicRoleWords(
  client: Client,
  userId: string,
  supplyRole: string | null,
): Promise<RoleWord[]> {
  const businesses = await readPublishedBusinessKinds(client, userId);
  const listers: ListerKind[] = supplyRole ? [listerKindFromSupplyRole(supplyRole)] : [];
  return roleWords({ listers, businesses });
}
