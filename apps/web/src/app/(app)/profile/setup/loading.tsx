import { Skeleton } from "@/components/ui/Skeleton";
import { CardRowsSkeleton, LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * Adding a workspace, while it loads.
 *
 * PERF-SWEEP 7: this route and its role steps inherited `/profile`'s
 * skeleton (a cover and a face), then redrew themselves as a back control
 * above a list of choices. This is that shape: the 40px back square with
 * its `pb-sm`, then the choice cards.
 */
export default function LoadingSetup() {
  return (
    <LoadingShell label="Loading" className="mx-auto w-full max-w-2xl">
      <div className="pb-sm">
        <Skeleton width="2.5rem" height="2.5rem" radius="md" />
      </div>
      <CardRowsSkeleton rows={3} />
    </LoadingShell>
  );
}
