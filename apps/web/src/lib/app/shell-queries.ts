import "server-only";

import { cache } from "react";
import { resolveSession } from "../actions/session";

/**
 * What the consumer shell needs to render itself honestly.
 *
 * Four facts, resolved once in the layout rather than per surface: who is
 * actually signed in, how many notifications they have not read, and whether
 * this person has an agent workspace or an operations console to be shown a
 * door into.
 *
 * The last two are what stop the side navigation from lying. An Agent Mode
 * group offered to somebody with no `agents` row is a dead end four taps deep,
 * and a Console group offered to somebody with no staff role is a refusal
 * screen dressed as a destination.
 *
 * Both used to be wrong in the same way. The shell greeted every visitor as
 * "Guest" from a hardcoded constant whose comment said "until real sessions
 * land", long after sessions had landed, so a signed-in user was greeted by the
 * placeholder. And the rail declared a `badge?: number` that no item ever set,
 * so an unread count was rendered nowhere despite being one query away.
 *
 * Everything here fails soft. Navigation chrome is never worth taking a page
 * down for: an unreadable count is zero, an unreadable name is Guest.
 */

export type ShellIdentity = {
  /** First name where we have one, otherwise a neutral label. Never a fiction. */
  userName: string;
  /** Unread notifications for this caller. Zero renders no badge at all. */
  unreadNotifications: number;
  /** The person's own photo, or an empty string when they have not set one. */
  avatarUrl: string;
  /** True only for a real session, so the shell never offers a signed-out avatar. */
  signedIn: boolean;
  /** An approved agent, so Agent Mode is a place they can actually go. */
  isAgent: boolean;
  /** Staff, so the console is a place they can actually go. */
  isAdmin: boolean;
};

const GUEST: ShellIdentity = {
  userName: "Guest",
  unreadNotifications: 0,
  avatarUrl: "",
  signedIn: false,
  isAgent: false,
  isAdmin: false,
};

/** The first word of a display name, so the greeting stays short on a phone. */
function firstWord(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "";
  return trimmed.split(/\s+/)[0] ?? "";
}

/**
 * Wrapped in React's per-request cache, so the layout and the home greeting
 * share one execution rather than issuing the same two reads twice on the
 * platform's busiest route.
 */
export const getShellIdentity = cache(async function getShellIdentity(): Promise<ShellIdentity> {
  try {
    const session = await resolveSession();
    if (session.state !== "signed-in") return GUEST;

    const [profileResult, unreadResult, agentResult, roleResult] = await Promise.all([
      session.supabase
        .from("profiles")
        .select("first_name, nickname, display_name, avatar_url")
        .eq("id", session.user.id)
        .maybeSingle(),
      session.supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null),
      /* `agents` is select-own plus admin, and `user_roles` carries
         `user_roles_select_own`, so both of these resolve for the person
         themselves and for nobody else. Neither needs a service key. */
      session.supabase
        .from("agents")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("status", "APPROVED")
        .maybeSingle(),
      session.supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["admin", "super_admin"]),
    ]);

    const profile = profileResult.data;
    const name =
      firstWord(profile?.nickname ?? "") ||
      firstWord(profile?.first_name ?? "") ||
      firstWord(profile?.display_name ?? "") ||
      GUEST.userName;

    return {
      userName: name,
      unreadNotifications: unreadResult.error ? 0 : (unreadResult.count ?? 0),
      avatarUrl: profile?.avatar_url ?? "",
      signedIn: true,
      // A read that failed is not a role. Both fail closed.
      isAgent: !agentResult.error && agentResult.data !== null,
      isAdmin: !roleResult.error && (roleResult.data?.length ?? 0) > 0,
    };
  } catch {
    return GUEST;
  }
});
