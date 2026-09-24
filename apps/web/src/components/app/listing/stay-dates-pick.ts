/**
 * The pure date arithmetic behind `StayDates.tsx`, kept in a plain module so
 * it can be tested without rendering the provider.
 */

const MS_PER_DAY = 86_400_000;

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = Date.parse(`${checkIn}T00:00:00Z`);
  const b = Date.parse(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / MS_PER_DAY);
}

export function addDaysIso(iso: string, days: number): string {
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(t)) return iso;
  return new Date(t + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Nights in the default pick: Friday and Saturday. */
const WEEKEND_NIGHTS = 2;
/** How many weekends forward to look for one that is actually free. */
const WEEKENDS_TO_TRY = 12;

/**
 * The upcoming weekend, or the first one after it that is free.
 *
 * WHY A DEFAULT AT ALL. An empty pair of date fields makes the panel show a
 * per-night rate and nothing else: no total, no nights, no breakdown, and a
 * disabled Reserve button. The guest has to do work before the page will tell
 * them what the stay costs, and the single most common thing they are about to
 * type is this weekend. Opening on it means the total, the cleaning fee and
 * the service charge are all on screen the moment the page loads, and moving
 * off it is two taps in a native date picker.
 *
 * THE RULE IS ONE LINE AND HAS NO EDGE CASE: the next Friday strictly after
 * today, checking out on the Sunday. Today being Friday resolves to next
 * Friday rather than to this morning, which is what somebody planning a
 * weekend means by "this weekend" once it has started.
 *
 * BLOCKED NIGHTS ARE RESPECTED. Opening on a weekend the calendar has already
 * sold would put the panel into its "Some of those nights are already taken"
 * refusal before the guest had touched anything, which reads as the page being
 * broken. It steps forward a week at a time and takes the first free weekend;
 * if a whole quarter is booked it opens empty, because at that point picking
 * for them is guessing.
 *
 * Derived purely from `today` and `blockedDates`, both of which the server
 * computed and passed down, so the server render and the hydration agree.
 */
export function upcomingWeekend(
  today: string,
  blocked: Set<string>,
): { checkIn: string; checkOut: string } | null {
  const parsed = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(parsed)) return null;

  /* 5 is Friday. `|| 7` turns "zero days away" into "a week away", which is
     the today-is-Friday case. */
  const daysToFriday = (5 - new Date(parsed).getUTCDay() + 7) % 7 || 7;

  for (let week = 0; week < WEEKENDS_TO_TRY; week += 1) {
    const checkIn = addDaysIso(today, daysToFriday + week * 7);
    let free = true;
    for (let night = 0; night < WEEKEND_NIGHTS; night += 1) {
      if (blocked.has(addDaysIso(checkIn, night))) {
        free = false;
        break;
      }
    }
    if (free) return { checkIn, checkOut: addDaysIso(checkIn, WEEKEND_NIGHTS) };
  }
  return null;
}

/**
 * The dates the panel opens on. Dates the visitor already chose, carried in
 * the address from the stays search (`?checkIn=&checkOut=`), win when they are
 * usable: not in the past, one to 365 nights, and not over a night the
 * calendar has sold. Otherwise the upcoming free weekend, as before.
 *
 * Before this the page ignored the address and opened on the weekend, so the
 * pinned bar quoted "Total for 2 nights" under a search for five.
 */
export function initialStayDates(
  today: string,
  blocked: Set<string>,
  requested?: { checkIn?: string; checkOut?: string },
): { checkIn: string; checkOut: string } | null {
  const { checkIn, checkOut } = requested ?? {};
  if (checkIn && checkOut && checkIn >= today) {
    const nights = nightsBetween(checkIn, checkOut);
    if (nights >= 1 && nights <= 365) {
      let free = true;
      for (let i = 0; i < nights; i += 1) {
        if (blocked.has(addDaysIso(checkIn, i))) {
          free = false;
          break;
        }
      }
      if (free) return { checkIn, checkOut };
    }
  }
  return upcomingWeekend(today, blocked);
}

