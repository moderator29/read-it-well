/**
 * FIELD SPEED, SCRUBBED BEFORE IT IS STORED. V-80.
 *
 * Pure functions shared by the reporter (`components/app/VitalsReporter.tsx`)
 * and the ingest (`app/api/vitals/route.ts`). The ingest trusts nothing the
 * browser sent: every value is re-checked here, the path is reduced to a
 * route TEMPLATE (an id is never stored), and a sample that cannot be read is
 * dropped rather than half-stored.
 */

import { matchRoute, normalisePath } from "../nav/resolve";

export const VITAL_METRICS = ["LCP", "INP", "CLS", "FCP", "TTFB"] as const;
export type VitalMetric = (typeof VITAL_METRICS)[number];
export const EFFECTIVE_TYPES = ["slow-2g", "2g", "3g", "4g"] as const;

/** One page view in ten reports. Decided once per page load. */
export const SAMPLE_RATE = 0.1;

/**
 * THE LAUNCH WINDOW (C13): every page view reports for the two weeks after
 * the store launch, because `web_vitals_samples` held 6 rows on 30 September
 * and one in ten of a launch week's traffic is too few to read. On
 * 15 October 2026 (Lagos) it drops back to one in ten by itself; nobody has
 * to remember to turn it down.
 */
export const FULL_SAMPLING_UNTIL = Date.parse("2026-10-15T00:00:00+01:00");

/** The sampling rate at a moment: every view in the launch window, then one in ten. */
export function sampleRateAt(now: number): number {
  return now < FULL_SAMPLING_UNTIL ? 1 : SAMPLE_RATE;
}

export type VitalsRow = {
  route: string;
  metric: VitalMetric;
  value: number;
  effective_type: (typeof EFFECTIVE_TYPES)[number] | null;
  save_data: boolean;
  transfer_kb: number | null;
};

/**
 * A path, as a template from the product's own route map. V-80 fix.
 *
 * The earlier guess (an id looks like a uuid, a number or a slug with a
 * digit) kept `/u/adaokafor`, which records whose profile was read. Now the
 * path is matched against `ROUTE_PARENTS` (every route file this app has, a
 * test keeps it complete) and what is stored is the PATTERN it matched, so
 * `/u/adaokafor` is `/u/[handle]` and `/listing/3653...` is `/listing/[id]`.
 * A path the map does not know is stored as `/[other]`, never as itself.
 * Query strings and fragments are dropped before matching.
 */
export function routeTemplate(pathname: string): string {
  const path = normalisePath(pathname);
  return matchRoute(path)?.pattern ?? OTHER_ROUTE;
}

export const OTHER_ROUTE = "/[other]";

/** Read what a browser sent into rows, or null. */
export function sanitiseVitals(payload: unknown): VitalsRow[] | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.path !== "string" || !p.path.startsWith("/")) return null;
  const route = routeTemplate(p.path);
  const effective =
    typeof p.effectiveType === "string" && (EFFECTIVE_TYPES as readonly string[]).includes(p.effectiveType)
      ? (p.effectiveType as VitalsRow["effective_type"])
      : null;
  const saveData = p.saveData === true;
  const transferKb =
    typeof p.transferKb === "number" && Number.isFinite(p.transferKb) && p.transferKb >= 0 && p.transferKb < 1_000_000
      ? Math.round(p.transferKb)
      : null;
  const metrics = p.metrics && typeof p.metrics === "object" ? (p.metrics as Record<string, unknown>) : {};
  const rows: VitalsRow[] = [];
  for (const metric of VITAL_METRICS) {
    const value = metrics[metric];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value >= 600_000) continue;
    rows.push({ route, metric, value, effective_type: effective, save_data: saveData, transfer_kb: transferKb });
  }
  return rows.length > 0 ? rows : null;
}
