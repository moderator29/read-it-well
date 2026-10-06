import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/** The wait, on one passport fact: the header, the dated figure, then two short blocks. */
export default function LoadingPassportFact() {
  return (
    <LoadingShell label="Loading this part of your passport" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />
      <Skeleton height="6.5rem" radius="xl" />
      <Skeleton height="7rem" radius="lg" className="mt-block" />
      <Skeleton height="5rem" radius="lg" className="mt-block" />
    </LoadingShell>
  );
}
