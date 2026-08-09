import "server-only";

import { cache } from "react";
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
export const resolveSession = cache(async function resolveSession(): Promise<SessionState> {
  if (!isSupabaseConfigured()) return { state: "unconfigured" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: "signed-out" };
  return { state: "signed-in", supabase, user };
});

/** The two copy lines every action reuses for the non-signed-in outcomes. */
export const NOT_CONFIGURED_MESSAGE =
  "This feature switches on the moment the platform keys land. Nothing you entered was lost.";
export const SIGNED_OUT_MESSAGE = "Sign in to continue. Your details are kept safe.";
