import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { Skeleton } from "@/components/ui/Skeleton";
import { HostScreenSkeleton } from "@/components/host/HostScreenSkeleton";
import "@/app/host/host-desk.css";

/**
 * The wait, on room bookings: the heading and its two-sentence lede, a
 * section heading, then request cards (the room line with its clock, the
 * dates line, the guest and total line, and the Accept and Decline pair).
 */
export default async function LoadingHostBookings() {
  return (
    <HostScreenSkeleton label={getDictionary(await getLocale()).experienceHost.loadingScreens.bookings}>
      <div className="mx-auto max-w-2xl" aria-hidden="true">
        <Skeleton width="12rem" height="1.75rem" radius="sm" />
        <Skeleton className="mt-xs" height="1rem" radius="sm" />
        <Skeleton className="mt-2xs mb-block" width="70%" height="1rem" radius="sm" />
        <Skeleton width="9rem" height="1.25rem" radius="sm" />
        <ul className="mt-xs grid gap-xs">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="nf-panel nf-panel--card block p-card">
              <div className="flex items-start justify-between gap-sm">
                <Skeleton width="65%" height="1.0625rem" radius="sm" />
                <Skeleton width="5rem" height="1.5rem" radius="pill" className="shrink-0" />
              </div>
              <Skeleton className="mt-2xs" width="75%" height="0.875rem" radius="sm" />
              <Skeleton className="mt-2xs" width="50%" height="0.875rem" radius="sm" />
              <div className="mt-xs flex gap-xs">
                <Skeleton width="6.5rem" height="2.75rem" radius="pill" />
                <Skeleton width="6.5rem" height="2.75rem" radius="pill" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </HostScreenSkeleton>
  );
}
