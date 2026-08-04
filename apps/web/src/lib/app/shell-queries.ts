import "server-only";

import { cache } from "react";
import { resolveSession } from "../actions/session";

/**
 * What the consumer shell needs to render itself honestly.
 *
 * Two facts, resolved once in the layout rather than per surface: who is
 * actually signed in, and how many notifications they have not read.
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
};

const GUEST: ShellIdentity = { userName: "Guest", unreadNotifications: 0 };

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

    const [profileResult, unreadResult] = await Promise.all([
      session.supabase
        .from("profiles")
        .select("first_name, nickname, display_name")
        .eq("id", session.user.id)
        .maybeSingle(),
      session.supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null),
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
    };
  } catch {
    return GUEST;
  }
}
