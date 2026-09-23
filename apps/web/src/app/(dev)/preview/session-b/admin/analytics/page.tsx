// Admin console fixture harness, behind the preview gate. Real AnalyticsView on fixture props.
import { AnalyticsView } from "@/app/admin/analytics/AnalyticsView";
import { Frame } from "../frame";

export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const live = (await searchParams).state === "live";
  const supply = Array.from({ length: 30 }, (_, i) => ({ start: new Date(Date.UTC(2026, 7, 25 + i)).toISOString().slice(0, 10), listings: live ? 0 : [2, 3, 1, 4, 5, 3, 6, 4, 5, 7, 6, 8, 7, 9, 6, 8, 10, 9, 11, 10, 12, 11, 13, 12, 14, 13, 15, 14, 16, 18][i]! }));
  return (
    <Frame>
      <AnalyticsView
        locale="en"
        range="30d"
        bookings={live ? { successful: 0, successfulPrev: 0 } : { successful: 3892, successfulPrev: 3355 }}
        supply={supply}
        demand={
          live
            ? { buckets: supply.map((b) => ({ start: b.start, checks: 0, answered: 0 })), checks: 0, checksPrev: 0, answered: 0, refused: 0, topAreas: [], refusals: [] }
            : {
                buckets: supply.map((b, i) => ({ start: b.start, checks: 20 + i * 3, answered: 12 + i * 2 })),
                checks: 1965,
                checksPrev: 1610,
                answered: 1275,
                refused: 690,
                topAreas: [
                  { area: "Eti-Osa", state: "LA", checks: 612 },
                  { area: "Ikeja", state: "LA", checks: 431 },
                  { area: "Bwari", state: "FC", checks: 280 },
                  { area: "Surulere", state: "LA", checks: 204 },
                  { area: "Yaba", state: "LA", checks: 171 },
                ],
                refusals: [
                  { code: "too_few_comparables", count: 240 },
                  { code: "wide_dispersion", count: 181 },
                  { code: "no_location", count: 122 },
                  { code: "unsupported_type", count: 91 },
                  { code: "stale", count: 56 },
                ],
              }
        }
        thin={live ? { rows: [] } : { rows: [{ area: "Bwari", city: "Abuja", count: 12 }, { area: "Gwarinpa", city: "Abuja", count: 18 }, { area: "Surulere", city: "Lagos", count: 24 }, { area: "Yaba", city: "Lagos", count: 31 }, { area: "Kubwa", city: "Abuja", count: 36 }] }}
      />
    </Frame>
  );
}
