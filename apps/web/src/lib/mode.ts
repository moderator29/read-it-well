import "server-only";
import { cookies } from "next/headers";
import {
  isMode,
  MODE_COOKIE,
  normaliseMode,
  WORKSPACE_COOKIE,
  type Mode,
} from "./mode.constants";

export { MODE_COOKIE, WORKSPACE_COOKIE };
export type { Mode };

/**
 * Resolve the active workspace mode for the current request.
 *
 * A COOKIE, AND A COOKIE IS A VIEW PREFERENCE, NEVER AN AUTHORISATION. Nothing
 * may read this to decide what somebody is allowed to do. Every `/agent/*`
 * route gates on `getAgentContext()`, an RLS bound read of the caller's own
 * `agents` row, and the navigation is built from `getShellIdentity`, another
 * one. This decides what a control displays.
 *
 * The old note here said this "must additionally verify the user is an
 * approved agent before honouring agent". That was the wrong fix for the right
 * worry: the answer is not to authorise from a cookie more carefully, it is
 * never to authorise from it at all, and the five places that could have gone
 * wrong are named in `lib/supply/workspaces.ts`.
 *
 * `agent` is normalised to `working` on read, so nobody carrying the old value
 * is thrown back to personal mode by a deploy.
 */
export async function getMode(): Promise<Mode> {
  const store = await cookies();
  const value = store.get(MODE_COOKIE)?.value;
  return isMode(value) ? normaliseMode(value) : normaliseMode(null);
}

/**
 * The workspace key the person last stood in, or null.
 *
 * OPAQUE. This returns the string and asserts nothing about it. Resolving it
 * against what the account actually holds is `resolveWorkspaces()`, which does
 * it from the database on every request, so a membership revoked at ten
 * o'clock stops resolving at one minute past rather than at cookie expiry in a
 * year.
 */
export async function getWorkspaceKey(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(WORKSPACE_COOKIE)?.value;
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    /* A hand edited cookie with a stray percent sign is not an error worth a
       500 on every route; it is simply not a key we hold. */
    return null;
  }
}
