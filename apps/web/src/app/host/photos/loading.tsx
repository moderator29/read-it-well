import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { Skeleton } from "@/components/ui/Skeleton";
import { HostHeadSkeleton, HostScreenSkeleton } from "@/components/host/HostScreenSkeleton";

/**
 * The wait, on the photographs: the head and its count line, then the
 * manager's card (title, guidance, the cover rule, a two-column grid of
 * tiles each with its label and Take down, and the dashed add target).
 */
export default async function LoadingHostPhotos() {
  return (
    <HostScreenSkeleton label={getDictionary(await getLocale()).experienceHost.loadingScreens.photos}>
      <HostHeadSkeleton />
      <div className="nf-panel nf-panel--card mt-block block p-card" aria-hidden="true">
        <Skeleton width="55%" height="1.125rem" radius="sm" />
        <Skeleton className="mt-xs" height="0.875rem" radius="sm" />
        <Skeleton className="mt-2xs" width="80%" height="0.875rem" radius="sm" />
        <div className="mt-md grid grid-cols-2 gap-sm">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="grid gap-xs">
              <Skeleton height="8rem" radius="lg" />
              <Skeleton width="50%" height="0.75rem" radius="sm" />
              <Skeleton height="2.75rem" radius="pill" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-md" height="4.5rem" radius="lg" />
      </div>
    </HostScreenSkeleton>
  );
}
