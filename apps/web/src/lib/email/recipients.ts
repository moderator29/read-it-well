import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import type { Database } from "../supabase/database.types";

/**
 * Recipient resolution for transactional email.
 *
 * The rule this file exists to enforce: an address is either the signed-in
 * user's own, taken from their session, or it was read from the database by
 * the service role. Nothing else is ever emailed. There is no path here that
 * accepts an address from a client.
 *
 * Every function is quiet on failure and returns null. A missing service key,
 * a missing profile, an agent whose auth user has been deleted: all of them
 * mean "no email for this party", never an exception, because every caller is
 * a best-effort side effect of an action that has already committed.
 */

type AdminClient = SupabaseClient<Database>;

export type Contact = {
  email: string;
  /** Their display name, when we have one worth greeting them by. */
  name: string | null;
};

/**
 * The service-role client, or null when the service key is absent. Callers
 * that cannot resolve a third party's address then skip that email quietly
 * rather than failing.
 */
export function adminOrNull(): AdminClient | null {
  if ((process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length === 0) return null;
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/** The signed-in user's own contact details, straight off their session. */
export function contactFromSession(user: User): Contact | null {
  const email = (user.email ?? "").trim();
  if (email.length === 0) return null;
  const metadataName = user.user_metadata["full_name"] as string | undefined;
  const name = (metadataName ?? "").trim();
  return { email, name: name.length > 0 ? name : null };
}

/** A profile display name, or null. Used to greet a party by name. */
async function displayName(admin: AdminClient, userId: string): Promise<string | null> {
  try {
    const { data } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    const name = (data?.display_name ?? "").trim();
    return name.length > 0 ? name : null;
  } catch {
    return null;
  }
}

/**
 * Any user's contact details by auth id. profiles carries no email column by
 * design, so the address comes from the GoTrue admin API with the service key,
 * and the greeting name from profiles.
 */
export async function contactForUser(
  admin: AdminClient,
  userId: string,
): Promise<Contact | null> {
  try {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    const email = (data?.user?.email ?? "").trim();
    if (error || email.length === 0) return null;
    return { email, name: await displayName(admin, userId) };
  } catch {
    return null;
  }
}

/**
 * The agent behind a listing, as an email recipient. listings.agent_id points
 * at public.agents, whose user_id is the auth user, so the address is one hop
 * further than it looks. The agent's own display_name is preferred over their
 * profile name, because that is the name they trade under.
 */
export async function contactForAgent(
  admin: AdminClient,
  agentId: string,
): Promise<Contact | null> {
  try {
    const { data: agent } = await admin
      .from("agents")
      .select("user_id, display_name")
      .eq("id", agentId)
      .maybeSingle();
    if (!agent) return null;

    const contact = await contactForUser(admin, agent.user_id);
    if (!contact) return null;

    const trading = (agent.display_name ?? "").trim();
    return trading.length > 0 ? { email: contact.email, name: trading } : contact;
  } catch {
    return null;
  }
}
