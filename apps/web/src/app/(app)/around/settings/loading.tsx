/**
 * The wait, on the directory of places.
 *
 * `/around/settings` is force-dynamic and makes five reads before it can render a
 * word, because membership is per viewer and the page changes shape when you
 * join one. On a slow Nigerian connection Next holds the previous screen for
 * that whole time, so a tap on Manage places looks like a tap that did nothing.
 *
 * The real layout rather than a spinner, so nothing jumps when the data lands.
 */
import { Skeleton } from "@/components/ui/Skeleton";
import { State } from "@/components/ui/State";

export default function LoadingAroundManage() {
  return (
    <State kind="loading" title="Loading places" className="mx-auto w-full max-w-3xl pb-4xl pt-md">

      <div className="mb-lg space-y-sm" aria-hidden="true">
        <Skeleton width="8rem" height="1.75rem" radius="xs" />
        <Skeleton width="80%" height="0.75rem" radius="xs" />
      </div>

      <Skeleton className="mb-sm" width="6rem" height="0.75rem" radius="xs" />
      <ul className="flex flex-col gap-xs" aria-hidden="true">
        {[0, 1, 2, 3].map((row) => (
          <li key={row} className="nf-panel nf-panel--card flex-row items-start gap-sm p-md">
            <div className="min-w-0 flex-1 space-y-xs">
              <Skeleton width="10rem" height="1rem" radius="xs" />
              <Skeleton width="14rem" height="0.75rem" radius="xs" />
            </div>
            <Skeleton width="5rem" height="2.25rem" radius="md" />
          </li>
        ))}
      </ul>
    </State>
  );
}
