/**
 * The arithmetic the three review desks share, kept pure so it can be tested
 * without a database and so no desk invents its own version of a median or a
 * percentage change.
 *
 * Every function here refuses to manufacture a number. A delta with no prior
 * period is `null`, not zero; a median of nothing is `null`, not zero; a donut
 * of nothing draws no arcs. The screen decides how an absent number reads, and
 * it never reads as a measured one.
 */

/** The median of a list, or null when the list is empty. */
export function median(values: readonly number[]): number | null {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length === 0) return null;
  const sorted = [...clean].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

/** The mean of a list, or null when the list is empty. */
export function mean(values: readonly number[]): number | null {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length === 0) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

/**
 * Percentage change from `before` to `now`, rounded to a whole per cent.
 *
 * Null when either period is missing or the earlier one is zero: a change from
 * nothing is not a percentage, and printing "+100%" over a first ever row is
 * the invented delta the admin brief forbids.
 */
export function percentChange(now: number | null, before: number | null): number | null {
  if (now === null || before === null) return null;
  if (!Number.isFinite(now) || !Number.isFinite(before) || before === 0) return null;
  return Math.round(((now - before) / before) * 100);
}

/** Minutes as the console prints a duration: "8h 24m", "36m", "2d 3h". */
export function formatDuration(minutes: number | null): string | null {
  if (minutes === null || !Number.isFinite(minutes) || minutes < 0) return null;
  const whole = Math.round(minutes);
  if (whole < 60) return `${whole}m`;
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  if (hours < 48) return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
  const days = Math.floor(hours / 24);
  const hoursLeft = hours % 24;
  return hoursLeft === 0 ? `${days}d` : `${days}d ${hoursLeft}h`;
}

/**
 * How long ago, in the short form the queue tables use: "12m ago", "2h ago",
 * "3d ago". Anything under a minute is "just now". A future or unparseable
 * stamp returns null so the cell can say it was not recorded.
 */
export function ageShort(iso: string | null, now: number = Date.now()): string | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return null;
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 0) return null;
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 60) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/** Minutes between two stamps, or null when either is missing or out of order. */
export function minutesBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null;
  return (b - a) / 60_000;
}

/** One slice of a donut: its share of the whole, as start and end fractions. */
export type DonutArc = { key: string; value: number; start: number; end: number };

/**
 * The arcs of a donut, as fractions of a turn.
 *
 * Zero-valued segments are dropped rather than drawn as slivers, and a donut
 * whose total is zero returns no arcs at all: the ring is then drawn as its
 * empty track, which is the honest picture of a queue with nothing in it.
 */
export function donutArcs(segments: readonly { key: string; value: number }[]): DonutArc[] {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  if (total === 0) return [];
  let cursor = 0;
  const out: DonutArc[] = [];
  for (const segment of segments) {
    if (segment.value <= 0) continue;
    const share = segment.value / total;
    out.push({ key: segment.key, value: segment.value, start: cursor, end: cursor + share });
    cursor += share;
  }
  return out;
}

/** A whole-number share of a total, or null when there is no total. */
export function share(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 100);
}

/**
 * An SVG path for a sparkline over `values`, in a `width` by `height` box.
 * Fewer than two points cannot make a line, so they make no path.
 */
export function sparkPath(values: readonly number[], width: number, height: number): string | null {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  return values
    .map((value, index) => {
      const x = Math.round(index * step * 10) / 10;
      const y = Math.round((height - ((value - min) / span) * height) * 10) / 10;
      return `${index === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");
}

/**
 * Counts per Lagos calendar day for the last `days` days, oldest first.
 * The series behind every sparkline on these desks.
 */
export function dailySeries(
  stamps: readonly (string | null)[],
  days: number,
  now: number = Date.now(),
): number[] {
  const DAY = 86_400_000;
  const LAGOS = 60 * 60_000;
  const today = Math.floor((now + LAGOS) / DAY);
  const out = new Array<number>(days).fill(0);
  for (const stamp of stamps) {
    if (!stamp) continue;
    const at = Date.parse(stamp);
    if (Number.isNaN(at)) continue;
    const day = Math.floor((at + LAGOS) / DAY);
    const index = days - 1 - (today - day);
    if (index >= 0 && index < days) out[index] = (out[index] ?? 0) + 1;
  }
  return out;
}

/** The start of today in Lagos, as an ISO stamp. */
export function lagosTodayStart(now: number = Date.now()): string {
  const DAY = 86_400_000;
  const LAGOS = 60 * 60_000;
  const start = Math.floor((now + LAGOS) / DAY) * DAY - LAGOS;
  return new Date(start).toISOString();
}

/** The page numbers a pager draws: first, last, the current one and its neighbours. */
export function pagerPages(current: number, last: number): (number | "gap")[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const shown = new Set([1, last, current, current - 1, current + 1]);
  if (current <= 4) [2, 3, 4, 5].forEach((page) => shown.add(page));
  if (current >= last - 3) [last - 4, last - 3, last - 2, last - 1].forEach((page) => shown.add(page));
  const pages = [...shown].filter((page) => page >= 1 && page <= last).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  pages.forEach((page, index) => {
    const previous = pages[index - 1];
    if (previous !== undefined && page - previous > 1) out.push("gap");
    out.push(page);
  });
  return out;
}
