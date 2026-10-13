import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { Skeleton } from "@/components/ui/Skeleton";
import { HostScreenSkeleton } from "@/components/host/HostScreenSkeleton";

/**
 * The wait, on the workspace assistant, in the shape `/agent/assistant`'s
 * wait already draws: the workspace line with history and settings, the empty
 * thread, the suggestions, and the composer at the foot where the real one is
 * pinned.
 */
export default async function LoadingHostAssistant() {
  return (
    <HostScreenSkeleton label={getDictionary(await getLocale()).experienceHost.loadingScreens.assistant}>
      <div className="flex min-h-[calc(100dvh-9rem)] flex-col" aria-hidden="true">
        <div className="flex items-start justify-between gap-md border-b border-[var(--nf-border-subtle)] pb-sm">
          <div className="min-w-0 flex-1">
            <Skeleton width="80%" height="0.875rem" radius="sm" />
            <Skeleton className="mt-2xs" width="45%" height="0.875rem" radius="sm" />
          </div>
          <div className="flex shrink-0 gap-xs">
            <Skeleton circle width="2.75rem" />
            <Skeleton circle width="2.75rem" />
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex gap-xs overflow-hidden">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="15rem" height="3.25rem" radius="md" className="shrink-0" />
          ))}
        </div>
        <div className="mt-sm flex items-center gap-xs">
          <Skeleton height="3.5rem" radius="md" className="min-w-0 flex-1" />
          <Skeleton circle width="3.5rem" className="shrink-0" />
        </div>
      </div>
    </HostScreenSkeleton>
  );
}
