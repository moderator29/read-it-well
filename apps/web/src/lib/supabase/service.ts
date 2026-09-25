import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./admin";
import type { Database } from "./database.types";
import { isSupabaseConfigured, SUPABASE_URL, serviceRoleKey } from "./env";

/**
 * The service-role client, for server actions and webhooks that act on the
 * platform's behalf after they have resolved who is asking.
 *
 * It lived in the retired wallet ledger module for historical reasons and was imported
 * from there by forty files that had nothing to do with a wallet. The wallet
 * is gone (Vallo never holds customer money, 25 September 2026), so the
 * client has its own home.
 */
export type AdminClient = SupabaseClient<Database>;

/** True when both the public Supabase config and the service key are present. */
export function isServiceConfigured(): boolean {
  return isSupabaseConfigured() && (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length > 0;
}

/** The admin client, or null when the service environment is incomplete. */
export function getAdminClient(): AdminClient | null {
  if (!isServiceConfigured()) return null;
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

type AdminUser = { id: string; email?: string | null };

/**
 * Resolve a user id by email through the GoTrue admin API. profiles carries
 * no email column by design, so this is the one lookup that touches auth
 * users, and it runs with the service key on the server only.
 */
export async function findUserByEmail(email: string): Promise<AdminUser | null> {
  if (!isServiceConfigured()) return null;
  const wanted = email.trim().toLowerCase();
  try {
    const key = serviceRoleKey();
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?filter=${encodeURIComponent(wanted)}&per_page=50`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { users?: AdminUser[] } | AdminUser[];
    const users = Array.isArray(body) ? body : (body.users ?? []);
    return users.find((u) => (u.email ?? "").toLowerCase() === wanted) ?? null;
  } catch {
    return null;
  }
}

/** A user's display name from profiles, or null. */
export async function displayNameFor(admin: AdminClient, userId: string): Promise<string | null> {
  const { data } = await admin.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  const name = data?.display_name?.trim() ?? "";
  return name.length > 0 ? name : null;
}
