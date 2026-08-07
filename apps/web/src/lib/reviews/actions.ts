"use server";

/**
 * Writing a review.
 *
 * The insert goes through the guest's OWN RLS-bound client. That is the whole
 * design: reviews_insert_own decides that the booking is theirs, that it is
 * CONFIRMED, that it has actually checked out, and that the review is being
 * attached to the listing the booking was for. The unique booking_id decides
 * that a stay is reviewed once. Neither rule is restated here, because a rule
 * enforced in two places drifts in one of them. The service role is never used:
 * a review written as the service role would bypass every one of those checks.
 *
 * The reasons read back before the insert exist to give an honest sentence
 * rather than a bare refusal. They are an explanation of the database's answer,
 * never a substitute for it.
 *
 * The host's notification and the safety classification of the review body are
 * both database triggers (reviews_notify_after_insert, reviews_scan_after_insert),
 * so nothing here writes a notification or a risk alert.
 */

import { revalidatePath } from "next/cache";
import { fail, formDataToObject, ok, validate, type ActionResult } from "../actions/envelope";
import {
  NOT_CONFIGURED_MESSAGE,
  resolveSession,
  SIGNED_OUT_MESSAGE,
} from "../actions/session";
import { lagosToday } from "../bookings/schema";
import { isFeatureEnabled } from "../flags";
import { reviewInputSchema } from "./schema";

/* Reviews belong to the bookings loop, so they pause with it rather than
   carrying a second switch that an incident responder would have to remember. */
const PAUSED_MESSAGE =
  "Reviews are paused for maintenance. Please try again in a little while.";

const SERVICE_DOWN_MESSAGE =
  "We could not save your review just then. Nothing was lost, please try again in a moment.";

export type ReviewWritten = { listingId: string };

export async function submitReview(
  _prev: ActionResult<ReviewWritten> | null,
  formData: FormData,
): Promise<ActionResult<ReviewWritten>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  if (!(await isFeatureEnabled("bookings"))) return fail(PAUSED_MESSAGE);

  const parsed = validate(reviewInputSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  // The listing the review attaches to comes from the booking row, never from
  // the client, so a crafted form cannot point a review at another property.
  const { data: booking, error: readError } = await session.supabase
    .from("bookings")
    .select("id, listing_id, status, check_out")
    .eq("id", parsed.data.bookingId)
    .maybeSingle();

  if (readError) return fail(SERVICE_DOWN_MESSAGE);
  if (!booking) {
    return fail(
      "We could not find that stay on your account. Open it again from Bookings, and check you are signed in with the account that booked it.",
    );
  }

  if (booking.status === "CANCELLED") {
    return fail("This stay was cancelled, so there is nothing to review.");
  }
  if (booking.status !== "CONFIRMED") {
    return fail(
      "This stay is still awaiting the host, so it cannot be reviewed yet. You can write one once the host has accepted and the stay has finished.",
    );
  }
  if (booking.check_out > lagosToday()) {
    return fail("You can share a review once the stay has finished. Enjoy the rest of it.");
  }

  const body = parsed.data.body && parsed.data.body.length > 0 ? parsed.data.body : null;

  const { error: insertError } = await session.supabase.from("reviews").insert({
    listing_id: booking.listing_id,
    booking_id: booking.id,
    author_id: session.user.id,
    rating: parsed.data.rating,
    body,
  });

  if (insertError) {
    // 23505 is the unique booking_id: the stay is already reviewed.
    if (insertError.code === "23505") {
      return fail("You have already reviewed this stay. Thank you for that.");
    }
    // 42501 is the row level security refusal, which at this point means the
    // stay genuinely is not reviewable by this account.
    if (insertError.code === "42501") {
      return fail(
        "This stay cannot be reviewed from this account. Sign in with the account that booked the stay and try again.",
      );
    }
    return fail(SERVICE_DOWN_MESSAGE);
  }

  // The listing's rating aggregate and its written reviews both change, and so
  // does the trips hub's per stay control.
  revalidatePath(`/listing/${booking.listing_id}`);
  revalidatePath("/bookings");

  return ok({ listingId: booking.listing_id });
}
