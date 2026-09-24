/**
 * V-94: THE VIEWING DAY, AS PURE FUNCTIONS.
 *
 * Slots arrive from `viewing_slots` as instants; a renter chooses among them
 * by day. A lister's confirmed viewings for one day become a ROUTE: in time
 * order, a new stop group whenever the area changes, and the gap before each
 * viewing, so "Yaba 10:00, 10:20, then 40 minutes, then Akoka 11:20" reads at
 * a glance. Nothing here decides who may see what; the reads do.
 */

export const LAGOS_OFFSET_MS = 60 * 60 * 1000;

/** The Lagos calendar day of an instant, `YYYY-MM-DD`. */
export function lagosDay(iso: string | number): string {
  const t = typeof iso === "number" ? iso : Date.parse(iso);
  return new Date(t + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

export type Slot = { slotAt: string; minutes: number; windowId: string };

/** Slots grouped by Lagos day, days and slots in order. */
export function slotsByDay(slots: readonly Slot[]): { day: string; slots: Slot[] }[] {
  const days = new Map<string, Slot[]>();
  for (const slot of [...slots].sort((a, b) => Date.parse(a.slotAt) - Date.parse(b.slotAt))) {
    const day = lagosDay(slot.slotAt);
    const list = days.get(day) ?? [];
    list.push(slot);
    days.set(day, list);
  }
  return [...days.entries()].map(([day, list]) => ({ day, slots: list }));
}

export type RouteStop = {
  inspectionId: string;
  listingId: string;
  listingTitle: string | null;
  area: string | null;
  slotAt: string;
  counterpartName: string | null;
  conversationId: string | null;
};

export type RouteLeg = RouteStop & {
  /** Minutes since the previous viewing started; null for the first. */
  gapMinutes: number | null;
  /** True when this stop is in a different area from the one before. */
  newArea: boolean;
};

/** One day's confirmed viewings as a route. */
export function routeFor(stops: readonly RouteStop[]): RouteLeg[] {
  const ordered = [...stops].sort((a, b) => Date.parse(a.slotAt) - Date.parse(b.slotAt));
  return ordered.map((stop, i) => {
    const before = i > 0 ? ordered[i - 1]! : null;
    const areaKey = (stop.area ?? "").trim().toLowerCase();
    const beforeKey = (before?.area ?? "").trim().toLowerCase();
    return {
      ...stop,
      gapMinutes: before ? Math.round((Date.parse(stop.slotAt) - Date.parse(before.slotAt)) / 60_000) : null,
      newArea: before === null || areaKey !== beforeKey,
    };
  });
}

/** The next viewing after `now` on the route, or null: whom "running late" tells. */
export function nextStop(route: readonly RouteLeg[], now: number): RouteLeg | null {
  return route.find((leg) => Date.parse(leg.slotAt) > now - 10 * 60_000) ?? null;
}

/** A window's form values, checked before they are sent. */
export function windowProblem(input: { starts: string; ends: string; listingIds: readonly string[] }): "listings" | "order" | "length" | null {
  if (input.listingIds.length === 0 || input.listingIds.length > 20) return "listings";
  const toMin = (t: string) => {
    const m = /^(\d{2}):(\d{2})$/.exec(t);
    return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
  };
  const s = toMin(input.starts);
  const e = toMin(input.ends);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return "order";
  if (e - s > 600) return "length";
  return null;
}
