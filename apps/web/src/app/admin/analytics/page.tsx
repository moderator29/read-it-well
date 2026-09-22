import { getLocale } from "@/lib/locale";
import { getBookingOutcomes, getSupplySeries, getThinAreas } from "@/lib/admin/reads/analytics";
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
  const [bookings, supply, thin] = await Promise.all([
    getBookingOutcomes(range, now),
    getSupplySeries(range, now),
    getThinAreas(5),
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
      />
    </>
  );
}
