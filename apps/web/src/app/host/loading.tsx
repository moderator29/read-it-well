import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { CardRowsSkeleton, TitleBlockSkeleton } from "@/components/app/ScreenSkeleton";
import { HostScreenSkeleton } from "@/components/host/HostScreenSkeleton";

/**
 * The wait, across the host workspace (SPEED-2).
 *
 * No host route had a `loading.tsx`, and `HostShell` renders inside each page
 * after an identity read, so a host screen showed the ROOT boundary (the
 * landing hero) and then the whole workspace arrived at once. This draws the
 * same frame `HostShell` does (`HostScreenSkeleton`: the desk sidebar from
 * 1024px, the workspace bar with its chips, `nf-host__body`), with a title
 * block and rows inside it. The busier host screens (calendar, decide,
 * reviews, earnings, tables, rooms) carry their own shaped files.
 */
export default async function LoadingHost() {
  const label = getDictionary(await getLocale()).hostWorkspace.loading;
  return (
    <HostScreenSkeleton label={label}>
      <TitleBlockSkeleton className="mb-lg" />
      <CardRowsSkeleton rows={3} />
    </HostScreenSkeleton>
  );
}
