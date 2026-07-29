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
 */

import { revalidatePath } from "next/cache";
import { fail, formDataToObject, ok, validate, type ActionResult } from "../actions/envelope";
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

  if (UUID_RE.test(input.listingId)) {
    const { data: row, error } = await session.supabase
      .from("listings")
      .select("id, price_per_night_minor, cleaning_fee_minor, service_fee_minor, price_period")
      .eq("id", input.listingId)
      .maybeSingle();
    if (error) return fail(GENERIC_RESERVE_MESSAGE);
    if (row) {
      if (row.price_period === "year") return fail(RENTAL_MESSAGE);
      priceMinor = row.price_per_night_minor;
      cleaningMinor = row.cleaning_fee_minor;
      serviceMinor = row.service_fee_minor;
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

  revalidatePath("/bookings");

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
    await admin
      .from("availability")
      .delete()
      .eq("listing_id", booking.listing_id)
      .eq("status", "booked")
      .gte("date", booking.check_in)
      .lt("date", booking.check_out);
  } catch {
    return fail(SERVICE_DOWN_MESSAGE);
  }

  revalidatePath("/bookings");
  return ok(null);
}

/** Every calendar date in [checkIn, checkOut), ISO strings. */
function nightsOf(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  let cursor = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  while (cursor < end) {
    out.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += 86_400_000;
  }
  return out;
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
      .select("id, listing_id, status, check_in, check_out")
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
        .select("agent_id, agents!inner(user_id)")
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

    const rows = nightsOf(booking.check_in, booking.check_out).map((date) => ({
      listing_id: booking.listing_id,
      date,
      status: "booked" as const,
    }));
    if (rows.length > 0) {
      await admin.from("availability").upsert(rows, { onConflict: "listing_id,date" });
    }
  } catch {
    return fail("Confirming is temporarily unavailable. Please try again shortly.");
  }

  revalidatePath("/bookings");
  return ok(null);
}
