"use server";

/**
 * Recording a no show: the one lifecycle move a person makes.
 *
 * The sweeps in lib/cron never decide NO_SHOW, because "nobody arrived" is
 * something only the host at the door knows. This action is that host's
 * control (and an admin's override for support cases), and it is the twin of
 * recordStay in lib/agent/bookings-actions.ts with one difference: the move
 * itself happens in public.record_booking_no_show, so the state event and
 * the guest's notification land in one transaction (the nights stay booked
 * until check-out, ESC-04), and the same function refuses an actor who is neither
 * the listing's host nor an admin even if this action were bypassed.
 *
 * Every export is a public endpoint, so the action authorises hard before
 * anything: a signed-in session, the "bookings" flag, the booking read
 * through the service role (a host has no policy for other people's
 * bookings, and the read is only to find out whose it is), then the host
 * check walks listings.agent_id to public.agents.user_id, never comparing a
 * listing's agent id against the session user, which would be false for
 * every agent alive.
 *
 * The decision is made twice on purpose: once here in plain words so a host
 * reads why (lib/bookings/lifecycle.ts, noShowDecision), once in the
 * database so a race between two devices cannot record it twice.
 */

import { revalidatePath } from "next/cache";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { callServiceFunction } from "../cron/rpc";
import { isFeatureEnabled } from "../flags";
import { createAdminClient } from "../supabase/admin";
import {
  NO_SHOW_MESSAGES,
  lagosToday,
  noShowDecision,
  noShowInputSchema,
  parseNoShowOutcome,
  type NoShowInput,
} from "./lifecycle";

const PAUSED_MESSAGE =
  "Booking decisions are paused for a moment while we make improvements. The stay is unchanged.";

const NOT_YOURS_MESSAGE =
  "Only the listing's host or an administrator can record a no show. If this listing is yours, sign in with the account that hosts it.";

const SERVICE_DOWN_MESSAGE =
  "We could not record that just now. The stay is unchanged. Please try again shortly.";

function refreshBookingSurfaces(): void {
  revalidatePath("/agent/bookings");
  revalidatePath("/bookings");
  revalidatePath("/admin/bookings");
}

export async function recordNoShow(input: NoShowInput): Promise<ActionResult<null>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  if (!(await isFeatureEnabled("bookings"))) return fail(PAUSED_MESSAGE);

  const parsed = validate(noShowInputSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { bookingId, note } = parsed.data;

  try {
    const admin = createAdminClient();

    const { data: booking, error: readError } = await admin
      .from("bookings")
      .select("id, listing_id, status, check_in")
      .eq("id", bookingId)
      .maybeSingle();
    if (readError) return fail(SERVICE_DOWN_MESSAGE);
    if (!booking) return fail(NO_SHOW_MESSAGES.missing);

    // ------------------------------------------------- authorisation
    const [{ data: listing }, { data: roles }] = await Promise.all([
      admin
        .from("listings")
        .select("agent_id, agents!inner(user_id)")
        .eq("id", booking.listing_id)
        .maybeSingle(),
      admin
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["admin", "super_admin"]),
    ]);
    const isHost = listing?.agents?.user_id === session.user.id;
    const isAdmin = (roles?.length ?? 0) > 0;
    if (!isHost && !isAdmin) return fail(NOT_YOURS_MESSAGE);

    // ------------------------------------------------- the decision, in words
    const decision = noShowDecision(
      { status: booking.status, checkIn: booking.check_in },
      lagosToday(),
    );
    if (decision === "already") {
      // A double tap is not an error and must not read as one.
      refreshBookingSurfaces();
      return ok(null);
    }
    if (decision !== "record") return fail(NO_SHOW_MESSAGES[decision]);

    // ------------------------------------------------- the move, once
    const data = await callServiceFunction(admin, "record_booking_no_show", {
      p_booking: booking.id,
      p_actor: session.user.id,
      p_note: note && note.length > 0 ? note : null,
    });
    const outcome = parseNoShowOutcome(data);

    if (outcome.outcome === "recorded" || outcome.outcome === "already") {
      refreshBookingSurfaces();
      return ok(null);
    }
    // The row moved between our read and the database's lock. Say where it
    // stands rather than reporting a record that did not happen.
    return fail(NO_SHOW_MESSAGES[outcome.outcome]);
  } catch {
    // createAdminClient throws without a service key; the function throws on
    // a refused actor or a lost connection. Nothing was recorded either way.
    return fail(SERVICE_DOWN_MESSAGE);
  }
}
