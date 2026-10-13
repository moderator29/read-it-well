import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { VisitsDesk } from "@/app/admin/bookings/visits/VisitsDesk";
import { narrowVisits, readVisitQuery } from "@/lib/admin/reads/visits-model";
import { ConsoleFrame } from "../../bd/ConsoleFrame";
import { ADMIN_ROWS, FIXTURE_ID, TODAY } from "../fixtures";

/**
 * Bookings > Visits on the console frame, from fixture rows on the pinned
 * Tuesday 13 October 2026. The desk is `VisitsDesk` itself, fed what
 * `getVisitCalendar` would return; the query string drives it exactly as on
 * the real desk (`?view=month`, `?visit=<id>`, `?state=done`). `?empty=1`
 * draws a range with no visits.
 */
export const dynamic = "force-dynamic";

export default async function PreviewAdminVisits({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const query = readVisitQuery(params, TODAY);
  const all = params.empty === "1" ? [] : ADMIN_ROWS;
  const rows = narrowVisits(all, query);
  const open = query.visit ? rows.find((row) => row.id === query.visit) : undefined;
  const detail = open
    ? {
        reminders:
          open.id === FIXTURE_ID(1)
            ? [
                { audience: "renter" as const, stage: "eve" as const, slotAt: open.at, sentAt: "2026-10-12T18:07:00Z" },
                { audience: "lister" as const, stage: "eve" as const, slotAt: open.at, sentAt: "2026-10-12T18:07:00Z" },
                { audience: "renter" as const, stage: "soon" as const, slotAt: open.at, sentAt: "2026-10-13T07:07:00Z" },
                { audience: "lister" as const, stage: "soon" as const, slotAt: open.at, sentAt: "2026-10-13T07:07:00Z" },
              ]
            : [],
        noShows:
          open.state === "NO_SHOW"
            ? [{ absentRole: "requester" as const, reportedAt: "2026-10-09T11:30:00Z", disputedAt: null, resolvedAt: null, resolution: null }]
            : [],
      }
    : null;
  return (
    <ConsoleFrame t={t}>
      <VisitsDesk
        query={query}
        today={TODAY}
        read={{
          state: "ok",
          data: {
            rows,
            inRange: all.length,
            cities: [...new Set(all.map((row) => row.city).filter((c): c is string => !!c))].sort(),
            listers: [...new Map(all.map((row) => [row.listerId, row.listerName ?? ""])).entries()].map(([id, name]) => ({ id, name })),
          },
        }}
        detail={detail}
        copy={t.visitOps}
        locale={locale}
      />
    </ConsoleFrame>
  );
}
