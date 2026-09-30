"use server";

/**
 * THE WRITES BEHIND THE HOST'S RATE CALENDAR (C1, 30 September 2026).
 *
 * WHAT THESE WRITE, AND WHAT THEY NEVER DO. They write the host's INPUTS to
 * pricing: a night's own price or a closed night on `rate_calendar`, how many
 * rooms are on sale on `room_inventory`, and a rate plan's own nightly rate.
 * They price nothing. The database prices a stay when it is requested
 * (`private.price_room_booking`: `sum(coalesce(rc.rate_minor, rp.rate_minor))`
 * over the nights, a closed night refused), and a request already made keeps
 * the price it was made at, because the pricing trigger runs on the booking
 * row, not on the calendar. Nothing here touches a booking, a payment, a
 * split or a settlement.
 *
 * EVERY WRITE IS THE CALLER'S OWN CLIENT. `rate_calendar_write`,
 * `rate_plans_write` and `room_inventory_owner_write` all admit only
 * `private.my_room_type_ids()`, so the database decides whose rooms these
 * are. The ownership read before each write is the polite refusal, not the
 * security boundary. The service role appears nowhere in this file.
 *
 * WHAT THE DATABASE REFUSES AND THIS TURNS INTO WORDS: more rooms open than
 * the type holds (`private.room_inventory_within_total`) and fewer open than
 * already sold (`units_booked <= units_open`), both 23514.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { MAX_CALENDAR_NIGHTS, cleanSelection, isIsoDate, lagosToday } from "./rate-calendar";

const SERVICE_DOWN_MESSAGE = "We could not save that just now. Nothing changed, so try again in a moment.";
const NOT_YOURS_MESSAGE = "That room is not on your account. Open your calendar again to see the ones that are.";
const PAST_MESSAGE = "Pick nights from today onwards. A night that has gone cannot be priced or closed.";

const dates = z
  .array(z.string().refine(isIsoDate, "That is not a date."))
  .min(1, "Pick at least one night.")
  .max(MAX_CALENDAR_NIGHTS, `Pick up to ${MAX_CALENDAR_NIGHTS} nights at a time so nothing is lost part way.`);

/** Kobo, whole, at most ₦50m a night (a typo guard, not a policy). */
const minor = z
  .number()
  .int("Prices are in whole kobo.")
  .min(100, "A night costs at least ₦1.")
  .max(5_000_000_000, "That is more than ₦50,000,000 a night. Check the number.");

const priceSchema = z.object({
  roomTypeId: z.uuid("That room could not be identified."),
  ratePlanId: z.uuid("That rate could not be identified."),
  dates,
  /** Null puts the nights back on the plan's own rate. */
  rateMinor: minor.nullable(),
});

const closeSchema = z.object({
  roomTypeId: z.uuid("That room could not be identified."),
  dates,
  closed: z.boolean(),
});

const roomsSchema = z.object({
  roomTypeId: z.uuid("That room could not be identified."),
  dates,
  unitsOpen: z.number().int("Rooms come in whole numbers.").min(0).max(500),
});

const planSchema = z
  .object({
    ratePlanId: z.uuid("That rate could not be identified."),
    rateMinor: minor,
    minStayNights: z.number().int().min(1, "At least one night.").max(90, "At most 90 nights."),
    maxStayNights: z.number().int().min(1).max(365).nullable(),
  })
  .refine((v) => v.maxStayNights === null || v.maxStayNights >= v.minStayNights, {
    message: "The longest stay cannot be shorter than the shortest.",
    path: ["maxStayNights"],
  });

type Owned = { ok: true; planIds: string[]; unitsTotal: number } | { ok: false; result: ActionResult<never> };

async function session() {
  const s = await resolveSession();
  if (s.state === "unconfigured") return { ok: false as const, result: fail<never>(NOT_CONFIGURED_MESSAGE) };
  if (s.state === "signed-out") return { ok: false as const, result: fail<never>(SIGNED_OUT_MESSAGE) };
  return { ok: true as const, s };
}

/** The caller's own room type, its rate plans and its size. */
async function ownedRoom(roomTypeId: string): Promise<Owned> {
  const got = await session();
  if (!got.ok) return got;
  const { data, error } = await got.s.supabase
    .from("room_types")
    .select("id, units_total, rate_plans(id), accommodations!inner(businesses!inner(owner_id))")
    .eq("id", roomTypeId)
    .eq("accommodations.businesses.owner_id", got.s.user.id)
    .maybeSingle();
  if (error) return { ok: false, result: fail(SERVICE_DOWN_MESSAGE) };
  if (!data) return { ok: false, result: fail(NOT_YOURS_MESSAGE) };
  const plans = ((data as unknown as { rate_plans: { id: string }[] | null }).rate_plans ?? []).map((p) => p.id);
  return { ok: true, planIds: plans, unitsTotal: data.units_total };
}

function refresh(): void {
  revalidatePath("/host/calendar");
  revalidatePath("/host/rooms");
  revalidatePath("/stays");
}

function futureOnly(list: string[]): string[] | null {
  const clean = cleanSelection(list, lagosToday());
  return clean.length === list.length ? clean : null;
}

/**
 * Set a price for some nights on one rate plan, or put them back on the
 * plan's own rate (`rateMinor: null`).
 *
 * An upsert that names only `rate_minor`, so a night the host closed stays
 * closed: PostgREST's upsert updates only the columns it is sent.
 */
export async function setNightPrice(input: unknown): Promise<ActionResult<{ nights: number }>> {
  const parsed = validate(priceSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { roomTypeId, ratePlanId, rateMinor } = parsed.data;
  const nights = futureOnly(parsed.data.dates);
  if (!nights) return fail(PAST_MESSAGE);

  const owned = await ownedRoom(roomTypeId);
  if (!owned.ok) return owned.result;
  if (!owned.planIds.includes(ratePlanId)) return fail(NOT_YOURS_MESSAGE);

  const got = await session();
  if (!got.ok) return got.result;
  const db = got.s.supabase;

  const { error } =
    rateMinor === null
      ? await db.from("rate_calendar").update({ rate_minor: null }).eq("rate_plan_id", ratePlanId).in("date", nights)
      : await db
          .from("rate_calendar")
          .upsert(
            nights.map((date) => ({ rate_plan_id: ratePlanId, date, rate_minor: rateMinor })),
            { onConflict: "rate_plan_id,date" },
          );
  if (error) return fail(error.code === "42501" ? NOT_YOURS_MESSAGE : SERVICE_DOWN_MESSAGE);

  refresh();
  return ok({ nights: nights.length });
}

/**
 * Close or reopen nights for a whole room type: every rate plan it has, so a
 * guest cannot reach a closed night through a second plan.
 *
 * Closing is `rate_calendar.closed`, not zero rooms, and that is deliberate:
 * the database refuses fewer rooms open than are already booked, so a night
 * with one room held could never be closed by zeroing it. A closed rate stops
 * new requests (`booking_dates_blocked`) and leaves the ones already made
 * exactly as they were.
 */
export async function setNightsClosed(input: unknown): Promise<ActionResult<{ nights: number }>> {
  const parsed = validate(closeSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { roomTypeId, closed } = parsed.data;
  const nights = futureOnly(parsed.data.dates);
  if (!nights) return fail(PAST_MESSAGE);

  const owned = await ownedRoom(roomTypeId);
  if (!owned.ok) return owned.result;
  if (owned.planIds.length === 0) {
    return fail("This room has no rate yet, so there is nothing to close. Add a rate in your application first.");
  }

  const got = await session();
  if (!got.ok) return got.result;
  const db = got.s.supabase;
  const { error } = closed
    ? await db.from("rate_calendar").upsert(
        owned.planIds.flatMap((id) => nights.map((date) => ({ rate_plan_id: id, date, closed: true }))),
        { onConflict: "rate_plan_id,date" },
      )
    : await db.from("rate_calendar").update({ closed: false }).in("rate_plan_id", owned.planIds).in("date", nights);
  if (error) return fail(error.code === "42501" ? NOT_YOURS_MESSAGE : SERVICE_DOWN_MESSAGE);

  refresh();
  return ok({ nights: nights.length });
}

/** How many rooms of this type are on sale across some nights. */
export async function setNightsRooms(input: unknown): Promise<ActionResult<{ nights: number; heldBack: number }>> {
  const parsed = validate(roomsSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { roomTypeId, unitsOpen } = parsed.data;
  const nights = futureOnly(parsed.data.dates);
  if (!nights) return fail(PAST_MESSAGE);

  const owned = await ownedRoom(roomTypeId);
  if (!owned.ok) return owned.result;
  if (unitsOpen > owned.unitsTotal) {
    return fail(`You told us there are ${owned.unitsTotal} of these, so ${unitsOpen} cannot be on sale.`, {
      unitsOpen: `At most ${owned.unitsTotal}.`,
    });
  }

  const got = await session();
  if (!got.ok) return got.result;
  const { error } = await got.s.supabase.from("room_inventory").upsert(
    nights.map((date) => ({ room_type_id: roomTypeId, date, units_open: unitsOpen })),
    { onConflict: "room_type_id,date" },
  );
  if (error) {
    if (error.code === "42501") return fail(NOT_YOURS_MESSAGE);
    if (error.code === "23514") {
      if (/cannot be offered/i.test(error.message ?? "")) {
        return fail("That is more rooms than this type has. Change the room type first.");
      }
      return fail(
        "One of those nights already has more rooms booked than you are leaving open. Leave at least as many open as are booked.",
        { unitsOpen: "Fewer than are already booked." },
      );
    }
    return fail(SERVICE_DOWN_MESSAGE);
  }

  /* C2b: rooms another site holds stay off sale whatever is asked; the
     database clamps the write and says how many it held back. Read it so the
     host is told, rather than shown a number that did not land. A database
     without the column (before the C2b migration) holds nothing back. */
  const { data: heldRows } = await (got.s.supabase as unknown as {
    from: (t: string) => { select: (c: string) => { eq: (c: string, v: string) => { in: (c: string, v: string[]) => PromiseLike<{ data: unknown }> } } };
  })
    .from("room_inventory")
    .select("date, units_held_back")
    .eq("room_type_id", roomTypeId)
    .in("date", nights);
  const heldBack = Array.isArray(heldRows)
    ? (heldRows as { units_held_back?: number }[]).filter((r) => (r.units_held_back ?? 0) > 0).length
    : 0;

  refresh();
  return ok({ nights: nights.length, heldBack });
}

/**
 * Edit a rate plan's own nightly rate and its stay lengths, including on a
 * room already on the shelf.
 *
 * WHAT CHANGES AND WHAT DOES NOT. New requests are priced from the new rate
 * (and from any night's own price, which still wins). A request already made
 * keeps the total it was made at: the pricing trigger fires on the booking's
 * own columns, not on this row. The shelf's "from" price follows through
 * `catalogue_on_rate_plan`.
 */
export async function updateRatePlan(input: unknown): Promise<ActionResult<null>> {
  const parsed = validate(planSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { ratePlanId, rateMinor, minStayNights, maxStayNights } = parsed.data;

  const got = await session();
  if (!got.ok) return got.result;
  const { data, error } = await got.s.supabase
    .from("rate_plans")
    .update({ rate_minor: rateMinor, min_stay_nights: minStayNights, max_stay_nights: maxStayNights })
    .eq("id", ratePlanId)
    .select("id")
    .maybeSingle();
  if (error) return fail(error.code === "42501" ? NOT_YOURS_MESSAGE : SERVICE_DOWN_MESSAGE);
  if (!data) return fail(NOT_YOURS_MESSAGE);

  refresh();
  revalidatePath("/host");
  return ok(null);
}
