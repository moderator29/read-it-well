import { agoShort } from "@/lib/format/when";
/**
 * Pure arithmetic for the console's figures: the change against the previous
 * period, the axis ticks, the "12m ago" stamps and the alert vocabulary. No
 * reads happen here; every input is a number or a row the query layer
 * returned. Kept apart from the drawing so it can be tested exactly.
 */

export type Delta = {
  direction: "up" | "down" | "flat";
  /** Whether this direction is good news for this figure. */
  good: boolean;
  /** "+12%", "-4%", "No change", or "+3" when the previous period was zero. */
  text: string;
};

/**
 * The change from `previous` to `current`.
 *
 * NULL WHEN EITHER PERIOD IS MISSING. A delta is only drawn when both periods
 * were computed from real rows; the caller passes null for a period it does
 * not have and gets null back, never a guess.
 *
 * From zero, a percentage is undefined, so the change is printed as a count
 * ("+3") rather than as an infinite or invented percentage.
 */
export function periodDelta(
  current: number | null | undefined,
  previous: number | null | undefined,
  options: { higherIsGood?: boolean } = {},
): Delta | null {
  if (current === null || current === undefined || previous === null || previous === undefined) return null;
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  const higherIsGood = options.higherIsGood ?? true;
  const diff = current - previous;
  const direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  const good = direction === "flat" ? true : (direction === "up") === higherIsGood;
  if (direction === "flat") return { direction, good, text: "No change" };
  if (previous === 0) {
    return { direction, good, text: `${diff > 0 ? "+" : ""}${diff}` };
  }
  const pct = (diff / Math.abs(previous)) * 100;
  const rounded = Math.abs(pct) >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10;
  return { direction, good, text: `${rounded > 0 ? "+" : ""}${rounded}%` };
}

/**
 * Round axis ticks from zero to at least `max`: 0, then `count` even steps on
 * a 1, 2, 2.5 or 5 multiple of a power of ten. A zero series still gets a
 * readable axis (0 to 1 step) rather than a collapsed one.
 */
export function niceTicks(max: number, count = 4): number[] {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const raw = safeMax / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? 10 * power;
  const ticks: number[] = [];
  for (let i = 0; i <= count; i += 1) ticks.push(Math.round(step * i * 1e6) / 1e6);
  return ticks;
}

/** "just now", "12m ago", "3h ago", "2d ago", then the date: `agoShort`'s
 *  words, with the console's own date past a week. */
export function sinceLabel(iso: string | null, now: number, formatDate: (d: Date) => string): string {
  if (!iso) return "Not recorded";
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "Not recorded";
  if (now - at >= 7 * 86_400_000) return formatDate(new Date(at));
  return agoShort(at, { now });
}

export type AlertTone = "success" | "pending" | "error" | "info";

/**
 * A risk alert's badge. Resolved is emerald whatever its severity, because
 * the question an operator reads the badge for is "is this still live". An
 * open one is rose for high, cyan for medium (in flight, needs a look) and
 * blue for low (information).
 */
export function alertBadge(severity: string, status: string): { tone: AlertTone; word: string } {
  if (status === "resolved") return { tone: "success", word: "Resolved" };
  if (severity === "high") return { tone: "error", word: "High" };
  if (severity === "medium") return { tone: "pending", word: "Medium" };
  return { tone: "info", word: "Info" };
}

/**
 * The first human line of an alert's description.
 *
 * Several writers store `kind\n{json}` in the description; the kind is the
 * machine name and the JSON is the detail. Neither is a sentence, so the line
 * under the title shows the entity instead when that is all there is.
 */
export function alertSubline(description: string | null, entityType: string | null): string {
  const first = (description ?? "").split("\n")[0]?.trim() ?? "";
  const machine = first.length === 0 || /^[a-z0-9_.]+$/.test(first) || first.startsWith("{");
  if (!machine) return first.length > 90 ? `${first.slice(0, 89)}…` : first;
  if (!entityType) return "Platform";
  const spaced = entityType.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
