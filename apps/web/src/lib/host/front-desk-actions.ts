"use server";

/**
 * HOTEL-01: the front desk marks a guest checked in or checked out.
 *
 * One call to `record_stay_event` under the HOST'S OWN session. The database
 * decides everything that matters (that this person hosts the booking, that
 * the stay is confirmed, that check-in is within the stay's days and check-out
 * follows check-in) and is idempotent: a second tap returns the first time.
 * Nothing here uses the service role, so there is no second copy of the rules
 * to drift, and nothing here moves money.
 *
 * Until the migration is applied the function does not exist; the answer is
 * `not_available`, which the screen shows as a calm "not available yet". It
 * is never turned into a success.
 */

import { revalidatePath } from "next/cache";
import { resolveSession } from "../actions/session";
import { callRecordStayEvent, type StayEventClient, type StayEventKind, type StayEventResult } from "./front-desk";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function markStay(input: { bookingId: string; kind: StayEventKind }): Promise<StayEventResult> {
  if (!input || typeof input.bookingId !== "string" || !UUID.test(input.bookingId)) return { ok: false, reason: "failed" };
  if (input.kind !== "checked_in" && input.kind !== "checked_out") return { ok: false, reason: "failed" };

  const session = await resolveSession();
  if (session.state !== "signed-in") return { ok: false, reason: "sign_in" };

  const result = await callRecordStayEvent(session.supabase as unknown as StayEventClient, input.bookingId, input.kind);
  if (result.ok) {
    revalidatePath("/host/bookings");
    revalidatePath("/host");
  }
  return result;
}
