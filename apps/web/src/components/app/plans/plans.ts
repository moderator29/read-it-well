/**
 * PLANS: everything a person has committed to, on one dated list (V-76).
 *
 * `/bookings`, `/trips` and `/inspections` were three lists whose empty
 * states were signposts to each other, and none of them answered the
 * question a person with an inspection on Saturday and a shortlet on Sunday
 * is actually asking: what am I doing this weekend. This module turns the
 * four kinds of commitment the account already reads (inspections, tenancy
 * move-ins, stays and restaurant tables) into one `PlanItem` shape, and
 * groups the ones still ahead by Lagos day: Today, This week, Later.
 *
 * It decides nothing about any of them. Each item links to the place its own
 * controls already live (an inspection to its sheet on the same page, a stay
 * or a table to the date spine's row, a tenancy to its pay screen), because
 * only the lists merged; every kind keeps its own detail and its own rules.
 *
 * Pure: `today` is an argument, so the grouping is tested with fixed days.
 */

export type PlanKind = "inspection" | "tenancy" | "stay" | "table";
export type PlanSide = "property" | "stays";
export type PlanFilter = "all" | PlanSide;

export type PlanItem = {
  id: string;
  kind: PlanKind;
  side: PlanSide;
  /** The Lagos calendar day it happens on, `YYYY-MM-DD`. */
  on: string;
  /** The instant, when it has one, so two things on one day sort by the hour. */
  at?: string;
  title: string;
  where: string;
  href: string;
};

export type PlanGroups = { today: PlanItem[]; week: PlanItem[]; later: PlanItem[] };

const SIDE_OF: Record<PlanKind, PlanSide> = {
  inspection: "property",
  tenancy: "property",
  stay: "stays",
  table: "stays",
};

export function sideOfKind(kind: PlanKind): PlanSide {
  return SIDE_OF[kind];
}

/** The Lagos day of an instant, `YYYY-MM-DD`. */
export function lagosDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function dayNumber(day: string): number {
  return Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
}

/** Read `?side=` and `?kind=`; the side the shell is on when neither says. */
export function planFilterFrom(
  params: Record<string, string | string[] | undefined>,
  shellSide: PlanSide,
): { filter: PlanFilter; inspectionsOnly: boolean } {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const kind = first(params.kind);
  if (kind === "inspection") return { filter: "property", inspectionsOnly: true };
  const side = first(params.side);
  if (side === "all" || side === "property" || side === "stays") {
    return { filter: side, inspectionsOnly: false };
  }
  return { filter: shellSide, inspectionsOnly: false };
}

export function inFilter(item: Pick<PlanItem, "side">, filter: PlanFilter): boolean {
  return filter === "all" || item.side === filter;
}

/**
 * The items still ahead, soonest first, grouped by Lagos day. Anything before
 * today is not a plan any more and is left to each kind's own record below.
 * "This week" is the next six days after today.
 */
export function groupPlans(items: PlanItem[], today: string): PlanGroups {
  const now = dayNumber(today);
  const ahead = items
    .filter((item) => item.on >= today)
    .sort((a, b) => (a.at ?? `${a.on}T00:00`).localeCompare(b.at ?? `${b.on}T00:00`));
  const groups: PlanGroups = { today: [], week: [], later: [] };
  for (const item of ahead) {
    const days = dayNumber(item.on) - now;
    if (days <= 0) groups.today.push(item);
    else if (days <= 6) groups.week.push(item);
    else groups.later.push(item);
  }
  return groups;
}

export function planCount(groups: PlanGroups): number {
  return groups.today.length + groups.week.length + groups.later.length;
}
