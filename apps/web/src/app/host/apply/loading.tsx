import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { Skeleton } from "@/components/ui/Skeleton";
import { HostScreenSkeleton } from "@/components/host/HostScreenSkeleton";

/**
 * The wait, on the application: one question in display type and its line,
 * the folded step list, three choice cards, and Continue at the foot.
 */
export default async function LoadingHostApply() {
  return (
    <HostScreenSkeleton label={getDictionary(await getLocale()).experienceHost.loadingScreens.apply}>
      <div aria-hidden="true">
        <Skeleton width="80%" height="1.75rem" radius="sm" />
        <Skeleton className="mt-xs" width="65%" height="1rem" radius="sm" />
        <Skeleton className="mt-md" height="4.5rem" radius="lg" />
        <div className="mt-md grid gap-sm">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} height="6rem" radius="lg" />
          ))}
        </div>
        <Skeleton className="mt-lg" height="3.25rem" radius="pill" />
      </div>
    </HostScreenSkeleton>
  );
}
