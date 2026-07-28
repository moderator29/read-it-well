import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { requireSupabasePublicEnv, serviceRoleKey } from "./env";

/**
 * Service-role Supabase client. Bypasses Row Level Security.
 *
 * For privileged server work only: confirming a booking and writing the ledger,
 * processing a Paystack webhook, an admin approving an agent or listing. Never
 * import this from anything that runs in the browser. It does not read auth
 * cookies and never persists a session, because it is not acting as a user; the
 * caller is responsible for having already authorised the action.
 */
export function createAdminClient() {
  const { url } = requireSupabasePublicEnv();
  return createSupabaseClient<Database>(url, serviceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
