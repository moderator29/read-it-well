import "server-only";

import { resolveSession } from "../actions/session";
import { describeDevice, type DeviceDescription } from "./device";

/**
 * Where somebody is signed in, read from the only place that knows.
 *
 * SEC-5. Until this existed a person could not see their own sessions and could
 * not end one. That matters more here than on most products because the account
 * holds a wallet: a phone left in a taxi is either recoverable by its owner in
 * thirty seconds or it is a support ticket, and a support ticket is a stranger
 * deciding whether to believe you.
 *
 * ## What the provider actually gives us, and what it does not
 *
 * Supabase keeps one `auth.sessions` row per signed-in device. There is no
 * client API that lists them: `supabase.auth.signOut({ scope })` can end
 * 'others' or 'global' and cannot enumerate, and the admin API has no
 * list-sessions endpoint either. So the list comes from `public.my_sessions()`,
 * a SECURITY DEFINER function that takes no argument and filters on
 * `auth.uid()`. `auth` is not on PostgREST's search path and must not be.
 *
 * The row carries `created_at`, `updated_at`, `refreshed_at`, `aal`,
 * `user_agent` and `ip`. Two of those are not used and the reasons are
 * different:
 *
 *   ip     NOT read, and `my_sessions()` does not even return it. The refresh
 *          runs in our middleware, so the address on the row is the address of
 *          whichever server refreshed it. A city drawn from that is a lie about
 *          where the reader is, and it is the kind of lie somebody makes a
 *          security decision on. "Approximate location" is not available from
 *          this provider through this architecture, so it is not shown, rather
 *          than being shown wrong.
 *
 *   aal    read and carried, not yet drawn. Every session on this platform is
 *          aal1 because there is no second factor to reach aal2. The field is
 *          here so that the day V-5's second factor lands, the screen already
 *          has the fact rather than needing a migration to get it.
 *
 * `user_agent` is used, carefully. See `device.ts`: the raw header never
 * reaches the screen.
 */

export type DeviceSession = {
  id: string;
  /** True for the session the calling access token was minted for. */
  isCurrent: boolean;
  /** ISO 8601. Rendered by the caller, which knows the reader's locale. */
  signedInAt: string;
  lastSeenAt: string;
  device: DeviceDescription;
};

export type SessionsState =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | {
      state: "signed-in";
      sessions: DeviceSession[];
      readable: boolean;
      /*
       * The instant the list was read, so the screen can say "today at 10:00"
       * without calling a clock. React's purity rule forbids `Date.now()` in a
       * render and it is right to: a component that reads a clock produces a
       * different tree every time it happens to re-render. The read is not a
       * render, so the clock belongs here, and the relative labels are then
       * relative to the data rather than to whenever React got round to it.
       */
      readAt: number;
    };

type SessionRow = {
  session_id: string;
  is_current: boolean;
  signed_in_at: string;
  last_seen_at: string | null;
  user_agent: string | null;
  aal: string | null;
};

/*
 * The RPC is new and `database.types.ts` is regenerated on its own schedule, so
 * the call is made through a widened client rather than blocking this on a
 * three thousand line generated file that two other streams are also touching.
 * Same escape hatch, and the same shape, as `lib/social/profile-extras.ts`.
 * The row is validated below rather than trusted, which is what makes the cast
 * safe: nothing downstream reads a field this file has not checked.
 */
type Loose = { rpc: (fn: string, args?: Record<string, unknown>) => Promise<unknown> };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loose = (client: unknown) => client as any as Loose;

function readRows(data: unknown): DeviceSession[] {
  if (!Array.isArray(data)) return [];
  const out: DeviceSession[] = [];
  for (const entry of data as SessionRow[]) {
    if (typeof entry?.session_id !== "string") continue;
    /* `last_seen_at` is a greatest() over two columns and one of them can be
       null on a session that has never been refreshed, so falling back to the
       sign-in time keeps the screen from drawing "Invalid Date" on the row
       somebody is most likely to be looking at. */
    const lastSeen =
      typeof entry.last_seen_at === "string" && entry.last_seen_at.length > 0
        ? entry.last_seen_at
        : entry.signed_in_at;
    out.push({
      id: entry.session_id,
      isCurrent: entry.is_current === true,
      signedInAt: entry.signed_in_at,
      lastSeenAt: lastSeen,
      device: describeDevice(entry.user_agent),
    });
  }
  return out;
}

/**
 * The list, for the screen.
 *
 * `readable` is separate from an empty list on purpose, and the difference is
 * the whole point of the screen. An empty list means "you are signed in
 * nowhere", which cannot be true of somebody reading it, so an unreadable list
 * must never be drawn as an empty one: that would tell a person whose account
 * is compromised that nothing is signed in.
 */
export async function loadSessions(): Promise<SessionsState> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return { state: "unconfigured" };
  if (session.state === "signed-out") return { state: "signed-out" };

  const readAt = Date.now();
  try {
    const { data, error } = (await loose(session.supabase).rpc("my_sessions")) as {
      data: unknown;
      error: unknown;
    };
    if (error) return { state: "signed-in", sessions: [], readable: false, readAt };
    return { state: "signed-in", sessions: readRows(data), readable: true, readAt };
  } catch {
    return { state: "signed-in", sessions: [], readable: false, readAt };
  }
}
