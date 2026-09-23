import { Skeleton } from "@/components/ui/Skeleton";
import { panelClass } from "@/components/ui/Panel";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on your booking.
 *
 * Every line of the price is read before render. This is the screen where money moves, so nothing here may arrive by pushing something else down the page.
 */
export default function LoadingCheckout() {
  return (
    <LoadingShell label="Loading your booking" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />
      <div className={panelClass({ variant: "card" })}>
        <Skeleton width="40%" height="0.8125rem" radius="sm" />
        <Skeleton className="mt-sm" height="2.25rem" radius="sm" />
        <Skeleton className="mt-md" height="3.5rem" radius="lg" />
      </div>
      <div className="space-y-sm">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className={panelClass({ variant: "card" })}>
            <Skeleton width="46%" height="1.0625rem" radius="sm" />
            <Skeleton className="mt-xs" width="30%" height="0.875rem" radius="sm" />
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
