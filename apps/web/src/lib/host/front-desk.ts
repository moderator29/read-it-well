/**
 * THE FRONT DESK, GROUPED (HOTEL-01, track/hospitality-workspace).
 *
 * Who is arriving, who is in the house and who is leaving, on the Lagos
 * clock. Pure and client-safe: it takes the stays the host's reads returned
 * and the check-in and check-out marks the front desk has written
 * (`stay_events`), and cuts them into three lists.
 *
 * A stay is only listed when it is CONFIRMED or COMPLETED. A request still
 * waiting, a declined or cancelled stay and a no-show are not on the desk.
 *
 * THE THREE LISTS DO NOT OVERLAP, whatever the marks say.
 *
 *   arriving   not checked in, and the stay is on: arrival day up to the
 *              night before departure. A guest whose arrival day has passed
 *              without a mark is still listed, flagged `late`, until the
 *              departure day, when there is no stay left to start.
 *   inHouse    checked in, not checked out, departing after today
 *   leaving    checked in, not checked out, departing today. A guest still
 *              in after their departure day is listed here too, `late`.
 *
 * A guest checked out is done and listed nowhere.
 *
 * WHEN THE MARKS CANNOT BE READ (`events` is null: the table is not on the
 * database yet, or the read failed) the lists are cut from the dates alone
 * and `marksKnown` is false, so the screen can say so and offer no button
 * that would pretend to work. Arriving is the arrival day, in house is a
 * night in the middle of the stay, leaving is the departure day.
 */

export type StayRow = {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  /** The guest's display name; null when it could not be read. */
  guestName: string | null;
  hotel: string;
  room: string;
  /** True once a payment settled; null when that could not be read. */
  paid: boolean | null;
};

export type StayMarks = { checkedInAt: string | null; checkedOutAt: string | null };
export type StayEvents = ReadonlyMap<string, StayMarks>;

export type DeskStay = StayRow & {
  checkedInAt: string | null;
  checkedOutAt: string | null;
  /** An arrival whose day has passed, or a departure still in the house after theirs. */
  late: boolean;
};

export type FrontDesk = {
  today: string;
  marksKnown: boolean;
  arriving: DeskStay[];
  inHouse: DeskStay[];
  leaving: DeskStay[];
  figures: {
    /** Stays arriving today, marked or not. */
    arrivalsToday: number;
    /** Of those, still to check in. */
    arrivalsToCheckIn: number;
    /** Guests in the building: in house and leaving. From the dates alone, only those staying tonight. */
    inHouse: number;
    /** Departures today, marked or not. */
    departuresToday: number;
    /** Of those, still to check out. */
    departuresToCheckOut: number;
  };
};

const ON_DESK = new Set(["CONFIRMED", "COMPLETED"]);

function byDayThenName(day: "checkIn" | "checkOut") {
  return (a: DeskStay, b: DeskStay) =>
    a[day].localeCompare(b[day]) || (a.guestName ?? "").localeCompare(b.guestName ?? "") || a.id.localeCompare(b.id);
}

export function buildFrontDesk(input: { today: string; stays: readonly StayRow[]; events: StayEvents | null }): FrontDesk {
  const { today, events } = input;
  const marksKnown = events !== null;
  const arriving: DeskStay[] = [];
  const inHouse: DeskStay[] = [];
  const leaving: DeskStay[] = [];
  let arrivalsToday = 0;
  let arrivalsToCheckIn = 0;
  let departuresToday = 0;
  let departuresToCheckOut = 0;

  for (const stay of input.stays) {
    if (!ON_DESK.has(stay.status)) continue;
    const marks = events?.get(stay.id);
    const checkedInAt = marks?.checkedInAt ?? null;
    const checkedOutAt = marks?.checkedOutAt ?? null;
    const row: DeskStay = { ...stay, checkedInAt, checkedOutAt, late: false };

    if (stay.checkIn === today) {
      arrivalsToday += 1;
      if (!checkedInAt) arrivalsToCheckIn += 1;
    }
    if (stay.checkOut === today) {
      departuresToday += 1;
      if (!checkedOutAt) departuresToCheckOut += 1;
    }

    if (checkedOutAt) continue;

    if (!marksKnown) {
      if (stay.checkIn === today) arriving.push(row);
      else if (stay.checkOut === today) leaving.push(row);
      else if (stay.checkIn < today && today < stay.checkOut) inHouse.push(row);
      continue;
    }

    if (checkedInAt) {
      if (stay.checkOut <= today) leaving.push({ ...row, late: stay.checkOut < today });
      else inHouse.push(row);
    } else if (stay.checkIn <= today && today < stay.checkOut) {
      arriving.push({ ...row, late: stay.checkIn < today });
    }
  }

  arriving.sort(byDayThenName("checkIn"));
  inHouse.sort(byDayThenName("checkOut"));
  leaving.sort(byDayThenName("checkOut"));

  return {
    today,
    marksKnown,
    arriving,
    inHouse,
    leaving,
    figures: {
      arrivalsToday,
      arrivalsToCheckIn,
      inHouse: marksKnown ? inHouse.length + leaving.length : inHouse.length,
      departuresToday,
      departuresToCheckOut,
    },
  };
}

/* ------------------------------------------------------------------ the RPC */

export type StayEventKind = "checked_in" | "checked_out";

/** Why a mark did not land, as a word the screen has copy for. */
export type StayEventRefusal =
  | "not_available"
  | "not_yours"
  | "sign_in"
  | "not_confirmed"
  | "outside_dates"
  | "check_in_first"
  | "failed";

export type StayEventResult = { ok: true; at: string } | { ok: false; reason: StayEventRefusal };

type RpcError = { code?: string | null; message?: string | null } | null;

/** The one corner of the client this file needs, so a test can stand in for it. */
export type StayEventClient = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: RpcError }>;
};

/**
 * What the database said, as a refusal. `record_stay_event` raises plain
 * English with a class code (42501 not yours or signed out, 22023 a rule), and
 * a database that has not had the migration yet answers with an undefined
 * function (Postgres 42883, PostgREST PGRST202), which is "not available yet",
 * never a failure and never a success.
 */
export function refusalFor(error: NonNullable<RpcError>): StayEventRefusal {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  if (code === "42883" || code === "PGRST202" || code === "42P01" || code === "PGRST205") return "not_available";
  if (code === "42501") return message.includes("sign in") ? "sign_in" : "not_yours";
  if (code === "22023") {
    if (message.includes("check the guest in first")) return "check_in_first";
    if (message.includes("only a confirmed stay")) return "not_confirmed";
    if (message.includes("arrival day")) return "outside_dates";
  }
  return "failed";
}

/**
 * `record_stay_event(p_booking, p_kind)` through a small local wrapper (the
 * generated database types do not carry it until the migration is applied).
 * It returns the instant of the mark: a second tap returns the FIRST time, and
 * that is a success, not an error.
 */
export async function callRecordStayEvent(
  db: StayEventClient,
  bookingId: string,
  kind: StayEventKind,
): Promise<StayEventResult> {
  const { data, error } = await db.rpc("record_stay_event", { p_booking: bookingId, p_kind: kind });
  if (error) return { ok: false, reason: refusalFor(error) };
  if (typeof data !== "string" || Number.isNaN(Date.parse(data))) return { ok: false, reason: "failed" };
  return { ok: true, at: data };
}
