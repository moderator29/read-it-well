"use server";

/**
 * The bookings loop: reserve, cancel, confirm.
 *
 * Reserve inserts under the guest's own RLS-bound client, so the database is
 * the authority on identity and on double booking: the GiST exclusion
 * constraint on overlapping PENDING and CONFIRMED stays raises SQLSTATE 23P01,
 * which is translated into one friendly sentence and never surfaced raw.
 * Cancel proves ownership through an RLS read first, then performs the state
 * transition through the service role, because guests hold no UPDATE grant on
 * bookings by design. Confirm is the service path a host or admin surface will
 * call; it carries its own authorisation check because every export of this
 * file is a callable endpoint. Notification fan-out happens in database
 * triggers on insert and status change: nothing here writes notifications.
 *
 * All money is integer kobo. Price snapshots come from the listing row at the
 * moment of booking, never from the client.
 *
 * Email is layered on top of that, never inside it. Every send happens after
 * the database write has committed, runs through bestEffortEmail (which does
 * nothing at all without RESEND_API_KEY and swallows every failure), and can
 * therefore never turn a saved booking into an error the guest sees.
 */

import { revalidatePath } from "next/cache";
import { fail, formDataToObject, ok, validate, type ActionResult } from "../actions/envelope";
import { bestEffortEmail, sendEmail } from "../email/client";
import {
  bookingCancelled,
  bookingConfirmed,
  bookingRequested,
  bookingRequestedHost,
} from "../email/messages";
import {
  adminOrNull,
  contactForAgent,
  contactForUser,
  contactFromSession,
} from "../email/recipients";
import {
  NOT_CONFIGURED_MESSAGE,
  SIGNED_OUT_MESSAGE,
  resolveSession,
} from "../actions/session";
import { isFeatureEnabled } from "../flags";
import { getListingRepository } from "../listings/repository";
import { createAdminClient } from "../supabase/admin";
import {
  cancelInputSchema,
  lagosToday,
  nightsBetween,
  reserveInputSchema,
} from "./schema";
import { releaseBookedNights, writeBookedNights } from "./settlement";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PAUSED_MESSAGE = "Bookings are paused for maintenance. Please try again in a little while.";

const DATES_TAKEN_MESSAGE = "Those dates were just taken. Pick different dates.";

const SEED_LISTING_MESSAGE =
  "This stay opens for booking as soon as live inventory lands. Save it and check back soon.";

const RENTAL_MESSAGE =
  "This home is rented per year, not per night. Message the agent to arrange an inspection.";

const UNKNOWN_LISTING_MESSAGE =
  "We could not find this listing. It may no longer be available. Explore other stays from search.";

const GENERIC_RESERVE_MESSAGE =
  "We could not place this booking just now. Nothing was charged. Please try again.";

const SERVICE_DOWN_MESSAGE =
  "Cancelling is temporarily unavailable. Your booking is unchanged. Please try again shortly.";

/** What a successful reserve hands back for the confirmation moment. */
export type ReserveReceipt = {
  bookingId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  subtotalMinor: number;
  cleaningMinor: number;
  totalMinor: number;
};

export async function reserve(
  _prev: ActionResult<ReserveReceipt> | null,
  formData: FormData,
): Promise<ActionResult<ReserveReceipt>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  if (!(await isFeatureEnabled("bookings"))) return fail(PAUSED_MESSAGE);

  const parsed = validate(reserveInputSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const input = parsed.data;

  // ------------------------------------------------- resolve the listing
  // A bookable listing lives in public.listings and carries its own price
  // snapshot columns in kobo. Seed catalogue entries render the page but
  // cannot be written to bookings (the FK points at real listings), so they
  // get an honest refusal rather than a fake booking.
  let priceMinor: number | null = null;
  let cleaningMinor = 0;
  let serviceMinor = 0;
  // Read for the emails sent once the booking has saved, nothing else.
  let listingTitle = "your stay";
  let listingAgentId: string | null = null;

  if (UUID_RE.test(input.listingId)) {
    const { data: row, error } = await session.supabase
      .from("listings")
      .select(
        "id, title, agent_id, price_per_night_minor, cleaning_fee_minor, service_fee_minor, price_period",
      )
      .eq("id", input.listingId)
      .maybeSingle();
    if (error) return fail(GENERIC_RESERVE_MESSAGE);
    if (row) {
      if (row.price_period === "year") return fail(RENTAL_MESSAGE);
      priceMinor = row.price_per_night_minor;
      cleaningMinor = row.cleaning_fee_minor;
      serviceMinor = row.service_fee_minor;
      listingTitle = row.title;
      listingAgentId = row.agent_id;
    }
  }

  if (priceMinor === null) {
    const seed = await getListingRepository().byId(input.listingId);
    if (!seed) return fail(UNKNOWN_LISTING_MESSAGE);
    if (seed.kind === "rental") return fail(RENTAL_MESSAGE);
    return fail(SEED_LISTING_MESSAGE);
  }

  // ------------------------------------------------------ integer money
  const nights = nightsBetween(input.checkIn, input.checkOut);
  const subtotalMinor = priceMinor * nights;
  const totalMinor = subtotalMinor + cleaningMinor + serviceMinor;

  // ------------------------------------------------- insert under RLS
  const { data: created, error: insertError } = await session.supabase
    .from("bookings")
    .insert({
      listing_id: input.listingId,
      guest_id: session.user.id,
      check_in: input.checkIn,
      check_out: input.checkOut,
      nights,
      adults: input.adults,
      children: input.children,
      price_per_night_minor: priceMinor,
      cleaning_fee_minor: cleaningMinor,
      service_fee_minor: serviceMinor,
      subtotal_minor: subtotalMinor,
      total_minor: totalMinor,
      status: "PENDING",
    })
    .select("id")
    .single();

  if (insertError || !created) {
    if (insertError?.code === "23P01") return fail(DATES_TAKEN_MESSAGE);
    if (insertError?.code === "23503") return fail(UNKNOWN_LISTING_MESSAGE);
    if (insertError?.code === "23514") {
      return fail("Those dates do not work for this stay. Check them and try again.");
    }
    return fail(GENERIC_RESERVE_MESSAGE);
  }

  // ------------------------------------------------- hold the calendar
  // A PENDING booking is already a real hold: the GiST exclusion constraint
  // refuses a second overlapping stay. The calendar has to say so straight
  // away, or a second guest sees the nights open, fills in the whole form and
  // only then meets the database refusal. Written through the service role
  // because guests hold no write grant on availability, and best effort
  // because the constraint, not this write, is what actually prevents the
  // double booking: a lost calendar row is a cosmetic gap, not an oversell.
  try {
    await writeBookedNights(
      createAdminClient(),
      input.listingId,
      input.checkIn,
      input.checkOut,
    );
  } catch {
    // The hold stands on the database constraint regardless.
  }

  revalidatePath("/bookings");
  revalidatePath(`/listing/${input.listingId}`);

  // ------------------------------------------------------------- email
  // The booking exists. Both sends are best effort from here: the guest gets
  // their request back in writing, the host gets something to act on.
  await bestEffortEmail(async () => {
    const guest = contactFromSession(session.user);
    const stay = {
      listingTitle,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      nights,
      adults: input.adults,
      children: input.children,
      totalMinor,
    };

    const jobs: Promise<unknown>[] = [];

    if (guest) {
      const message = bookingRequested({ guestName: guest.name, ...stay });
      jobs.push(sendEmail({ to: guest.email, subject: message.subject, html: message.html }));
    }

    // The host's address needs the service role. Without it, their email is
    // skipped quietly and the guest's still goes.
    const admin = adminOrNull();
    if (admin && listingAgentId) {
      const host = await contactForAgent(admin, listingAgentId);
      if (host) {
        const message = bookingRequestedHost({
          agentName: host.name,
          guestName: guest?.name ?? null,
          ...stay,
        });
        jobs.push(sendEmail({ to: host.email, subject: message.subject, html: message.html }));
      }
    }

    await Promise.allSettled(jobs);
  });

  return ok({
    bookingId: created.id,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights,
    adults: input.adults,
    children: input.children,
    subtotalMinor,
    cleaningMinor,
    totalMinor,
  });
}

export async function cancel(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  if (!(await isFeatureEnabled("bookings"))) return fail(PAUSED_MESSAGE);

  const parsed = validate(cancelInputSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  // Ownership is proven by reading through the guest's own RLS client: a
  // booking that is not theirs simply does not come back.
  const { data: booking, error: readError } = await session.supabase
    .from("bookings")
    .select("id, listing_id, status, check_in, check_out")
    .eq("id", parsed.data.bookingId)
    .maybeSingle();

  if (readError) return fail(SERVICE_DOWN_MESSAGE);
  if (!booking) return fail("We could not find that booking on your account.");
  if (booking.status === "CANCELLED") return fail("This booking is already cancelled.");
  if (booking.check_in <= lagosToday()) {
    return fail("This stay has already started, so it cannot be cancelled here. Contact support and we will sort it out.");
  }

  // A stay that has been paid for cannot be cancelled by this path, because
  // there is no refund path behind it yet (MASTER_TODO P5-5). Cancelling here
  // would release the dates and quietly keep the guest's money, which is the
  // one outcome this platform must never produce. Read through the guest's own
  // client, so it can only ever see their own payments.
  const { data: settled } = await session.supabase
    .from("transactions")
    .select("id")
    .eq("booking_id", booking.id)
    .eq("status", "SUCCESSFUL")
    .limit(1);
  if ((settled?.length ?? 0) > 0) {
    return fail(
      "This stay has already been paid for, so it cannot be cancelled here. Contact support and we will sort out your money with you.",
    );
  }

  // The transition itself is service-role work: guests hold no UPDATE grant.
  try {
    const admin = createAdminClient();

    const { error: updateError } = await admin
      .from("bookings")
      .update({ status: "CANCELLED" })
      .eq("id", booking.id)
      .in("status", ["PENDING", "CONFIRMED"]);
    if (updateError) return fail(SERVICE_DOWN_MESSAGE);

    // History and calendar cleanup are best effort once the transition has
    // committed: the booking is genuinely cancelled either way, and the
    // notification trigger has already fired on the status change.
    await admin.from("booking_state_events").insert({
      booking_id: booking.id,
      from_status: booking.status,
      to_status: "CANCELLED",
      actor_id: session.user.id,
    });
    await releaseBookedNights(
      admin,
      booking.listing_id,
      booking.check_in,
      booking.check_out,
    );
  } catch {
    return fail(SERVICE_DOWN_MESSAGE);
  }

  // The cancellation has committed. Telling the guest is best effort.
  await bestEffortEmail(async () => {
    const guest = contactFromSession(session.user);
    if (!guest) return;
    const message = bookingCancelled({
      guestName: guest.name,
      listingTitle: await listingTitleFor(booking.listing_id),
      checkIn: booking.check_in,
      checkOut: booking.check_out,
    });
    await sendEmail({ to: guest.email, subject: message.subject, html: message.html });
  });

  revalidatePath("/bookings");
  return ok(null);
}

/**
 * A listing's title for email copy, with a neutral fallback. Read through the
 * service role because the caller may no longer be able to see the row, and
 * never allowed to fail: an email with a plain "your stay" in it is far better
 * than no email.
 */
async function listingTitleFor(listingId: string): Promise<string> {
  const admin = adminOrNull();
  if (!admin) return "your stay";
  try {
    const { data } = await admin
      .from("listings")
      .select("title")
      .eq("id", listingId)
      .maybeSingle();
    const title = (data?.title ?? "").trim();
    return title.length > 0 ? title : "your stay";
  } catch {
    return "your stay";
  }
}

/**
 * Confirm a pending booking: the service path the host and admin surfaces
 * will call. Exported server actions are public endpoints, so this one
 * authorises hard before touching anything: the caller must be signed in and
 * be either the listing's agent or a platform admin. On success the stay's
 * nights are written to availability as booked, and the notification trigger
 * on the status change tells the guest.
 */
export async function confirm(bookingId: string): Promise<ActionResult<null>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  if (!(await isFeatureEnabled("bookings"))) return fail(PAUSED_MESSAGE);

  const parsed = validate(cancelInputSchema, { bookingId });
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  try {
    const admin = createAdminClient();

    const { data: booking, error: readError } = await admin
      .from("bookings")
      .select("id, listing_id, guest_id, status, check_in, check_out, nights, total_minor")
      .eq("id", parsed.data.bookingId)
      .maybeSingle();
    if (readError) return fail("Confirming is temporarily unavailable. Please try again shortly.");
    if (!booking) return fail("That booking no longer exists.");

    // ------------------------------------------------- authorisation
    // listings.agent_id points at public.agents, whose user_id is the auth
    // user, so the ownership check walks that join.
    const [{ data: listing }, { data: roles }] = await Promise.all([
      admin
        .from("listings")
        .select("agent_id, title, agents!inner(user_id)")
        .eq("id", booking.listing_id)
        .maybeSingle(),
      admin
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["admin", "super_admin"]),
    ]);
    const isAgent = listing?.agents?.user_id === session.user.id;
    const isAdmin = (roles?.length ?? 0) > 0;
    if (!isAgent && !isAdmin) {
      return fail("Only the listing's agent or an administrator can confirm a booking.");
    }

    if (booking.status === "CONFIRMED") return ok(null);
    if (booking.status !== "PENDING") {
      return fail("This booking was cancelled, so it cannot be confirmed.");
    }

    const { error: updateError } = await admin
      .from("bookings")
      .update({ status: "CONFIRMED" })
      .eq("id", booking.id)
      .eq("status", "PENDING");
    if (updateError) return fail("Confirming is temporarily unavailable. Please try again shortly.");

    await admin.from("booking_state_events").insert({
      booking_id: booking.id,
      from_status: "PENDING",
      to_status: "CONFIRMED",
      actor_id: session.user.id,
    });

    // The nights were already closed at reserve; this is the same upsert over
    // rows that already say the same thing, so it is safe either way.
    await writeBookedNights(admin, booking.listing_id, booking.check_in, booking.check_out);

    // The booking is CONFIRMED in the database. Telling the guest is best
    // effort: the confirmation stands whether or not the email leaves.
    await bestEffortEmail(async () => {
      const guest = await contactForUser(admin, booking.guest_id);
      if (!guest) return;
      const title = (listing?.title ?? "").trim();
      const message = bookingConfirmed({
        guestName: guest.name,
        listingTitle: title.length > 0 ? title : "your stay",
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        nights: booking.nights,
        totalMinor: booking.total_minor,
      });
      await sendEmail({ to: guest.email, subject: message.subject, html: message.html });
    });
  } catch {
    return fail("Confirming is temporarily unavailable. Please try again shortly.");
  }

  revalidatePath("/bookings");
  return ok(null);
}
