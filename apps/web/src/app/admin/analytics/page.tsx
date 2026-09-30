import { getLocale } from "@/lib/locale";
import { readInternalIds } from "@/lib/admin/internal-accounts";
import { getSendBackReasons } from "@/lib/admin/reads/review-reasons";
import { getBookingOutcomes, getPriceCheckDemand, getSupplySeries, getThinAreas } from "@/lib/admin/reads/analytics";
import type { CollectedRange } from "@/lib/admin/reads/shapes";
import { LiveRefresh } from "../_components/LiveRefresh";
import { AnalyticsView } from "./AnalyticsView";

export const dynamic = "force-dynamic";

const RANGES: readonly CollectedRange[] = ["30d", "90d", "12m"];

function requestTime(): number {
  return Date.now();
}

/**
 * Analytics. Reads under the admin gate, through the operator's own session:
 * `getBookingOutcomes`, `getSupplySeries` and `getThinAreas`
 * (`lib/admin/reads/analytics.ts`). Everything the platform does not record
 * is marked as such on the page, with its request.
 */
export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const locale = await getLocale();
  const params = await searchParams;
  const range = RANGES.find((r) => r === params.range) ?? "30d";
  const now = requestTime();
  const [bookings, supply, thin, demand, internal, reasons] = await Promise.all([
    getBookingOutcomes(range, now),
    getSupplySeries(range, now),
    getThinAreas(5),
    getPriceCheckDemand(range, now),
    readInternalIds(),
    getSendBackReasons(now),
  ]);
  return (
    <>
      <LiveRefresh />
      <AnalyticsView
        locale={locale}
        range={range}
        bookings={bookings.state === "ok" ? bookings.data : null}
        supply={supply.state === "ok" ? supply.data : null}
        thin={thin.state === "ok" ? thin.data : null}
        demand={demand.state === "ok" ? demand.data : null}
      />
      {/* C8: why listings were sent back, counted from the reason codes. */}
      {reasons.state === "ok" && reasons.data.some((r) => r.count > 0) ? (
        <section className="nf-panel nf-panel--card mt-block p-card" aria-labelledby="sendback-title">
          <h2 id="sendback-title" className="nf-h3">
            Why listings were sent back, last 30 days
          </h2>
          <ul className="nf-body-sm mt-xs grid gap-2xs">
            {reasons.data
              .filter((r) => r.count > 0)
              .map((r) => (
                <li key={r.code} className="flex justify-between gap-md">
                  <span>{r.label}</span>
                  <span className="nf-numeric font-semibold">{r.count}</span>
                </li>
              ))}
          </ul>
          <p className="nf-caption mt-xs">Counted since reason codes began on 30 September 2026. A review can carry several.</p>
        </section>
      ) : null}
      {/* C10: the figures above leave these accounts out; the count is read, not assumed. */}
      <p className="nf-caption mt-block">
        Internal activity excluded: {internal.length} {internal.length === 1 ? "account" : "accounts"} (QA, staff and
        anyone marked on the staff page). Example listings are left out as well.
      </p>
    </>
  );
}
