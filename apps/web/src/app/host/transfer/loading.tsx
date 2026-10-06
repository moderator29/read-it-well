import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { Skeleton } from "@/components/ui/Skeleton";
import { HostHeadSkeleton, HostScreenSkeleton } from "@/components/host/HostScreenSkeleton";

/**
 * The wait, on the hand-over desk: the head and its line, then a section
 * heading with its description and a boxed list of businesses, each with its
 * name, kind, state and the two doors (Hand it over, Close it).
 */
export default async function LoadingHostTransfer() {
  return (
    <HostScreenSkeleton label={getDictionary(await getLocale()).experienceHost.loadingScreens.transfer}>
      <HostHeadSkeleton />
      <div className="mt-block" aria-hidden="true">
        <Skeleton width="10rem" height="1.375rem" radius="sm" />
        <Skeleton className="mt-xs" height="1rem" radius="sm" />
        <Skeleton className="mt-2xs" width="60%" height="1rem" radius="sm" />
        <div className="nf-panel nf-panel--card mt-md block p-md">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className={i ? "mt-md border-t border-[var(--nf-divider)] pt-md" : undefined}>
              <Skeleton width="55%" height="1.0625rem" radius="sm" />
              <Skeleton className="mt-2xs" width="35%" height="0.875rem" radius="sm" />
              <div className="mt-sm grid gap-sm sm:grid-cols-2">
                <Skeleton height="2.75rem" radius="pill" />
                <Skeleton height="2.75rem" radius="pill" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </HostScreenSkeleton>
  );
}
