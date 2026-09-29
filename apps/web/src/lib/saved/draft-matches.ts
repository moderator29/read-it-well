"use server";

import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { resolveSession, SIGNED_OUT_MESSAGE } from "../actions/session";
import { loadOwnListingAnyStatus } from "../listings/supabase-repository";
import { matchesFilter } from "../listings/filter";
import { createAdminClient } from "../supabase/admin";
import { filterFor } from "./search-alerts";
import { readStoredSearch } from "./searches";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "../locale";

/**
 * V-10 (the wizard's count): HOW MANY PEOPLE'S SAVED SEARCHES A DRAFT WOULD
 * MATCH TODAY. The draft is read under the lister's own client (RLS: only
 * its owner gets a draft back), and the alerting saved searches through the
 * service role, because they belong to other people; what leaves this
 * function is ONE NUMBER, of distinct people, and only when it is at least
 * three (k = 3), so no lister can learn that one particular person is
 * looking. The lister's own searches are not counted. The same matcher the
 * alerts use decides a match, so the count is the alerts' promise.
 *
 * This module exports only async functions, per the server-actions rule.
 */

const K = 3;

/**
 * The refusal, in the reader's language, and never a code (E2E audit L-2). It
 * used to refuse with the bare code "unreadable"; `DraftMatches` draws its own line on any
 * failure, but the envelope's rule is that nothing it carries is a raw code.
 */
async function unreachable(): Promise<ActionResult<{ people: number | null }>> {
  const t = getDictionary(await getLocale().catch(() => "en" as const));
  return fail(t.frontDoor.demand.matchUnreachable);
}
const MAX_SEARCHES = 5000;

export async function draftSavedSearchMatches(input: unknown): Promise<ActionResult<{ people: number | null }>> {
  const parsed = validate(z.object({ listingId: z.string().uuid() }), input);
  if (!parsed.ok) return fail(parsed.error);
  const session = await resolveSession();
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);

  const draft = await loadOwnListingAnyStatus(session.supabase, parsed.data.listingId);
  if (!draft) return unreachable();
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("saved_searches")
      .select("user_id, query")
      .eq("alert_enabled", true)
      .neq("user_id", session.user.id)
      .limit(MAX_SEARCHES);
    if (error || !data) return unreachable();
    const people = new Set<string>();
    for (const row of data as { user_id: string; query: unknown }[]) {
      if (people.has(row.user_id)) continue;
      if (matchesFilter(draft, filterFor(readStoredSearch(row.query).params))) people.add(row.user_id);
    }
    return ok({ people: people.size >= K ? people.size : null });
  } catch {
    return unreachable();
  }
}
