/**
 * HOW MUCH DATA VALLO USED ON THIS PHONE THIS WEEK. V-79.
 *
 * The Settings foot says it in megabytes, never in naira: the price of a
 * megabyte depends on the network and the bundle, and a naira figure would be
 * a claim the code cannot prove. Megabytes it can measure, with one honest
 * limit: `PerformanceResourceTiming.transferSize` is zero for anything served
 * from the browser's cache and for a cross-origin file that does not opt in
 * (Timing-Allow-Origin), so the figure is what this phone could measure,
 * which is at most what it spent. The copy says "about".
 *
 * Kept in `localStorage` as bytes per Lagos day, eight days at most. It is a
 * per-device convenience, never sent anywhere, and losing it loses nothing.
 */

export type MeterDays = Record<string, number>;

export const METER_KEY = "vallo_data_meter";
const KEEP_DAYS = 8;

/** YYYY-MM-DD in Lagos. */
export function lagosDay(epochMs: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(epochMs));
}

export function readDays(raw: string | null): MeterDays {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: MeterDays = {};
    for (const [day, bytes] of Object.entries(parsed as Record<string, unknown>)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(day) && typeof bytes === "number" && Number.isFinite(bytes) && bytes >= 0) {
        out[day] = bytes;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Add bytes to today, dropping days older than the window. */
export function addBytes(days: MeterDays, bytes: number, epochMs: number): MeterDays {
  const today = lagosDay(epochMs);
  const next: MeterDays = { ...days, [today]: (days[today] ?? 0) + Math.max(0, Math.round(bytes)) };
  const keep = new Set(Array.from({ length: KEEP_DAYS }, (_, i) => lagosDay(epochMs - i * 86_400_000)));
  for (const day of Object.keys(next)) if (!keep.has(day)) delete next[day];
  return next;
}

/** The last seven Lagos days, today included. */
export function weekBytes(days: MeterDays, epochMs: number): number {
  let total = 0;
  for (let i = 0; i < 7; i += 1) total += days[lagosDay(epochMs - i * 86_400_000)] ?? 0;
  return total;
}

/** Megabytes, rounded for reading: one decimal under ten, whole above. */
export function megabytes(bytes: number): string {
  const mb = bytes / 1_000_000;
  return mb < 10 ? mb.toFixed(1) : String(Math.round(mb));
}
