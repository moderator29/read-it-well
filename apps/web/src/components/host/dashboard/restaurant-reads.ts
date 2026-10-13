import "server-only";

import { resolveSession } from "@/lib/actions/session";
import { reportReadError } from "@/lib/observability/read-error";
import { addDays } from "@/lib/host/tape-chart";
import { lagosDay } from "@/app/host/reservations/desk";
import { WEEK_DAYS, lagosDayStart, lagosMonthStart, type WeekRow } from "./restaurant-figures";

/**
 * THE TWO COUNTS THE RESTAURANT HOME NEEDS BEYOND THE TABLE BOARD.
 *
 * The board (`getHostReservations`) reads the live tables from three days ago
 * on and a capped slice of the earlier ones, which is the right cut for a
 * desk and the wrong one for two figures:
 *
 *   week        every kept table from today to six days on, one read, and
 *               null if it reaches the API's thousand-row ceiling (a short
 *               line is a wrong line);
 *   no-shows    an exact head count of this Lagos month's no-shows, so a
 *               busy venue's earlier-list cap cannot undercount it.
 *
 * Both run under the host's own session, so the reservations policies decide
 * which tables are this host's, and both leave out the host's own tables as a
 * guest elsewhere (`guest_id <> me`), as the board does. Either one failing
 * is a null, and the figure that needs it is left out.
 */

const CEILING = 1000;

export type RestaurantReads = { week: WeekRow[] | null; noShowsMonth: number | null };

export async function readRestaurantExtras(now: Date = new Date()): Promise<RestaurantReads> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { week: null, noShowsMonth: null };
  const db = session.supabase;
  const me = session.user.id;
  const today = lagosDay(now);
  try {
    const [week, noShows] = await Promise.all([
      db
        .from("reservations")
        .select("reserved_for, status, party_size")
        .neq("guest_id", me)
        .gte("reserved_for", lagosDayStart(today))
        .lt("reserved_for", lagosDayStart(addDays(today, WEEK_DAYS)))
        .in("status", ["PENDING", "CONFIRMED", "COMPLETED"])
        .limit(CEILING),
      db
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .neq("guest_id", me)
        .eq("status", "NO_SHOW")
        .gte("reserved_for", lagosMonthStart(today))
        .lt("reserved_for", lagosDayStart(addDays(today, 1))),
    ]);
    await reportReadError("read.restaurantHome.week", week.error, noShows.error);
    return {
      week:
        week.error || !week.data || week.data.length >= CEILING
          ? null
          : week.data.map((row) => ({
              reservedFor: row.reserved_for as string,
              status: row.status as string,
              partySize: Number(row.party_size) || 0,
            })),
      noShowsMonth: noShows.error || noShows.count === null ? null : noShows.count,
    };
  } catch {
    return { week: null, noShowsMonth: null };
  }
}
