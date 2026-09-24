import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait on the landlord's reply page, shaped like the question card it
 * becomes: an overline, a two line title, a lede, and three full-width
 * answers. The site `loading.tsx` above is shaped like prose, which is not
 * what arrives here, so this route has its own.
 */
export default function LoadingLandlordReply() {
  return (
    <LoadingShell label="Opening your question" className="nf-shell pb-section">
      <div className="mx-auto max-w-xl pt-block">
        <div className="nf-panel nf-panel--card block p-lg">
          <Skeleton width="6rem" height="0.75rem" radius="sm" />
          <Skeleton width="90%" height="2rem" radius="sm" className="mt-sm" />
          <Skeleton width="60%" height="2rem" radius="sm" className="mt-2xs" />
          <Skeleton height="1rem" radius="sm" className="mt-md" />
          <Skeleton width="80%" height="1rem" radius="sm" className="mt-2xs" />
          <div className="mt-block space-y-sm">
            <Skeleton height="3rem" radius="md" />
            <Skeleton height="3rem" radius="md" />
            <Skeleton height="3rem" radius="md" />
          </div>
        </div>
      </div>
    </LoadingShell>
  );
}
