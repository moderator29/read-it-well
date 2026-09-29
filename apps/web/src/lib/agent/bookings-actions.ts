"use server";

/**
 * The supply side of the bookings loop: a host answering a request.
 *
 * There are exactly two transitions a host owns, and they are not symmetrical.
 *
 * Accept is PENDING to CONFIRMED, and that transition already exists: confirm()
 * in lib/bookings/actions.ts performs it, writes the state event, marks the
 * nights booked in availability and emails the guest. That file belongs to the
 * payments work and is read-only from here, so acceptBooking authorises the
 * caller in its own words and then DELEGATES to confirm(). The state machine is
 * not reimplemented, not even partially: nothing in this file writes a booking
 * to CONFIRMED.
 *
 * Decline is PENDING to CANCELLED with a reason, and confirm() has no
 * counterpart for it. cancel() in the same file is the guest's path and reads
 * ownership through the guest's own RLS client, so a host cannot borrow it. So
 * declineBooking does the transition here: prove host ownership through the
 * caller's own client first, then move the row, append the history, release the
 * nights and tell the guest why.
 *
 * Every export is a public endpoint, so every one starts the same way: resolve
 * the session, respect the "bookings" flag, resolve the caller's row in
 * public.agents. That last step is load bearing. listings.agent_id references
 * public.agents(id), never the auth user id, so a check that compared
 * listings.agent_id against the session user would be false for every agent
 * alive and would lock the whole supply side out silently.
 *
 * Nothing here reports success it did not achieve. The service role can be
 * absent (no key) or refuse a write; both come back as an honest sentence.
 */

import { revalidatePath } from "next/cache";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import {
  NOT_CONFIGURED_MESSAGE,
  SIGNED_OUT_MESSAGE,
  resolveSession,
} from "../actions/session";
import { isFeatureEnabled } from "../flags";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { createAdminClient } from "../supabase/admin";
// Read and called, never edited: lib/bookings is owned by the payments work.
import { confirm } from "../bookings/actions";
import {
  bookingIdSchema,
  declineInputSchema,
  recordStayInputSchema,
  type BookingIdInput,
  type DeclineInput,
  type RecordStayInput,
} from "./bookings-schema";

const NOT_AGENT_MESSAGE =
  "Only approved agents can answer booking requests. Apply in two minutes.";

const PAUSED_MESSAGE =
  "Booking decisions are paused for a moment while we make improvements. The request is unchanged.";

const NOT_FOUND_MESSAGE =
  "We could not find that request on your listings. Reload the page to see your current requests.";

const SERVICE_DOWN_MESSAGE =
  "We could not record that decision just now. The request is unchanged. Please try again shortly.";

const NOT_PENDING_MESSAGE =
  "This request is no longer waiting on you, so it cannot be declined. Reload the page to see where it stands.";

const RACED_MESSAGE =
  "This request changed while you were deciding. Reload the page to see where it stands.";

const NOT_CONFIRMED_MESSAGE =
  "Only a confirmed stay can be recorded. Reload the page to see where this one stands.";

const NOT_ENDED_MESSAGE =
  "This stay has not ended yet, so there is nothing to record. Come back after the last night.";

const NOT_ARRIVED_MESSAGE =
  "Arrival day has not come yet, so a no show cannot be recorded. Come back on arrival day.";

type HostGate =
  | { ok: false; error: string }
  | {
      ok: true;
      supabase: SupabaseClient<Database>;
      user: User;
      agentId: string;
    };

/**
 * Session, flag and agent identity in one gate, so the three refusals are
 * written once. Mirrors requireAgent in listings-actions.ts deliberately: an
 * agent should never meet two different sentences for the same situation.
 */
async function requireHost(): Promise<HostGate> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return { ok: false, error: NOT_CONFIGURED_MESSAGE };
  if (session.state === "signed-out") return { ok: false, error: SIGNED_OUT_MESSAGE };

  if (!(await isFeatureEnabled("bookings"))) {
    return { ok: false, error: PAUSED_MESSAGE };
  }

  const { data, error } = await session.supabase
    .from("agents")
    .select("id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !data) return { ok: false, error: NOT_AGENT_MESSAGE };

  return { ok: true, supabase: session.supabase, user: session.user, agentId: data.id };
}

type OwnedBooking = {
  id: string;
  listing_id: string;
  guest_id: string;
  status: Database["public"]["Enums"]["booking_status"];
  check_in: string;
  check_out: string;
};

/**
 * The booking, but only if it belongs to one of this agent's listings.
 *
 * Proven twice over by construction: the read runs under the caller's own
 * client, where bookings_host_select is the only policy that could return it,
 * and the inner join is pinned to this agent's row in public.agents. Anything
 * else simply does not come back.
 */
async function ownedBooking(
  supabase: SupabaseClient<Database>,
  agentId: string,
  bookingId: string,
): Promise<OwnedBooking | null> {
  const { data } = await supabase
    .from("bookings")
    .select("id, listing_id, guest_id, status, check_in, check_out, listings!inner(agent_id)")
    .eq("id", bookingId)
    .eq("listings.agent_id", agentId)
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as OwnedBooking;
  return {
    id: row.id,
    listing_id: row.listing_id,
    guest_id: row.guest_id,
    status: row.status,
    check_in: row.check_in,
    check_out: row.check_out,
  };
}

function refreshBookingSurfaces() {
  revalidatePath("/agent/bookings");
  revalidatePath("/agent/dashboard");
  revalidatePath("/agent/earnings");
  revalidatePath("/bookings");
}

/* --------------------------------------------------------------- accept */

/**
 * Accept a request: PENDING to CONFIRMED.
 *
 * Ownership is proven here so the agent gets a sentence about their own
 * listings rather than a generic refusal, and then the transition itself is
 * confirm()'s work. confirm() authorises again on its own terms, which is
 * correct for an exported endpoint and is left exactly as it is.
 */
export async function acceptBooking(input: BookingIdInput): Promise<ActionResult<null>> {
  const gate = await requireHost();
  if (!gate.ok) return fail(gate.error);

  const parsed = validate(bookingIdSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const booking = await ownedBooking(gate.supabase, gate.agentId, parsed.data.bookingId);
  if (!booking) return fail(NOT_FOUND_MESSAGE);

  // Accepting an already accepted request is a no-op, the same answer
  // confirm() gives, stated here so a double tap never reads as an error.
  if (booking.status === "CONFIRMED") {
    refreshBookingSurfaces();
    return ok(null);
  }
  if (booking.status !== "PENDING") {
    return fail(
      "This request was cancelled, so it cannot be accepted. Reload the page to see where it stands.",
    );
  }

  // The transition, the state event, the calendar and the guest's email are all
  // confirm()'s: this line is the whole of accepting a booking.
  const result = await confirm(booking.id);
  if (!result.ok) return fail(result.error, result.fieldErrors);

  refreshBookingSurfaces();
  return ok(null);
}

/* -------------------------------------------------------------- decline */

/**
 * Decline a request: PENDING to CANCELLED, with a reason the guest reads.
 *
 * Guests hold no UPDATE grant on bookings and neither do agents, by design, so
 * the transition is service-role work once ownership has been proven above. The
 * order matters: move the row first and only claim success if a row actually
 * moved, then append the history, release the nights, then speak. A replay
 * finds the booking already cancelled and answers success without writing
 * anything twice.
 *
 * The status change also fires private.notify_booking_change, which tells the
 * guest their stay was cancelled in general terms. The row written below is the
 * one that carries the host's actual reason, which is the part that makes a
 * decline feel like an answer rather than a disappearance.
 */
export async function declineBooking(input: DeclineInput): Promise<ActionResult<null>> {
  const gate = await requireHost();
  if (!gate.ok) return fail(gate.error);

  const parsed = validate(declineInputSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { bookingId, reason } = parsed.data;

  const booking = await ownedBooking(gate.supabase, gate.agentId, bookingId);
  if (!booking) return fail(NOT_FOUND_MESSAGE);

  // Replay: already declined or already cancelled by either side. Nothing to
  // do, and nothing to apologise for.
  if (booking.status === "CANCELLED") {
    refreshBookingSurfaces();
    return ok(null);
  }
  // Only a request that is still waiting can be declined. A confirmed stay is
  // a different conversation and a different transition.
  if (booking.status !== "PENDING") return fail(NOT_PENDING_MESSAGE);

  try {
    const admin = createAdminClient();

    // Guarded on status, so two hosts on two devices cannot both "win": the
    // second update matches no row and says so instead of reporting success.
    const { data: moved, error: updateError } = await admin
      .from("bookings")
      .update({ status: "CANCELLED" })
      .eq("id", booking.id)
      .eq("status", "PENDING")
      .select("id");

    if (updateError) return fail(SERVICE_DOWN_MESSAGE);

    if (!moved || moved.length === 0) {
      // Something else moved it between our read and our write. Find out what
      // rather than guessing: a race that landed on CANCELLED is still a
      // success from the host's point of view.
      const { data: current } = await admin
        .from("bookings")
        .select("status")
        .eq("id", booking.id)
        .maybeSingle();
      if (current?.status === "CANCELLED") {
        refreshBookingSurfaces();
        return ok(null);
      }
      return fail(RACED_MESSAGE);
    }

    // The booking is cancelled. Everything below is completion work on a
    // decision that has already committed, so a failure here must not tell the
    // host their decline did not happen: it did.
    await admin.from("booking_state_events").insert({
      booking_id: booking.id,
      from_status: "PENDING",
      to_status: "CANCELLED",
      actor_id: gate.user.id,
      note: reason,
    });

    // The nights go back. The real hold on a PENDING request is the GiST
    // exclusion constraint, which the status change has already released; this
    // clears any availability row marked booked across the same span, so a
    // calendar that was written ahead of confirmation cannot strand the dates.
    // Only rows carrying status 'booked' are touched: a night blocked by hand
    // stays blocked.
    await admin
      .from("availability")
      .delete()
      .eq("listing_id", booking.listing_id)
      .eq("status", "booked")
      .gte("date", booking.check_in)
      .lt("date", booking.check_out);

    // Kind, plain, and it names the reason, because "cancelled" on its own is
    // the worst thing a guest can read.
    await admin.from("notifications").insert({
      user_id: booking.guest_id,
      kind: "booking",
      title: "Your booking request was not accepted",
      body: `The host could not take these dates. They said: ${reason} Nothing was charged, and other stays are open.`,
      href: "/bookings",
    });
  } catch {
    // createAdminClient throws without a service key. Nothing was written, and
    // the host is told exactly that.
    return fail(SERVICE_DOWN_MESSAGE);
  }

  refreshBookingSurfaces();
  return ok(null);
}

/* ---------------------------------------------------------- record stay */

/**
 * Today in Lagos, as a plain date string.
 *
 * "Has this stay finished" is a question about the day the guest is standing
 * in, not the day the server is running in. On a UTC box an hour either side of
 * midnight is the difference between the control appearing and not, every
 * single night, and Nigeria does not observe daylight saving so a fixed offset
 * would be correct too. `en-CA` is used for its format, which is ISO, matching
 * the date columns this is compared against.
 */
function todayInLagos(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
}

/**
 * Record what became of a confirmed stay: CONFIRMED to COMPLETED or NO_SHOW.
 *
 * THE BOOKING LOOP HAD NO END. A request could be made, accepted and called
 * off, and there it stopped: three states describing an intent and its
 * withdrawal, with nothing that says the guest actually arrived and stayed. So
 * an agent's list grew a tail of confirmed bookings from months ago that they
 * could not clear, a completed stay was indistinguishable from one still to
 * come, and nothing downstream had an event to hang on.
 *
 * `booking_status` now carries COMPLETED and NO_SHOW, placed after CONFIRMED so
 * anything sorting on the enum reads the journey in order. This is the
 * transition that reaches them, and it is written as the twin of
 * declineBooking, deliberately: same gate, same ownership proof, same
 * status-guarded update, same race resolution, same append to
 * booking_state_events. A second shape for the same kind of move is how state
 * machines drift apart.
 *
 * The dates are checked because a control that lets somebody mark next month's
 * stay complete is not a record, it is a text field. A stay can be completed
 * once its last night has passed; a no show can be recorded from arrival day,
 * because that is the day you learn it.
 *
 * The guest is told about a completion, by private.notify_booking_change, and
 * is told nothing about a no show. That asymmetry is on purpose: a notification
 * saying somebody failed to turn up is an accusation, and the row is visible on
 * their own booking either way.
 */
export async function recordStay(input: RecordStayInput): Promise<ActionResult<null>> {
  const gate = await requireHost();
  if (!gate.ok) return fail(gate.error);

  const parsed = validate(recordStayInputSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { bookingId, outcome, note } = parsed.data;

  const booking = await ownedBooking(gate.supabase, gate.agentId, bookingId);
  if (!booking) return fail(NOT_FOUND_MESSAGE);

  // Replay: already recorded, and recorded the same way. A double tap is not an
  // error and must not read as one.
  if (booking.status === outcome) {
    refreshBookingSurfaces();
    return ok(null);
  }
  // Recorded the OTHER way is a different matter, and it is not ours to
  // overwrite: a stay that is on the record as complete does not quietly become
  // a no show because somebody tapped the wrong control.
  if (booking.status === "COMPLETED" || booking.status === "NO_SHOW") {
    return fail(
      "This stay is already on the record. Reload the page to see what was recorded.",
    );
  }
  if (booking.status !== "CONFIRMED") return fail(NOT_CONFIRMED_MESSAGE);

  const today = todayInLagos();
  // check_out is the morning the guest leaves, so the stay is over once that
  // date has arrived. Strictly greater, so same-day shortlets can be recorded
  // on the day they end rather than the day after.
  if (outcome === "COMPLETED" && booking.check_out > today) return fail(NOT_ENDED_MESSAGE);
  if (outcome === "NO_SHOW" && booking.check_in > today) return fail(NOT_ARRIVED_MESSAGE);

  try {
    const admin = createAdminClient();

    // Guarded on CONFIRMED, so two devices cannot both record an outcome: the
    // second update matches no row and says so rather than reporting success.
    const { data: moved, error: updateError } = await admin
      .from("bookings")
      .update({ status: outcome })
      .eq("id", booking.id)
      .eq("status", "CONFIRMED")
      .select("id");

    if (updateError) return fail(SERVICE_DOWN_MESSAGE);

    if (!moved || moved.length === 0) {
      // Something moved it between our read and our write. If it landed where
      // we were going, that is a success from the agent's point of view.
      const { data: current } = await admin
        .from("bookings")
        .select("status")
        .eq("id", booking.id)
        .maybeSingle();
      if (current?.status === outcome) {
        refreshBookingSurfaces();
        return ok(null);
      }
      return fail(RACED_MESSAGE);
    }

    // The outcome is recorded. Everything below is completion work on a
    // decision that has already committed, so a failure here must not tell the
    // agent the record did not happen: it did.
    //
    // booking_state_events is the trail, and it is the ONLY trail. It already
    // holds the actor, the note, both ends of the transition and the time, so
    // nothing here is copied back onto the booking row.
    await admin.from("booking_state_events").insert({
      booking_id: booking.id,
      from_status: "CONFIRMED",
      to_status: outcome,
      actor_id: gate.user.id,
      note: note && note.length > 0 ? note : null,
    });
  } catch {
    // createAdminClient throws without a service key. Nothing was written, and
    // the agent is told exactly that.
    return fail(SERVICE_DOWN_MESSAGE);
  }

  refreshBookingSurfaces();
  return ok(null);
}
