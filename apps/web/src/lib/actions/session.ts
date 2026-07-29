import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";

/**
 * Session resolution for server actions.
 *
 * Every mutation starts here. Three honest outcomes: Supabase is not
 * configured yet (the owner has not added envs, nothing may crash), there is
 * no signed-in user (the action should ask them to sign in, never pretend),
 * or we have a real user and an RLS-bound client to act as them.
 */
export type SessionState =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | { state: "signed-in"; supabase: SupabaseClient<Database>; user: User };

export async function resolveSession(): Promise<SessionState> {
  if (!isSupabaseConfigured()) return { state: "unconfigured" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: "signed-out" };
  return { state: "signed-in", supabase, user };
}

/** The two copy lines every action reuses for the non-signed-in outcomes. */
export const NOT_CONFIGURED_MESSAGE =
  "This feature switches on the moment the platform keys land. Nothing you entered was lost.";
export const SIGNED_OUT_MESSAGE = "Sign in to continue. Your details are kept safe.";
