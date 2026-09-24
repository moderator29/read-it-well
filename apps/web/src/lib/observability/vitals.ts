/**
 * FIELD SPEED, SCRUBBED BEFORE IT IS STORED. V-80.
 *
 * Pure functions shared by the reporter (`components/app/VitalsReporter.tsx`)
 * and the ingest (`app/api/vitals/route.ts`). The ingest trusts nothing the
 * browser sent: every value is re-checked here, the path is reduced to a
 * route TEMPLATE (an id is never stored), and a sample that cannot be read is
 * dropped rather than half-stored.
 */

export const VITAL_METRICS = ["LCP", "INP", "CLS", "FCP", "TTFB"] as const;
export type VitalMetric = (typeof VITAL_METRICS)[number];
export const EFFECTIVE_TYPES = ["slow-2g", "2g", "3g", "4g"] as const;

/** One page view in ten reports. Decided once per page load. */
export const SAMPLE_RATE = 0.1;

export type VitalsRow = {
  route: string;
  metric: VitalMetric;
  value: number;
  effective_type: (typeof EFFECTIVE_TYPES)[number] | null;
  save_data: boolean;
  transfer_kb: number | null;
};

/* A uuid, a number, or anything six long or more that carries a digit
   (a reference code, a slug with a number in it). Words alone are routes. */
const ID_SEGMENT = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+|(?=[a-z0-9-]*\d)[a-z0-9-]{6,})$/i;

/**
 * A path, as a template: `/listing/3653d202-...` becomes `/listing/[id]`.
 * Query strings and fragments are dropped. Anything that looks like an id
 * (a uuid, a number, a long code, a slug with digits in it) becomes `[id]`,
 * because a route template is a fact about the product and an id is a fact
 * about somebody.
 */
export function routeTemplate(pathname: string): string {
  const path = pathname.split(/[?#]/)[0] ?? "/";
  const segments = path.split("/").filter((s) => s.length > 0).slice(0, 6);
  const out = segments.map((s) => (ID_SEGMENT.test(s) ? "[id]" : s.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "[id]"));
  return `/${out.join("/")}`.slice(0, 120);
}

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
