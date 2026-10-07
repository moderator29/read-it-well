"use server";

/**
 * ROOM BOOKINGS 1: a guest asks for a room at a hotel.
 *
 * The request is a PENDING booking written through the guest's own client,
 * naming only WHICH room, rate, nights and how many rooms. Everything else is
 * the database's: `private.price_room_booking` prices it from the host's own
 * rate plan and calendar (whatever the client sent), refuses a place that is
 * not live, the guest's own place, and the hold limits, and the booking's
 * trigger holds the nights in room_inventory, refusing to oversell. From
 * there it is a stay like any other: the host accepts at /host/bookings, the
 * stay agreement is drawn up and approved, and the guest pays at
 * /checkout/[bookingId], split by Paystack to the host.
 *
 * Off until `room_bookings` is switched on; the database refuses it too.
 *
 * D73: with `stays_instant_pay` on, the database accepts the booking when it
 * is written and approves its agreement as a fixed-price instant booking, so
 * the guest goes straight to paying. The answer says which happened.
 */

import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { lagosToday } from "../bookings/schema";
import { readInstantOutcome } from "../bookings/instant-pay";
import { ROOM_BOOKINGS_FLAG, STAYS_INSTANT_PAY_FLAG, flagIsOn } from "../flags/read";
import { ROOMS_OFF_MESSAGE, roomRefusalMessage } from "./room-refusals";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const requestSchema = z
  .object({
    stayId: z.string().uuid("This hotel could not be identified."),
    roomTypeId: z.string().uuid("This room could not be identified."),
    ratePlanId: z.string().uuid("This rate could not be identified."),
    checkIn: z.string().regex(ISO_DATE, "Choose a check-in date."),
    checkOut: z.string().regex(ISO_DATE, "Choose a check-out date."),
    guests: z.coerce.number().int().min(1, "At least one guest.").max(20, "Up to 20 guests."),
    rooms: z.coerce.number().int().min(1, "At least one room.").max(10, "Up to 10 rooms at a time."),
  })
  .superRefine((value, ctx) => {
    if (value.checkOut <= value.checkIn) {
      ctx.addIssue({ code: "custom", path: ["checkOut"], message: "Check-out has to be after check-in." });
    }
    if (value.checkIn < lagosToday()) {
      ctx.addIssue({ code: "custom", path: ["checkIn"], message: "Check-in has already passed." });
    }
  });

export type RoomRequestInput = z.input<typeof requestSchema>;

export type RoomRequestReceipt = {
  bookingId: string;
  /** True when the database booked it instantly: payment is open now. */
  instant: boolean;
  /** When an unpaid instant booking stops being held (ISO), else null. */
  payBy: string | null;
};

export async function requestRoomStay(input: RoomRequestInput): Promise<ActionResult<RoomRequestReceipt>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  if (!(await flagIsOn(ROOM_BOOKINGS_FLAG))) return fail(ROOMS_OFF_MESSAGE);

  const parsed = validate(requestSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const value = parsed.data;

  /* The generated types predate the room columns (and still say listing_id
     is required), so the row is named here; the database checks every part. */
  const row = {
    guest_id: session.user.id,
    accommodation_id: value.stayId,
    room_type_id: value.roomTypeId,
    rate_plan_id: value.ratePlanId,
    rooms: value.rooms,
    check_in: value.checkIn,
    check_out: value.checkOut,
    adults: value.guests,
    children: 0,
    status: "PENDING",
  };
  const { data, error } = await session.supabase
    .from("bookings")
    .insert(row as never)
    .select("id")
    .single();
  if (error || !data) return fail(roomRefusalMessage(error));
  const bookingId = (data as { id: string }).id;
  /* Only read back with the switch on: with it off nothing here changes. */
  const outcome = (await flagIsOn(STAYS_INSTANT_PAY_FLAG))
    ? await readInstantOutcome(session.supabase, bookingId)
    : { instant: false, payBy: null };
  return ok({ bookingId, ...outcome });
}
