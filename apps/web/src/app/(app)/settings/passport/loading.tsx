import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on the renter passport: the header, the explanation plate, the
 * credential Island, the facts rows and the switch row, in the order and at the
 * heights they land.
 */
export default function LoadingPassport() {
  return (
    <LoadingShell label="Loading your renter passport" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />
      <Skeleton height="4.5rem" radius="lg" className="mb-md" />
      <Skeleton height="9rem" radius="xl" />
      <div className="nf-panel nf-panel--card mt-block grid gap-md p-card">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} width={`${90 - i * 8}%`} height="1.25rem" radius="sm" />
        ))}
      </div>
      <Skeleton height="3.5rem" radius="lg" className="mt-block" />
    </LoadingShell>
  );
}
