/**
 * SCHEDULE A VISIT, AS PURE FUNCTIONS. Client-safe, no I/O.
 *
 * The flow at `/listing/[id]/visit` and its status screen read everything
 * they decide from here, so every rule is tested rather than trusted:
 *
 *   - the visit mode (`inspection_requests.visit_mode`) and its two values;
 *   - the date strip, the month grid and the Morning, Afternoon and Evening
 *     tabs, all on Lagos time (UTC+1 all year, no daylight saving);
 *   - the times a renter may SUGGEST when the lister has opened none (the
 *     request path the actions already support: two hours ahead at least);
 *   - where a visit stands, read from the row and never invented: the phase,
 *     whether the big tick is earned, which moves are offered;
 *   - the "What happens next" timeline, each step done only when a real
 *     timestamp says so;
 *   - when the calendar file may be offered (a confirmed slot still ahead)
 *     and when the video call may be joined (10 minutes before, through the
 *     slot).
 *
 * Nothing here decides who may see or do what. Row-level security, the
 * transition guard and the actions do; this only reads what they allowed.
 */

import type { InspectionOutcome, InspectionState } from "./types";
import { farEnoughAhead } from "./when";
import { VIEWING_MINUTES } from "../viewings/day-kit";
import type { BadgeTier } from "../trust/badge-tier";

/* ------------------------------------------------------------------ mode */

export const VISIT_MODES = ["in_person", "video"] as const;
export type VisitMode = (typeof VISIT_MODES)[number];

/** `visit_mode` as the table holds it. Anything unreadable is in person, the column's default. */
export function visitModeOf(value: unknown): VisitMode {
  return value === "video" ? "video" : "in_person";
}

/** The note's limit: `requestInspection`, `bookViewingSlot` and `book_viewing_slot` all hold 400. */
export const VISIT_NOTE_LIMIT = 400;

/** How many days the strip shows, and how far ahead `viewing_slots` is asked. */
export const STRIP_DAYS = 14;

/** The video call opens this many minutes before the slot. */
export const JOIN_LEAD_MINUTES = 10;

/* ------------------------------------------------------------ Lagos time */

const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 86_400_000;

/** The Lagos calendar day of an instant, `YYYY-MM-DD`. */
export function lagosDayOf(at: string | number): string {
  const t = typeof at === "number" ? at : Date.parse(at);
  return new Date(t + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

/** The Lagos wall-clock hour (0 to 23) of an instant. */
export function lagosHour(at: string): number {
  return new Date(Date.parse(at) + LAGOS_OFFSET_MS).getUTCHours();
}

/** A `YYYY-MM-DD` day moved by `n` days. Pure calendar arithmetic, no zone. */
export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** `count` consecutive days from `start`. */
export function daysFrom(start: string, count: number): string[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => addDays(start, i));
}

/** The instant of a Lagos wall-clock time on a day. */
export function lagosInstant(day: string, hour: number, minute = 0): string {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return new Date(`${day}T${hh}:${mm}:00+01:00`).toISOString();
}

/** Noon in Lagos on a day: a safe instant for formatting the day's name. */
export function lagosNoon(day: string): Date {
  return new Date(`${day}T12:00:00+01:00`);
}

/* ------------------------------------------------------------- day parts */

export type DayPart = "morning" | "afternoon" | "evening";
export const DAY_PARTS: readonly DayPart[] = ["morning", "afternoon", "evening"];

/** Before noon is morning, noon to five is afternoon, five onwards is evening (Lagos time). */
export function dayPartOf(at: string): DayPart {
  const hour = lagosHour(at);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

/** Times grouped into the three tabs, each in time order. */
export function groupByDayPart<T extends { slotAt: string }>(times: readonly T[]): Record<DayPart, T[]> {
  const out: Record<DayPart, T[]> = { morning: [], afternoon: [], evening: [] };
  for (const time of [...times].sort((a, b) => Date.parse(a.slotAt) - Date.parse(b.slotAt))) {
    out[dayPartOf(time.slotAt)].push(time);
  }
  return out;
}

/** The tab to open on: the first with any time in it, else morning. */
export function firstDayPart<T>(groups: Record<DayPart, readonly T[]>): DayPart {
  return DAY_PARTS.find((part) => groups[part].length > 0) ?? "morning";
}

/* --------------------------------------------------------- open slots */

export type OpenSlot = { slotAt: string; minutes: number; windowId: string };

/** The lister's open slots for one Lagos day, in time order. */
export function slotsOn<T extends { slotAt: string }>(slots: readonly T[], day: string): T[] {
  return slots.filter((slot) => lagosDayOf(slot.slotAt) === day).sort((a, b) => Date.parse(a.slotAt) - Date.parse(b.slotAt));
}

/** How many open slots each Lagos day has. */
export function slotCounts(slots: readonly { slotAt: string }[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const slot of slots) {
    const day = lagosDayOf(slot.slotAt);
    out.set(day, (out.get(day) ?? 0) + 1);
  }
  return out;
}

/* ------------------------------------------------- suggesting a time */

/**
 * The hours a renter may suggest when the lister has opened no times: on the
 * hour, eight in the morning to six in the evening, Lagos time. The request
 * path (`requestInspection`) takes any time two hours ahead; this is the
 * grid the screen offers within it, so a pill never offers what the action
 * would refuse.
 */
export const ASK_HOURS: readonly number[] = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

/** A suggested time, shaped like a slot so the same tabs draw both. */
export type AskTime = { slotAt: string };

export function askTimesOn(day: string, now: number): AskTime[] {
  return ASK_HOURS.map((hour) => ({ slotAt: lagosInstant(day, hour) })).filter((time) => farEnoughAhead(time.slotAt, now));
}

/** The days a time may be suggested on: the next 14, skipping today once it has none left. */
export function askDays(now: number, count = STRIP_DAYS): string[] {
  const today = lagosDayOf(now);
  const start = askTimesOn(today, now).length > 0 ? today : addDays(today, 1);
  return daysFrom(start, count);
}

/* ----------------------------------------------------------- the month */

/** `YYYY-MM` of a day. */
export function monthOf(day: string): string {
  return day.slice(0, 7);
}

/** A `YYYY-MM` month moved by `n` months. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const index = y * 12 + (m - 1) + n;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/**
 * The month as weeks of seven cells, Monday first (the week Nigeria's
 * calendars print), with null for the cells outside the month.
 */
export function monthGrid(month: string): (string | null)[][] {
  const first = `${month}-01`;
  const weekday = new Date(`${first}T00:00:00Z`).getUTCDay();
  const lead = (weekday + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = first; monthOf(day) === month; day = addDays(day, 1)) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/* ------------------------------------------------------ the visit row */

/** One inspection as the status screen reads it (the requester's own row, under RLS). */
export type VisitRow = {
  id: string;
  listingId: string;
  state: InspectionState;
  requestedAt: string;
  slotAt: string | null;
  note: string | null;
  listerNote: string | null;
  createdAt: string;
  respondedAt: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  outcome: InspectionOutcome | null;
  visitMode: VisitMode;
  conversationId: string | null;
  /** The booked slot's length, from its viewing window; null for a requested time. */
  slotMinutes: number | null;
};

/** Where a visit stands, in the words the screen uses. One per state, two where the row tells them apart. */
export type VisitPhase =
  | "sent"
  | "proposed"
  | "confirmed"
  | "declined"
  | "cancelledByLister"
  | "withdrawn"
  | "withdrawnConfirmed"
  | "completed"
  | "noShow";

/**
 * The phase from the state, exhaustive over `InspectionState` so a new state
 * is a compile error here rather than a blank screen. A decline or a
 * withdrawal of a visit that had been confirmed (`confirmed_at` is stamped by
 * `private.stamp_inspection_transitions` and kept) reads as a cancelled
 * visit, which is what the lister and the renter each did.
 */
export function visitPhase(row: Pick<VisitRow, "state" | "confirmedAt">): VisitPhase {
  const byState: Record<InspectionState, VisitPhase> = {
    REQUESTED: "sent",
    PROPOSED: "proposed",
    CONFIRMED: "confirmed",
    DECLINED: row.confirmedAt ? "cancelledByLister" : "declined",
    WITHDRAWN: row.confirmedAt ? "withdrawnConfirmed" : "withdrawn",
    COMPLETED: "completed",
    NO_SHOW: "noShow",
  };
  return byState[row.state];
}

export type VisitTone = "brand" | "good" | "pending" | "bad" | "quiet";

export type VisitView = {
  phase: VisitPhase;
  /** The big tick: only a request that went, or a visit that is confirmed. */
  check: boolean;
  tone: VisitTone;
  /** The time the tiles show. */
  shownAt: string;
  /** PROPOSED only: the time the renter asked for, beside the new one. */
  askedAt: string | null;
  /** PROPOSED, with the offered time still ahead. */
  canAccept: boolean;
  /** What "cancel" is called here, or null when nothing can be cancelled. */
  cancel: "request" | "visit" | null;
  /** Live and still ahead: withdraw, then pick again. */
  canChangeTime: boolean;
  /** Closed without a visit: the way back to the flow. */
  canAskAgain: boolean;
};

const TONE: Record<VisitPhase, VisitTone> = {
  sent: "brand",
  proposed: "pending",
  confirmed: "good",
  declined: "bad",
  cancelledByLister: "bad",
  withdrawn: "quiet",
  withdrawnConfirmed: "quiet",
  completed: "good",
  noShow: "bad",
};

/** The agreed or asked time a row stands for. */
export function visitTime(row: Pick<VisitRow, "slotAt" | "requestedAt">): string {
  return row.slotAt ?? row.requestedAt;
}

export function visitView(row: VisitRow, now: number): VisitView {
  const phase = visitPhase(row);
  const at = visitTime(row);
  const ahead = Date.parse(at) > now;
  const shownAt = row.state === "REQUESTED" || row.state === "DECLINED" ? row.requestedAt : at;
  return {
    phase,
    check: phase === "sent" || phase === "confirmed",
    tone: TONE[phase],
    shownAt,
    askedAt: row.state === "PROPOSED" ? row.requestedAt : null,
    canAccept: row.state === "PROPOSED" && row.slotAt !== null && Date.parse(row.slotAt) > now,
    cancel:
      row.state === "REQUESTED" || row.state === "PROPOSED"
        ? "request"
        : row.state === "CONFIRMED" && ahead
          ? "visit"
          : null,
    canChangeTime: (row.state === "REQUESTED" || row.state === "PROPOSED" || row.state === "CONFIRMED") && ahead,
    canAskAgain: row.state === "DECLINED" || row.state === "WITHDRAWN",
  };
}

/* -------------------------------------------------- calendar and call */

export type CalendarState = "available" | "notConfirmed" | "passed" | "hidden";

/**
 * The .ics is offered only for a confirmed slot that is still ahead (or
 * under way). Before confirmation it is drawn disabled with the reason; on a
 * closed request it is not drawn at all, because there is nothing to add.
 */
export function calendarState(row: Pick<VisitRow, "state" | "slotAt" | "slotMinutes">, now: number): CalendarState {
  if (row.state === "REQUESTED" || row.state === "PROPOSED") return "notConfirmed";
  if (row.state !== "CONFIRMED") return "hidden";
  if (!row.slotAt) return "notConfirmed";
  const end = Date.parse(row.slotAt) + (row.slotMinutes ?? VIEWING_MINUTES) * 60_000;
  return now <= end ? "available" : "passed";
}

export type JoinState = "hidden" | "early" | "open" | "over";

/**
 * "Join video visit": a confirmed video visit, from ten minutes before the
 * slot until it ends. The call itself is the existing calls feature, placed
 * into the visit's own conversation; nothing here carries a token.
 */
export function videoJoinState(
  row: Pick<VisitRow, "state" | "slotAt" | "slotMinutes" | "visitMode">,
  now: number,
): JoinState {
  if (row.state !== "CONFIRMED" || row.visitMode !== "video" || !row.slotAt) return "hidden";
  const start = Date.parse(row.slotAt);
  const end = start + (row.slotMinutes ?? VIEWING_MINUTES) * 60_000;
  if (now < start - JOIN_LEAD_MINUTES * 60_000) return "early";
  if (now <= end) return "open";
  return "over";
}

/* ------------------------------------------------------- the timeline */

export type StepKey = "sent" | "confirm" | "eve" | "day" | "visit" | "decision";
export type StepStatus = "done" | "current" | "upcoming" | "stopped";
/** Which sentence a step says, beside its title. */
export type StepDetail = "default" | "done" | "waiting" | "offered" | "booked" | "declined";

export type TimelineStep = { key: StepKey; status: StepStatus; at: string | null; detail: StepDetail };

/** The renter's reminders for the current slot (`public.viewing_reminders`, sent_at), when they went. */
export type VisitReminders = { eve: string | null; day: string | null };

export const NO_REMINDERS: VisitReminders = { eve: null, day: null };

/** A confirmation stamped within a minute of the request is a slot booked outright. */
const BOOKED_OUTRIGHT_MS = 60_000;

/**
 * "What happens next", from timestamps only. A step is done when the row (or
 * the reminder ledger) holds the moment it happened; the step somebody is
 * waiting on is current; a request that closed stops at the step it never
 * reached and draws nothing after it. A reminder that never went before the
 * visit time passed is left out rather than shown as "not yet" forever.
 */
export function visitTimeline(row: VisitRow, reminders: VisitReminders, now: number): TimelineStep[] {
  const at = visitTime(row);
  const visitEnd = Date.parse(at) + (row.slotMinutes ?? VIEWING_MINUTES) * 60_000;
  const waiting = row.state === "REQUESTED" || row.state === "PROPOSED";
  const decided = row.outcome === "deal_done" || row.outcome === "no_deal";

  const confirm: TimelineStep = waiting
    ? { key: "confirm", status: "current", at: null, detail: row.state === "PROPOSED" ? "offered" : "waiting" }
    : row.confirmedAt
      ? {
          key: "confirm",
          status: "done",
          at: row.confirmedAt,
          detail: Math.abs(Date.parse(row.confirmedAt) - Date.parse(row.createdAt)) <= BOOKED_OUTRIGHT_MS ? "booked" : "done",
        }
      : row.state === "DECLINED"
        ? { key: "confirm", status: "stopped", at: row.respondedAt, detail: "declined" }
        : { key: "confirm", status: "upcoming", at: null, detail: "waiting" };

  const reminder = (key: "eve" | "day", sent: string | null): TimelineStep | null => {
    if (sent) return { key, status: "done", at: sent, detail: "done" };
    if (now > Date.parse(at) || row.state === "COMPLETED" || row.state === "NO_SHOW") return null;
    /* The evening before has gone by once it is the visit's own day: a
       visit booked for today never gets that reminder, so it is not promised. */
    if (key === "eve" && lagosDayOf(now) >= lagosDayOf(at)) return null;
    return { key, status: "upcoming", at: null, detail: "default" };
  };

  const visit: TimelineStep =
    row.state === "COMPLETED"
      ? { key: "visit", status: "done", at: row.completedAt, detail: "done" }
      : row.state === "NO_SHOW"
        ? { key: "visit", status: "stopped", at: null, detail: "default" }
        : row.state === "CONFIRMED" && now >= Date.parse(at) - JOIN_LEAD_MINUTES * 60_000 && now <= visitEnd
          ? { key: "visit", status: "current", at: null, detail: "default" }
          : { key: "visit", status: "upcoming", at: null, detail: "default" };

  const decision: TimelineStep = decided
    ? { key: "decision", status: "done", at: row.completedAt, detail: "done" }
    : row.state === "COMPLETED"
      ? { key: "decision", status: "current", at: null, detail: "default" }
      : { key: "decision", status: "upcoming", at: null, detail: "default" };

  const steps = [
    { key: "sent", status: "done", at: row.createdAt, detail: "done" } as TimelineStep,
    confirm,
    reminder("eve", reminders.eve),
    reminder("day", reminders.day),
    visit,
    decision,
  ].filter((step): step is TimelineStep => step !== null);

  /* Closed without a visit: stop at the first step that never happened. */
  if (row.state === "DECLINED" || row.state === "WITHDRAWN" || row.state === "NO_SHOW") {
    const stop = steps.findIndex((step) => step.status !== "done");
    if (stop === -1) return steps;
    return [...steps.slice(0, stop), { ...steps[stop]!, status: "stopped" }];
  }
  return steps;
}

/* ------------------------------------------------------------ the role */

export type ListerRoleWord = "landlord" | "agent" | "agency";

/** The lister as the card draws them: the public face they chose, nothing else. */
export type VisitLister = {
  /** `social_profiles.display_label` (or `@handle`), else the listing's published lister name. */
  name: string | null;
  photoUrl: string | null;
  role: ListerRoleWord | null;
  /** `public.person_badge.tier`; "none" draws no mark. */
  tier: BadgeTier;
  handle: string | null;
  /** Only on the status screen, for a party, through `callableNumbersFor`. */
  phone: string | null;
};

/**
 * The lister's role word: the side of their supply account
 * (`social_profiles.supply_role`, the projection of `agents.role`) when it is
 * published, otherwise what the listing says the lister is
 * (`listings.listing_role`). Null when neither says: no noun is guessed.
 */
export function listerRoleWord(supplyRole: string | null | undefined, listingRole: string | null | undefined): ListerRoleWord | null {
  if (supplyRole === "owner") return "landlord";
  if (supplyRole === "agent") return "agent";
  if (listingRole === "owner") return "landlord";
  if (listingRole === "agent") return "agent";
  if (listingRole === "firm") return "agency";
  return null;
}
