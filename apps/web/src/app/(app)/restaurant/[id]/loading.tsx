import { Skeleton } from "@/components/ui/Skeleton";
import { panelClass } from "@/components/ui/Panel";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on a restaurant.
 *
 * The hero, the name, the per-head line, then the reservation block at the
 * height the real form occupies: a date row, a time row, a party row and the
 * 56px control. The reservation is the first thing on this screen, so it is
 * the first thing reserved here; a form that arrives and pushes the page is
 * the one shift that matters on a surface whose whole job is one tap.
 */
export default function LoadingRestaurant() {
  return (
    <LoadingShell label="Loading this restaurant">
      <Skeleton radius="none" className="aspect-[4/3] w-full sm:aspect-[16/9]" />

      <div className="mx-auto max-w-2xl px-gutter pt-block">
        <Skeleton width="66%" height="1.75rem" radius="sm" />
        <Skeleton className="mt-inline-tight" width="42%" height="1rem" radius="sm" />
        <Skeleton className="mt-inline" width="30%" height="1.4375rem" radius="sm" />

        <Skeleton className="mt-block" width="8rem" height="1.1875rem" radius="sm" />
        <Skeleton className="mt-row" width="88%" height="0.9375rem" radius="sm" />
        <div className={panelClass({ variant: "card", className: "mt-heading" })}>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className={i === 0 ? "" : "mt-row"}>
              <Skeleton width="6rem" height="0.875rem" radius="sm" />
              <Skeleton className="mt-2xs" height="3rem" radius="lg" />
            </div>
          ))}
          <Skeleton className="mt-block" height="3.5rem" radius="lg" />
        </div>

        <Skeleton className="mt-block" width="9rem" height="1.1875rem" radius="sm" />
        <div className={panelClass({ variant: "card", className: "mt-heading" })}>
          <Skeleton width="92%" height="1rem" radius="sm" />
          <Skeleton className="mt-inline-tight" width="70%" height="1rem" radius="sm" />
        </div>
      </div>
    </LoadingShell>
  );
}
