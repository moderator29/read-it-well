import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { Skeleton } from "@/components/ui/Skeleton";
import { HostScreenSkeleton } from "@/components/host/HostScreenSkeleton";
import "@/app/host/host-desk.css";

/**
 * The wait, on a month's payout statement.
 *
 * `StatementView`: the month bar (back, the month, forward), then the paper
 * sheet with its label, month, the share figure and the four totals rows,
 * then the payment lines, then the two actions under the sheet. Without this
 * the statement borrowed the earnings list's wait, a list where a document
 * arrives.
 */
export default async function LoadingHostStatement() {
  return (
    <HostScreenSkeleton label={getDictionary(await getLocale()).experienceHost.loadingScreens.statement} wide>
      <div className="mx-auto grid max-w-2xl gap-md" aria-hidden="true">
        <div className="flex items-center justify-between gap-sm">
          <Skeleton circle width="2.75rem" className="shrink-0" />
          <Skeleton width="10rem" height="1.25rem" radius="sm" />
          <Skeleton circle width="2.75rem" className="shrink-0" />
        </div>
        <div className="nf-panel nf-panel--card block p-lg">
          <Skeleton width="7rem" height="0.875rem" radius="sm" />
          <Skeleton className="mt-xs" width="11rem" height="1.25rem" radius="sm" />
          <Skeleton className="mt-xs" width="12rem" height="2.5rem" radius="sm" />
          <div className="mt-md grid gap-sm">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex justify-between gap-md">
                <Skeleton width="40%" height="1rem" radius="sm" />
                <Skeleton width="5rem" height="1rem" radius="sm" />
              </div>
            ))}
          </div>
          <div className="mt-lg grid gap-sm">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} height="7rem" radius="lg" />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-sm">
          <Skeleton width="11rem" height="2.75rem" radius="pill" />
          <Skeleton width="13rem" height="2.75rem" radius="pill" />
        </div>
      </div>
    </HostScreenSkeleton>
  );
}
