"use server";

/**
 * The saved-search write loop: save, rename, forget, and the alert switch.
 *
 * ---------------------------------------------------------------------------
 * WHAT DECIDES WHOSE ROW IT IS.
 *
 * Not this file. Every write goes through the caller's own request-scoped
 * client, so `saved_searches_own` (engagement migration: `for all using
 * (auth.uid() = user_id) with check (auth.uid() = user_id)`) is the authority.
 * An id belonging to somebody else updates zero rows and deletes zero rows,
 * and that is a refusal by the database rather than by an `if` somebody could
 * later delete. The `eq("user_id", ...)` on each statement is there so the
 * plan uses `saved_searches_user_idx` and so a reader can see the intent;
 * remove it and the outcome is identical.
 *
 * Every write asks for the row back (`.select()`), so nothing here reports a
 * success the database did not perform. A cross-account id therefore reports
 * "we could not find that saved search" because no row came back, not because
 * this code compared two user ids.
 *
 * ---------------------------------------------------------------------------
 * ALERTS ARE ON WHEN A SEARCH IS SAVED, AND THE CONTROL SAYS SO.
 *
 * The reason a person saves a hunt is to be told when it turns something up,
 * so the switch starts on and the confirmation line on the control states it
 * in plain words with the way to turn it off one tap away. Switching alerts on
 * always moves the watermark to now, so turning the switch on never posts the
 * back catalogue at somebody.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import {
  NOT_CONFIGURED_MESSAGE,
  SIGNED_OUT_MESSAGE,
  resolveSession,
} from "../actions/session";
import {
  SAVED_SEARCH_LABEL_MAX,
  SAVED_SEARCH_LIMIT,
  canonicalSearch,
  storedSearchJson,
} from "./searches";
import { asSavedSearches, SAVED_SEARCH_COLUMNS } from "./searches-db";
import { toSavedSearchView } from "./searches-queries";
import type { SavedSearchView } from "./searches";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SEARCHES_PATH = "/saved/searches";

const DOWN_MESSAGE =
  "We could not update your saved searches just now. Please try again in a moment.";
const GONE_MESSAGE =
  "We could not find that saved search. It may already have been removed.";
const EMPTY_MESSAGE =
  "Add a place name or a filter first, so this search has something to watch for.";
const FULL_MESSAGE = `You are keeping ${SAVED_SEARCH_LIMIT} searches, which is the most we hold. Remove one and this one will save.`;

/**
 * The parameters as they arrive from the shelf.
 *
 * Bounded before anything is parsed, because this is an unauthenticated shape
 * arriving from a browser: at most twenty names, each short, each carrying a
 * short value. `canonicalSearch` then throws away everything it does not
 * recognise, so the stored row can only hold parameters the results page reads.
 */
const paramsSchema = z.record(
  z.string().trim().min(1).max(32),
  z.string().trim().max(200),
);

const idSchema = z.string().trim().regex(UUID_RE, "That saved search is not one of ours.");

const labelSchema = z
  .string()
  .trim()
  .min(1, "Give this search a name.")
  .max(SAVED_SEARCH_LABEL_MAX, `Keep the name to ${SAVED_SEARCH_LABEL_MAX} characters or fewer.`);

const saveSchema = z.object({
  params: paramsSchema,
  label: labelSchema.optional(),
});

const renameSchema = z.object({ id: idSchema, label: labelSchema });
const idOnlySchema = z.object({ id: idSchema });
const alertSchema = z.object({ id: idSchema, enabled: z.boolean() });

/**
 * Keep this search.
 *
 * Idempotent by the canonical key: saving the same hunt twice returns the row
 * that already exists rather than a second copy of it, which is what the
 * partial unique index enforces underneath. The unique violation is handled
 * rather than reported, because a person who taps Save on a search they
 * already keep has had their intent satisfied.
 */
export async function saveSearch(input: {
  params: Record<string, string>;
  label?: string;
}): Promise<ActionResult<SavedSearchView>> {
  const parsed = validate(saveSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const canonical = canonicalSearch(parsed.data.params);
  if (canonical.key.length === 0) return fail(EMPTY_MESSAGE);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const client = asSavedSearches(session.supabase);

  /* The row that may already be here, read under the same policy that will
     refuse the write. A search saved in another tab lands here. */
  const { data: existing, error: readError } = await client
    .from("saved_searches")
    .select(SAVED_SEARCH_COLUMNS)
    .eq("user_id", session.user.id)
    .eq("query_key", canonical.key)
    .maybeSingle();
  if (readError) return fail(DOWN_MESSAGE);
  if (existing) {
    revalidatePath(SEARCHES_PATH);
    return ok(toSavedSearchView(existing));
  }

  /* The ceiling, counted from the account's own rows in this same request.
     `head: true` asks Postgres for the count and none of the rows. */
  const { count, error: countError } = await client
    .from("saved_searches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.user.id);
  if (countError) return fail(DOWN_MESSAGE);
  if ((count ?? 0) >= SAVED_SEARCH_LIMIT) return fail(FULL_MESSAGE);

  const { data, error } = await client
    .from("saved_searches")
    .insert({
      user_id: session.user.id,
      label: parsed.data.label ?? null,
      query: storedSearchJson(canonical),
      query_key: canonical.key,
      alert_enabled: true,
      alert_cursor_at: new Date().toISOString(),
    })
    .select(SAVED_SEARCH_COLUMNS)
    .maybeSingle();

  if (error) {
    // 23505: the same search landed from another tab between the read above
    // and this insert. The person wanted it kept and it is kept.
    if (error.code === "23505") {
      const { data: raced } = await client
        .from("saved_searches")
        .select(SAVED_SEARCH_COLUMNS)
        .eq("user_id", session.user.id)
        .eq("query_key", canonical.key)
        .maybeSingle();
      if (raced) {
        revalidatePath(SEARCHES_PATH);
        return ok(toSavedSearchView(raced));
      }
    }
    return fail(DOWN_MESSAGE);
  }
  if (!data) return fail(DOWN_MESSAGE);

  revalidatePath(SEARCHES_PATH);
  revalidatePath("/search");
  return ok(toSavedSearchView(data));
}

/** Give a kept search a name of the person's own. */
export async function renameSavedSearch(input: {
  id: string;
  label: string;
}): Promise<ActionResult<SavedSearchView>> {
  const parsed = validate(renameSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const { data, error } = await asSavedSearches(session.supabase)
    .from("saved_searches")
    .update({ label: parsed.data.label })
    .eq("id", parsed.data.id)
    .eq("user_id", session.user.id)
    .select(SAVED_SEARCH_COLUMNS)
    .maybeSingle();
  if (error) return fail(DOWN_MESSAGE);
  if (!data) return fail(GONE_MESSAGE);

  revalidatePath(SEARCHES_PATH);
  return ok(toSavedSearchView(data));
}

/** Stop keeping a search. */
export async function deleteSavedSearch(input: {
  id: string;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = validate(idOnlySchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const { data, error } = await asSavedSearches(session.supabase)
    .from("saved_searches")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", session.user.id)
    .select("id")
    .maybeSingle();
  if (error) return fail(DOWN_MESSAGE);
  if (!data) return fail(GONE_MESSAGE);

  revalidatePath(SEARCHES_PATH);
  revalidatePath("/search");
  return ok({ id: data.id });
}

/**
 * Turn the alert on or off.
 *
 * Switching ON moves the watermark to now, so the next run reports places that
 * go up from this moment and never the back catalogue. Switching OFF leaves
 * the watermark where it is, because the search is still kept and the person
 * may switch it back on; the job ignores the row either way.
 */
export async function setSavedSearchAlert(input: {
  id: string;
  enabled: boolean;
}): Promise<ActionResult<SavedSearchView>> {
  const parsed = validate(alertSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const { data, error } = await asSavedSearches(session.supabase)
    .from("saved_searches")
    .update({
      alert_enabled: parsed.data.enabled,
      ...(parsed.data.enabled ? { alert_cursor_at: new Date().toISOString() } : {}),
    })
    .eq("id", parsed.data.id)
    .eq("user_id", session.user.id)
    .select(SAVED_SEARCH_COLUMNS)
    .maybeSingle();
  if (error) return fail(DOWN_MESSAGE);
  if (!data) return fail(GONE_MESSAGE);

  revalidatePath(SEARCHES_PATH);
  return ok(toSavedSearchView(data));
}
