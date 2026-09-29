import { Skeleton } from "@/components/ui/Skeleton";
import { CardRowsSkeleton, LoadingShell, TitleBlockSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, across the host workspace (SPEED-2).
 *
 * No host route had a `loading.tsx`, and `HostShell` renders inside each page
 * after an identity read, so a host screen showed the ROOT boundary (the
 * landing hero) and then the whole workspace arrived at once. This draws the
 * same frame `HostShell` does, from the same classes: `nf-host`, the sticky
 * glass workspace bar at the header height, and `nf-host__body` (40rem wide,
 * the shell's own padding), with a title block and rows inside it.
 */
export default function LoadingHost() {
  return (
    <div className="nf-host">
      <header className="nf-ws-bar nf-glass nf-glass--chrome nf-safe-top sticky top-0 z-40">
        <div className="nf-ws-bar__row">
          <Skeleton circle width="2.25rem" className="shrink-0" />
          <Skeleton width="8rem" height="1rem" radius="sm" className="max-w-[40%]" />
        </div>
      </header>
      <LoadingShell label="Loading" className="nf-host__body">
        <TitleBlockSkeleton className="mb-lg" />
        <CardRowsSkeleton rows={3} />
      </LoadingShell>
    </div>
  );
}
