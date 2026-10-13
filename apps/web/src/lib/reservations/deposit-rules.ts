/**
 * RESTAURANT TABLE DEPOSITS: THE RULES, PURE (track/restaurant-deposits).
 *
 * The founder's ruling, 13 October 2026: deposits on; a table stays free
 * unless the restaurant sets a deposit for that time and party.
 *
 * The money is the database's. `private.reservation_deposit_quote` (d75a)
 * picks the rule and computes the amount, the venue's share and Vallo's
 * commission when the deposit opens, and the gate refuses any row it did not
 * compute. This module only does two things the screens need before there is
 * a reservation to quote:
 *
 *   1. `matchDepositRule` answers, for the time and party a guest is picking,
 *      which of the venue's active rules the database would pick. It is the
 *      SQL's own order, line for line: active, the party at or above the
 *      rule's minimum, the window (none means every window) on the Lagos
 *      weekday with the time between opening and last seating, then the
 *      largest amount for this party, then the oldest rule. The guest is shown
 *      that amount BEFORE they ask; the reservation's real quote is read back
 *      after, and that is the one they pay.
 *   2. The restaurant's settings card edits a venue's rules as one set of
 *      choices (`DepositSettings`) and `planDepositRows` turns a saved set
 *      into the writes: rows kept and updated in place, rows added, rows
 *      switched off. A rule is never deleted, so a deposit that points at one
 *      keeps it.
 *
 * Client-safe: no reads, no React.
 */

/** The bounds `restaurant_deposit_rules` checks, said once. */
export const DEPOSIT_MIN_MINOR = 10_000;
export const DEPOSIT_MAX_MINOR = 100_000_000;
export const REFUND_HOURS_MAX = 168;
export const PARTY_MIN = 1;
export const PARTY_MAX = 50;
/** The refund windows the card offers, in hours. 0 is "until the table time". */
export const REFUND_HOUR_CHOICES = [0, 2, 6, 12, 24, 48, 72] as const;

export type DepositRule = {
  id: string;
  serviceWindowId: string | null;
  minPartySize: number | null;
  amountMinor: number;
  perGuest: boolean;
  refundUntilHours: number;
  active: boolean;
  createdAt: string;
};

/** A venue's service window, as `service_windows` stores it. */
export type DepositWindow = {
  id: string;
  weekday: number;
  opens: string;
  lastSeating: string;
};

const LAGOS_OFFSET_MS = 60 * 60 * 1000;

function clockMinutes(clock: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(clock);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** The Lagos weekday (0 Sunday) and minute of the day of an instant. Lagos is UTC+1 all year. */
export function lagosParts(iso: string): { weekday: number; minute: number } | null {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  const local = new Date(at + LAGOS_OFFSET_MS);
  return { weekday: local.getUTCDay(), minute: local.getUTCHours() * 60 + local.getUTCMinutes() };
}

/** What a rule asks of this party, in kobo. */
export function depositAmountFor(rule: Pick<DepositRule, "amountMinor" | "perGuest">, partySize: number): number {
  return rule.perGuest ? rule.amountMinor * partySize : rule.amountMinor;
}

function windowFits(window: DepositWindow | undefined, at: { weekday: number; minute: number }): boolean {
  if (!window) return false;
  const opens = clockMinutes(window.opens);
  const last = clockMinutes(window.lastSeating);
  if (opens === null || last === null) return false;
  return window.weekday === at.weekday && opens <= at.minute && at.minute <= last;
}

/**
 * The rule the database would pick for this party at this instant, or null
 * when the table is free. See the header for the order.
 */
export function matchDepositRule(
  rules: readonly DepositRule[],
  windows: readonly DepositWindow[],
  partySize: number,
  reservedForIso: string,
): { rule: DepositRule; amountMinor: number } | null {
  const at = lagosParts(reservedForIso);
  if (!at || !Number.isInteger(partySize) || partySize < 1) return null;
  const byId = new Map(windows.map((w) => [w.id, w]));
  const fits = rules.filter(
    (rule) =>
      rule.active &&
      (rule.minPartySize === null || partySize >= rule.minPartySize) &&
      (rule.serviceWindowId === null || windowFits(byId.get(rule.serviceWindowId), at)),
  );
  if (fits.length === 0) return null;
  const sorted = [...fits].sort((a, b) => {
    const amount = depositAmountFor(b, partySize) - depositAmountFor(a, partySize);
    return amount !== 0 ? amount : a.createdAt.localeCompare(b.createdAt);
  });
  const rule = sorted[0]!;
  return { rule, amountMinor: depositAmountFor(rule, partySize) };
}

/**
 * The time a guest is picking, as the instant the reservation action will
 * store: a Lagos date and clock, +01:00.
 */
export function lagosIso(date: string, time: string): string {
  return `${date}T${time}:00+01:00`;
}

/* ------------------------------------------------------------ settings */

/** The restaurant's choices on the settings card, for one venue. */
export type DepositSettings = {
  on: boolean;
  amountMinor: number;
  perGuest: boolean;
  /** Null: every party. Otherwise this size and up. */
  minPartySize: number | null;
  /** Null: every service window. Otherwise these windows only. */
  windowIds: string[] | null;
  refundUntilHours: number;
};

export const DEFAULT_DEPOSIT_SETTINGS: DepositSettings = {
  on: false,
  amountMinor: 500_000,
  perGuest: true,
  minPartySize: null,
  windowIds: null,
  refundUntilHours: 24,
};

/**
 * The card's starting state, read from the venue's rules. The active rules,
 * when there are any, are one set written by this card: the same amount and
 * terms, one row per picked window (or one row for every window). The newest
 * rule speaks for the set. With none active, the card is off and shows the
 * newest rule's terms, so turning it back on restores what the venue had.
 */
export function settingsFromRules(rules: readonly DepositRule[]): DepositSettings {
  const newest = (list: readonly DepositRule[]) =>
    [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  const active = rules.filter((r) => r.active);
  const lead = newest(active) ?? newest(rules);
  if (!lead) return { ...DEFAULT_DEPOSIT_SETTINGS };
  const windowIds =
    active.length === 0 || active.some((r) => r.serviceWindowId === null)
      ? null
      : [...new Set(active.map((r) => r.serviceWindowId as string))];
  return {
    on: active.length > 0,
    amountMinor: lead.amountMinor,
    perGuest: lead.perGuest,
    minPartySize: lead.minPartySize,
    windowIds,
    refundUntilHours: lead.refundUntilHours,
  };
}

export type DepositSettingsProblem = "amount" | "party" | "refund" | "times";

/** Why a set of choices cannot be saved, or null. The table's own checks, said first. */
export function depositSettingsProblem(
  s: DepositSettings,
  knownWindowIds: readonly string[],
): DepositSettingsProblem | null {
  if (!s.on) return null;
  if (!Number.isSafeInteger(s.amountMinor) || s.amountMinor < DEPOSIT_MIN_MINOR || s.amountMinor > DEPOSIT_MAX_MINOR) {
    return "amount";
  }
  if (s.minPartySize !== null && (!Number.isInteger(s.minPartySize) || s.minPartySize < PARTY_MIN || s.minPartySize > PARTY_MAX)) {
    return "party";
  }
  if (!Number.isInteger(s.refundUntilHours) || s.refundUntilHours < 0 || s.refundUntilHours > REFUND_HOURS_MAX) {
    return "refund";
  }
  if (s.windowIds !== null) {
    if (s.windowIds.length === 0) return "times";
    const known = new Set(knownWindowIds);
    if (s.windowIds.some((id) => !known.has(id))) return "times";
  }
  return null;
}

/** One row's columns, as `restaurant_deposit_rules` takes them. */
export type DepositRow = {
  service_window_id: string | null;
  min_party_size: number | null;
  amount_minor: number;
  per_guest: boolean;
  refund_until_hours: number;
  active: boolean;
};

export type DepositRowPlan = {
  update: { id: string; row: DepositRow }[];
  insert: DepositRow[];
  deactivate: string[];
};

/**
 * The writes that make a venue's rules say `s`, reusing rows rather than
 * piling them up: each wanted window takes the existing row for that window
 * (active first, then the newest), every other active row is switched off,
 * and only a window with no row of its own gets a new one. Off switches every
 * active row off and writes nothing else.
 */
export function planDepositRows(existing: readonly DepositRule[], s: DepositSettings): DepositRowPlan {
  const plan: DepositRowPlan = { update: [], insert: [], deactivate: [] };
  if (!s.on) {
    plan.deactivate = existing.filter((r) => r.active).map((r) => r.id);
    return plan;
  }
  const wanted: (string | null)[] = s.windowIds === null ? [null] : [...new Set(s.windowIds)];
  const used = new Set<string>();
  for (const windowId of wanted) {
    const row: DepositRow = {
      service_window_id: windowId,
      min_party_size: s.minPartySize,
      amount_minor: s.amountMinor,
      per_guest: s.perGuest,
      refund_until_hours: s.refundUntilHours,
      active: true,
    };
    const reuse = existing
      .filter((r) => r.serviceWindowId === windowId && !used.has(r.id))
      .sort((a, b) => Number(b.active) - Number(a.active) || b.createdAt.localeCompare(a.createdAt))[0];
    if (reuse) {
      used.add(reuse.id);
      plan.update.push({ id: reuse.id, row });
    } else {
      plan.insert.push(row);
    }
  }
  plan.deactivate = existing.filter((r) => r.active && !used.has(r.id)).map((r) => r.id);
  return plan;
}

/** The commission, said as a percentage: 200 basis points is "2%". */
export function percentFromBps(bps: number): string {
  return `${Math.round(bps) / 100}%`;
}
