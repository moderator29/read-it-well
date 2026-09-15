import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { resolveSession } from "../actions/session";
import type { Database } from "../supabase/database.types";

/**
 * The single door into the admin console.
 *
 * Every admin page and every admin action starts here, so there is exactly one
 * place that decides who counts as staff. The check runs against the caller's
 * own RLS-bound client: `user_roles_select_own` lets a user read their own role
 * rows and nothing else, so the answer comes from the database rather than from
 * a cookie, a header or anything the browser can forge.
 *
 * The outcomes are deliberately four, not two. "Unconfigured" means the owner
 * has not added the platform keys yet, which is not a failure and must never
 * crash a page. "Signed out" asks for a sign in. "Not admin" is an honest, calm
 * refusal, never a blank screen and never a 404 that pretends the console does
 * not exist. Only the last outcome carries a client and a user.
 */
export type AdminAccess =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | { state: "not-admin" }
  | {
      state: "admin";
      supabase: SupabaseClient<Database>;
      user: User;
      isAdmin: true;
      isSuperAdmin: boolean;
    };

export const ADMIN_UNCONFIGURED_MESSAGE =
  "The console switches on the moment the platform keys land. Nothing is lost in the meantime.";

export const ADMIN_SIGNED_OUT_MESSAGE = "Sign in with your operations account to continue.";

export const ADMIN_FORBIDDEN_MESSAGE =
  "This area is for the Vallo operations team. Your account does not carry that role.";

export async function requireAdmin(): Promise<AdminAccess> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return { state: "unconfigured" };
  if (session.state === "signed-out") return { state: "signed-out" };

  const { data, error } = await session.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", session.user.id);

  // A read error means we cannot prove the role, and an unproven role is not a
  // role. Refusing is the only safe answer here.
  if (error) return { state: "not-admin" };

  const roles = new Set((data ?? []).map((row) => row.role));
  const isSuperAdmin = roles.has("super_admin");
  const isAdmin = isSuperAdmin || roles.has("admin");
  if (!isAdmin) return { state: "not-admin" };

  return {
    state: "admin",
    supabase: session.supabase,
    user: session.user,
    isAdmin: true,
    isSuperAdmin,
  };
}

/**
 * The one-line refusal an action returns for a non-admin caller, so every
 * export in the console speaks the same plain language as the rest of the app.
 */
export function adminRefusal(access: Exclude<AdminAccess, { state: "admin" }>): string {
  if (access.state === "unconfigured") return ADMIN_UNCONFIGURED_MESSAGE;
  if (access.state === "signed-out") return ADMIN_SIGNED_OUT_MESSAGE;
  return ADMIN_FORBIDDEN_MESSAGE;
}
