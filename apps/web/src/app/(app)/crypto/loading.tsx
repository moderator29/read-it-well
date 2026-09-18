import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/** The wait, on the market surface: the header, the search, the overview. */
export default function LoadingCrypto() {
  return (
    <LoadingShell label="Loading market prices" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton subtitle />
      <Skeleton height="3rem" radius="lg" />
      <div className="nf-card mt-group p-card-sm">
        <Skeleton width="9rem" height="1.25rem" radius="sm" />
        <div className="nf-coin-rail mt-row">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} width="9.25rem" height="9rem" radius="xl" className="shrink-0" />
          ))}
        </div>
      </div>
    </LoadingShell>
  );
}
