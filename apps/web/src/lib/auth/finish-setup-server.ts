import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { mayOweSetup, prefillName, REQUIRED_DOCUMENTS, setupRecordComplete } from "./finish-setup";

/**
 * The server half of the finish-setup step (B-2). NOT a server action, on
 * purpose: `lib/auth/actions.ts` is `"use server"`, where every export is an
 * endpoint a browser may call with any arguments. These take a client and a
 * user the caller has already resolved on the server.
 */

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Whether the account's own rows in `terms_acceptances` (read under RLS, a
 * member reads only their own) hold both the terms and the age statement.
 * True, false, or null when the rows could not be read.
 */
export async function setupOnRecord(supabase: ServerClient, userId: string): Promise<boolean | null> {
  try {
    const { data, error } = await supabase
      .from("terms_acceptances")
      .select("document")
      .eq("user_id", userId)
      .in("document", [...REQUIRED_DOCUMENTS]);
    if (error) return null;
    return setupRecordComplete(data);
  } catch {
    return null;
  }
}

/**
 * Whether this account still owes the step: social-only (`mayOweSetup`) and
 * no complete record on file. A failed read answers false, the same posture
 * as the edge gate in `proxy.ts`, which asks again on the next page load.
 */
export async function setupStillOwed(
  supabase: ServerClient,
  user: { id: string; app_metadata?: Record<string, unknown> | null },
): Promise<boolean> {
  if (!mayOweSetup({ app_metadata: user.app_metadata ?? null })) return false;
  return (await setupOnRecord(supabase, user.id)) === false;
}

export type FinishSetupView =
  | { state: "signed-out" }
  | { state: "done" }
  | { state: "owed"; firstName: string; surname: string };

/**
 * What `/sign-up/finish` draws: nobody signed in, the step already done, or
 * the form with the name the provider sent. The step is shown to ANY account
 * whose record is incomplete, not only a social one, so a person sent here
 * is never turned away with the thing still owed.
 */
export async function finishSetupView(supabase: ServerClient): Promise<FinishSetupView> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { state: "signed-out" };
  if ((await setupOnRecord(supabase, user.id)) === true) return { state: "done" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, surname")
    .eq("id", user.id)
    .maybeSingle();
  return { state: "owed", ...prefillName({ profile, metadata: user.user_metadata ?? null }) };
}
