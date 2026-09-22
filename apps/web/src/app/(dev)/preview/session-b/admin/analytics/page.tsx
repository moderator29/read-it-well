// Session B admin-shell fixture harness (R-G), behind the preview gate. Real AnalyticsView on fixture props.
import { AnalyticsView } from "@/app/admin/analytics/AnalyticsView";
import { Frame } from "../frame";

export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const live = (await searchParams).state === "live";
  const supply = Array.from({ length: 30 }, (_, i) => ({ start: `2026-09-${String(1 + (i % 28)).padStart(2, "0")}`, listings: live ? 0 : [2, 3, 1, 4, 5, 3, 6, 4, 5, 7, 6, 8, 7, 9, 6, 8, 10, 9, 11, 10, 12, 11, 13, 12, 14, 13, 15, 14, 16, 18][i]! }));
  return (
    <Frame>
      <AnalyticsView
        locale="en"
        range="30d"
        bookings={live ? { successful: 0, successfulPrev: 0 } : { successful: 3892, successfulPrev: 3355 }}
        supply={supply}
        thin={live ? { rows: [] } : { rows: [{ area: "Bwari", city: "Abuja", count: 12 }, { area: "Gwarinpa", city: "Abuja", count: 18 }, { area: "Surulere", city: "Lagos", count: 24 }, { area: "Yaba", city: "Lagos", count: 31 }, { area: "Kubwa", city: "Abuja", count: 36 }] }}
      />
    </Frame>
  );
}
