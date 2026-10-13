import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { Skeleton } from "@/components/ui/Skeleton";
import { HostScreenSkeleton } from "@/components/host/HostScreenSkeleton";

/**
 * The wait, on the charges at the door: the heading and its lede, then the
 * five charge cards (the charge's name and the None / An amount pair), then
 * the save button.
 */
export default async function LoadingHostArrival() {
  return (
    <HostScreenSkeleton label={getDictionary(await getLocale()).experienceHost.loadingScreens.arrival}>
      <div className="mx-auto max-w-2xl" aria-hidden="true">
        <Skeleton width="13rem" height="1.75rem" radius="sm" />
        <Skeleton className="mt-xs" height="1rem" radius="sm" />
        <Skeleton className="mt-2xs" width="75%" height="1rem" radius="sm" />
        <div className="mt-lg grid gap-md">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="nf-panel nf-panel--card block p-md">
              <Skeleton width="45%" height="1rem" radius="sm" />
              <div className="mt-sm flex gap-sm">
                <Skeleton width="5rem" height="2.75rem" radius="md" />
                <Skeleton width="7rem" height="2.75rem" radius="md" />
              </div>
            </div>
          ))}
          <Skeleton height="3rem" radius="pill" />
        </div>
      </div>
    </HostScreenSkeleton>
  );
}
