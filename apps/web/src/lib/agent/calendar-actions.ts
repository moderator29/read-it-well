"use server";

/**
 * Closing and reopening nights on an agent's own calendar.
 *
 * This is the first and only writer of availability_status 'unavailable'. Until
 * now the only rows in public.availability came from the bookings loop marking
 * nights 'booked', so a host had no way to close a weekend for repairs, for a
 * relative, or because they were away.
 *
 * Two rules the whole file turns on.
 *
 * A 'booked' night is never touched here. Those rows belong to a real stay and
 * the bookings loop owns them; closing over one would tell the host a night is
 * blocked for repairs when in fact a guest is arriving. Every write is filtered
 * to status 'unavailable', exactly as releaseBookedNights filters to 'booked'.
 *
 * Every write goes through the agent's own RLS-bound client. The availability
 * write policy is private.owns_listing(listing_id), so the database decides
 * whose calendar this is. The service role is never used.
 */

import { revalidatePath } from "next/cache";
import { fail, formDataToObject, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE } from "../actions/session";
import { isFeatureEnabled } from "../flags";
import { blockNightsInputSchema, datesBetween, lagosToday } from "./calendar-schema";
import { getAgentContext, type AgentContext } from "./listings-queries";

const NOT_AGENT_MESSAGE =
  "Only an approved agent can manage a listing calendar.";

const PAUSED_MESSAGE =
  "Listing tools are paused for maintenance. Please try again in a little while.";

const SERVICE_DOWN_MESSAGE =
  "We could not update the calendar just then. Nothing changed, please try again in a moment.";

const NOT_YOURS_MESSAGE = "We could not find that listing on your account.";

/**
 * Shared front half: who is asking, and is this listing theirs?
 *
 * The return type is written out rather than inferred, and discriminated on
 * `ok`, so narrowing at the call sites is unambiguous. An inferred union here
 * left `error` as `string | undefined` at both callers.
 */
type OwnedListing =
  | { ok: false; error: string }
  | { ok: true; context: Extract<AgentContext, { state: "agent" }> };

async function resolveOwnedListing(listingId: string): Promise<OwnedListing> {
  const context = await getAgentContext();
  if (context.state === "unconfigured") return { ok: false, error: NOT_CONFIGURED_MESSAGE };
  if (context.state === "signed-out") return { ok: false, error: SIGNED_OUT_MESSAGE };
  if (context.state === "not-agent") return { ok: false, error: NOT_AGENT_MESSAGE };

  const { data: listing, error } = await context.supabase
    .from("listings")
    .select("id, agent_id")
    .eq("id", listingId)
    .maybeSingle();

  if (error) return { ok: false, error: SERVICE_DOWN_MESSAGE };
  if (!listing || listing.agent_id !== context.agent.id) {
    return { ok: false, error: NOT_YOURS_MESSAGE };
  }
  return { ok: true, context };
}

/** Close a run of nights so no guest can reserve them. */
export async function blockNights(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  if (!(await isFeatureEnabled("agent_listings"))) return fail(PAUSED_MESSAGE);

  const parsed = validate(blockNightsInputSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const resolved = await resolveOwnedListing(parsed.data.listingId);
  if (!resolved.ok) return fail(resolved.error);

  const today = lagosToday();
  if (parsed.data.to < today) {
    return fail("Those nights have already passed, so there is nothing to close.");
  }

  /* Never reach backwards: a night in the past cannot be closed or reopened. */
  const from = parsed.data.from < today ? today : parsed.data.from;
  const dates = datesBetween(from, parsed.data.to);
  if (dates.length === 0) return fail("Pick at least one night to close.");

  // A night already 'booked' must stay booked, so those are left out entirely
  // rather than upserted over.
  const { data: existing, error: readError } = await resolved.context.supabase
    .from("availability")
    .select("date, status")
    .eq("listing_id", parsed.data.listingId)
    .in("date", dates);

  if (readError) return fail(SERVICE_DOWN_MESSAGE);

  const booked = new Set(
    (existing ?? []).filter((r) => r.status === "booked").map((r) => r.date),
  );
  const writable = dates.filter((d) => !booked.has(d));

  if (writable.length === 0) {
    return fail("Every one of those nights already has a booking on it.");
  }

  const { error: writeError } = await resolved.context.supabase.from("availability").upsert(
    writable.map((date) => ({
      listing_id: parsed.data.listingId,
      date,
      status: "unavailable" as const,
    })),
    { onConflict: "listing_id,date" },
  );

  if (writeError) {
    if (writeError.code === "42501") return fail(NOT_YOURS_MESSAGE);
    return fail(SERVICE_DOWN_MESSAGE);
  }

  revalidatePath(`/agent/listings/${parsed.data.listingId}/calendar`);
  revalidatePath(`/listing/${parsed.data.listingId}`);
  return ok(null);
}

/** Reopen nights this agent had closed. Booked nights are never affected. */
export async function unblockNights(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  if (!(await isFeatureEnabled("agent_listings"))) return fail(PAUSED_MESSAGE);

  const parsed = validate(blockNightsInputSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const resolved = await resolveOwnedListing(parsed.data.listingId);
  if (!resolved.ok) return fail(resolved.error);

  const { error } = await resolved.context.supabase
    .from("availability")
    .delete()
    .eq("listing_id", parsed.data.listingId)
    .eq("status", "unavailable")
    .gte("date", parsed.data.from)
    .lte("date", parsed.data.to);

  if (error) {
    if (error.code === "42501") return fail(NOT_YOURS_MESSAGE);
    return fail(SERVICE_DOWN_MESSAGE);
  }

  revalidatePath(`/agent/listings/${parsed.data.listingId}/calendar`);
  revalidatePath(`/listing/${parsed.data.listingId}`);
  return ok(null);
}
