import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/** The wait, on the renter passport: a header, the switch and five lines. */
export default function LoadingPassport() {
  return (
    <LoadingShell label="Loading your renter passport" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />
      <Skeleton width="100%" height="2.75rem" radius="sm" />
      <div className="nf-panel nf-panel--card mt-block grid gap-md p-card">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} width={`${85 - i * 9}%`} height="1rem" radius="sm" />
        ))}
      </div>
    </LoadingShell>
  );
}
