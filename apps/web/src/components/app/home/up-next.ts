/**
 * "UP NEXT" ON HOME (plan item 15): the one thing each of three kinds that is
 * coming for this person, picked from reads the account already makes.
 *
 *   viewing  the soonest CONFIRMED viewing this person asked for, still ahead
 *            (`readInspectionsForRequester`, lib/inspections/queries.ts)
 *   stay     the soonest stay booked as a guest that is not over, pending or
 *            confirmed (`getMyBookings(...).upcoming`, lib/bookings/queries.ts)
 *   thread   the most recent conversation with unread messages
 *            (`loadConversationSummaries`, lib/messages/live.ts, newest first)
 *
 * Nothing is invented: each row is a record the person can open, and a kind
 * with nothing in it is simply absent. When all three are absent the card is
 * not drawn. Pure: `now` is an argument, so the choice is tested with fixed
 * instants.
 */

export type UpNextViewingInput = {
  id: string;
  state: string;
  slotAt: string | null;
  listingTitle: string | null;
  counterpartName: string | null;
};

export type UpNextStayInput = {
  id: string;
  status: string;
  title: string;
  checkIn: string;
  checkOut: string;
  dateRange: string;
};

export type UpNextThreadInput = {
  id: string;
  counterpartName: string;
  listingTitle: string | null;
  lastMessage: string;
  whenLabel: string;
  unread: number;
};

export type UpNextViewing = { id: string; title: string | null; with: string | null; slotAt: string; href: string };
export type UpNextStay = {
  id: string;
  title: string;
  dateRange: string;
  /** "now" while the guest is staying, else the booking's own status. */
  phase: "now" | "confirmed" | "pending";
  href: string;
};
export type UpNextThread = {
  id: string;
  name: string;
  about: string | null;
  lastMessage: string;
  whenLabel: string;
  unread: number;
  href: string;
};

export type UpNext = { viewing: UpNextViewing | null; stay: UpNextStay | null; thread: UpNextThread | null };

/** The Lagos calendar day of an instant, `YYYY-MM-DD`. */
function lagosDay(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

export function pickUpNext(
  {
    viewings,
    stays,
    threads,
  }: {
    viewings: readonly UpNextViewingInput[];
    stays: readonly UpNextStayInput[];
    threads: readonly UpNextThreadInput[];
  },
  now: Date = new Date(),
): UpNext {
  const nowMs = now.getTime();
  const today = lagosDay(now);

  const viewing =
    viewings
      .filter((v) => v.state === "CONFIRMED" && v.slotAt !== null && Date.parse(v.slotAt) >= nowMs)
      .sort((a, b) => Date.parse(a.slotAt!) - Date.parse(b.slotAt!))
      .map((v) => ({
        id: v.id,
        title: v.listingTitle,
        with: v.counterpartName,
        slotAt: v.slotAt!,
        href: `/bookings?kind=inspection&from=property&changed=${v.id}#ix-${v.id}`,
      }))[0] ?? null;

  const stay =
    stays
      .filter((s) => (s.status === "CONFIRMED" || s.status === "PENDING") && s.checkOut > today)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
      .map((s) => ({
        id: s.id,
        title: s.title,
        dateRange: s.dateRange,
        phase:
          s.status === "CONFIRMED" && s.checkIn <= today
            ? ("now" as const)
            : s.status === "CONFIRMED"
              ? ("confirmed" as const)
              : ("pending" as const),
        href: `/bookings/${s.id}`,
      }))[0] ?? null;

  /* The summaries arrive newest first, so the first with unread messages is
     the latest unread thread. */
  const unread = threads.find((t) => t.unread > 0);
  const thread = unread
    ? {
        id: unread.id,
        name: unread.counterpartName,
        about: unread.listingTitle,
        lastMessage: unread.lastMessage,
        whenLabel: unread.whenLabel,
        unread: unread.unread,
        href: `/messages/${unread.id}`,
      }
    : null;

  return { viewing, stay, thread };
}

export function hasUpNext(next: UpNext): boolean {
  return next.viewing !== null || next.stay !== null || next.thread !== null;
}

/** "Sat 4 Oct, 2:00 pm", in Lagos time, whatever the server's zone. */
export function viewingWhen(iso: string): string {
  const at = new Date(iso);
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(at);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(at)
    .replace(/\s?([ap])m$/i, (_, p: string) => ` ${p.toLowerCase()}m`);
  return `${day}, ${time}`;
}
