import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { mayOweSetup } from "../auth/finish-setup";
import { setupStillOwed } from "../auth/finish-setup-server";
import { insideSetupExempt } from "./setup-exempt";
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
  /* `setupOwed` marks a Google or Apple account that is signed in but has not
     finished setting up (terms + 18+), refused on a write. See
     "THE FINISH-SETUP HOLD" below. It narrows exactly like a signed-out
     session, so every action already refuses it in its own envelope. */
  | { state: "signed-out"; setupOwed?: true }
  | { state: "signed-in"; supabase: SupabaseClient<Database>; user: User };

/**
 * MEMOISED PER REQUEST, AND THAT IS THE WHOLE PERFORMANCE STORY OF THIS FILE.
 *
 * `supabase.auth.getUser()` is not a local token decode. It is an HTTPS request
 * to GoTrue at `/auth/v1/user`, which validates the access token server-side,
 * which is precisely why it is the call to use rather than `getSession()`. It
 * is also therefore a network round trip, and this function has 110 call sites
 * across 62 files.
 *
 * The cost was being paid several times per render. On `/home`,
 * `app/(app)/layout.tsx` awaits `getShellIdentity()` and the page awaits
 * `getHomeOverview()`; both of those are individually wrapped in React
 * `cache()`, which is the right instinct applied one level too high. The memo
 * sat on each caller, so every caller still made its own identical auth call,
 * and two round trips happened before anything rendered. Wrapping the shared
 * function instead collapses all of them into one.
 *
 * WHY THIS IS SAFE, checked call site by call site rather than assumed.
 * React's `cache` is scoped to a single request, so nothing is shared between
 * users or between requests, and the only way a per-request memo can be wrong
 * is if the session changes MID-request:
 *
 *   - `signInWithPassword`, `verifyOtp` and `exchangeCodeForSession` in
 *     `lib/auth/actions.ts` establish a session and none of them calls
 *     `resolveSession` afterwards.
 *   - `signOut` and `deleteAccount` in `lib/profile/actions.ts` both call
 *     `resolveSession` BEFORE tearing the session down, and both return
 *     immediately after.
 *
 * So there is no path today where a second resolution inside one request should
 * legitimately see a different answer. IF ONE IS EVER ADDED, this memo is where
 * it will bite: an action that signs a user in or out and then re-resolves will
 * read the pre-change state. The fix in that case is to have that action carry
 * the new state forward explicitly, not to remove the memo.
 *
 * The returned client is shared too, which is correct: `createClient` builds a
 * request-scoped client over the same cookie store, so a second one is a second
 * object reading identical cookies.
 */
const readSession = cache(async function readSession(): Promise<SessionState> {
  if (!isSupabaseConfigured()) return { state: "unconfigured" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: "signed-out" };
  return { state: "signed-in", supabase, user };
});

/**
 * THE FINISH-SETUP HOLD, ON THE SERVER (B-2 follow-up).
 *
 * `proxy.ts` holds a Google or Apple account that has not yet accepted the
 * terms and the 18+ statement at `/sign-up/finish`, but only on GET page
 * loads (`finishSetupGateApplies`): a server action or an `/api` POST is never
 * redirected there, because a 307 would break the fetch and could trap
 * somebody who only wanted to sign out. So the hold on WRITES lives here, in
 * the one resolver every action already calls.
 *
 * THE RULE IS THE PROXY'S. `mayOweSetup` decides from the verified user's
 * `app_metadata` (providers, and the service-role-only `vallo_setup_done`
 * flag) with no read, so an email or phone account, or a social one that has
 * finished, costs nothing here: not a header read, not a query. Only a
 * social-only account without the flag reads its own `terms_acceptances`
 * rows, under RLS, once per request (`setupStillOwed`). A read that fails lets
 * the request through, the same posture as the edge gate.
 *
 * WHEN IT HOLDS. Inside a server action (`next-action` header), every
 * `resolveSession()` answers `{ state: "signed-out", setupOwed: true }` for
 * an account that owes the step, so the action refuses in the envelope it
 * already speaks ("Sign in to continue.", which the UI already shows, and
 * whose sign-in link lands a signed-in person on the step via the edge gate).
 * Page renders are NOT held here; the proxy owns those. A route handler that
 * writes calls `resolveWriteSession()`, which holds regardless of the request
 * kind, or `accountSetupOwed()` when it resolves its own user.
 *
 * WHAT IS NEVER HELD: signing out, account deletion and restore, and
 * read-only actions, each of which runs its body inside `setupExempt(...)`
 * (lib/actions/setup-exempt.ts).
 * `finishSocialSetup` resolves its own user and never comes through here.
 */

/** Whether this request is a server action call. False outside a request. */
async function isServerActionCall(): Promise<boolean> {
  try {
    return (await headers()).has("next-action");
  } catch {
    return false;
  }
}

/** One read per request at most, and only for a social-only account. */
const setupOwedThisRequest = cache(async function setupOwedThisRequest(): Promise<boolean> {
  const session = await readSession();
  if (session.state !== "signed-in") return false;
  return setupStillOwed(session.supabase, session.user);
});

const SETUP_OWED: SessionState = { state: "signed-out", setupOwed: true };

/**
 * Whether an account a route resolved itself still owes the step. No read
 * for an email account or a finished one; the rule is `setupStillOwed`.
 */
export async function accountSetupOwed(
  supabase: Parameters<typeof setupStillOwed>[0],
  user: Pick<User, "id" | "app_metadata">,
): Promise<boolean> {
  if (!mayOweSetup({ app_metadata: user.app_metadata ?? null })) return false;
  if (insideSetupExempt()) return false;
  return setupStillOwed(supabase, user);
}

async function holdIfSetupOwed(session: SessionState, always: boolean): Promise<SessionState> {
  if (session.state !== "signed-in") return session;
  /* Pure, from the verified user: an email account stops here. */
  if (!mayOweSetup({ app_metadata: session.user.app_metadata ?? null })) return session;
  if (insideSetupExempt()) return session;
  if (!always && !(await isServerActionCall())) return session;
  return (await setupOwedThisRequest()) ? SETUP_OWED : session;
}

/** The session for a server action or a page. See the two notes above. */
export async function resolveSession(): Promise<SessionState> {
  return holdIfSetupOwed(await readSession(), false);
}

/**
 * The session for a route handler that writes: held for an account that owes
 * the finish-setup step whatever the request kind.
 */
export async function resolveWriteSession(): Promise<SessionState> {
  return holdIfSetupOwed(await readSession(), true);
}

/**
 * WHO IS ASKING, WHEN THE ANSWER NEEDED IS ONLY AN ID.
 *
 * `resolveSession()` above calls `auth.getUser()`, a GoTrue round trip, and
 * hands back the whole `User`. The app shell needs one thing from it, the
 * caller's id, and every shell read then goes through PostgREST, which
 * authorises on the same access token by its signature alone. So the shell
 * resolves the id the way PostgREST does: `auth.getClaims()` verifies the
 * token's ES256 signature against the project's published JWKS (cached for ten
 * minutes per server instance) and its expiry, locally, with no call to auth.
 * A symmetric (HS256) token or a runtime without WebCrypto makes getClaims fall
 * back to `getUser()` itself, so nothing is ever trusted unverified.
 *
 * WHAT IS NOT LOST. `proxy.ts` refreshes the token before render (with
 * `getClaims()` since SPEED-1, so the edge no longer crosses to GoTrue on every
 * navigation). Revocation is checked wherever the full user is needed: every
 * page and action that needs it (email, metadata, factors) keeps calling
 * `resolveSession()`, whose `getUser()` runs in dub1 beside GoTrue; this is
 * for readers that need the id and nothing else.
 *
 * Memoised per request, like `resolveSession`, for the same reasons.
 */
export type ClaimsSessionState =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | { state: "signed-in"; supabase: SupabaseClient<Database>; userId: string };

export const resolveSessionClaims = cache(async function resolveSessionClaims(): Promise<ClaimsSessionState> {
  if (!isSupabaseConfigured()) return { state: "unconfigured" };
  const supabase = await createClient();
  /* getClaims THROWS, rather than answering an error, on a token it cannot
     parse or an algorithm it does not know (a corrupt or hand-made cookie).
     That is nobody, not a server error. */
  const answer = await supabase.auth.getClaims().catch(() => null);
  const sub = !answer || answer.error ? undefined : answer.data?.claims?.sub;
  if (typeof sub !== "string" || sub.length === 0) return { state: "signed-out" };
  return { state: "signed-in", supabase, userId: sub };
});

/** The two copy lines every action reuses for the non-signed-in outcomes. */
export const NOT_CONFIGURED_MESSAGE =
  "We cannot reach this part of the platform right now. Nothing you entered was lost.";
export const SIGNED_OUT_MESSAGE = "Sign in to continue.";
/** For a surface that can say more than the envelope does. */
export const SETUP_OWED_MESSAGE = "Finish setting up your account to continue.";
