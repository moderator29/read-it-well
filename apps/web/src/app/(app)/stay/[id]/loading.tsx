import { Skeleton } from "@/components/ui/Skeleton";
import { panelClass } from "@/components/ui/Panel";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on a stay.
 *
 * Edge to edge at the top, because the route is one of the two `AppShell`
 * draws that way and a gutter appearing under the hero when the real gallery
 * lands would move the whole page. The 4:3 hero, the title, the headline
 * surface at the height the total occupies, and three room rows at the boxed
 * list's real geometry.
 */
export default function LoadingStay() {
  return (
    <LoadingShell label="Loading this place">
      <Skeleton radius="none" className="aspect-[4/3] w-full sm:aspect-[16/9]" />

      <div className="mx-auto max-w-2xl px-gutter pt-block">
        <Skeleton width="72%" height="1.75rem" radius="sm" />
        <Skeleton className="mt-inline-tight" width="45%" height="1rem" radius="sm" />

        <div className={panelClass({ variant: "card", className: "mt-block" })}>
          <Skeleton width="8rem" height="0.875rem" radius="sm" />
          <Skeleton className="mt-inline-tight" width="60%" height="2.5rem" radius="sm" />
          <Skeleton className="mt-inline" width="70%" height="0.90625rem" radius="sm" />
        </div>

        <Skeleton className="mt-block" width="6rem" height="1.1875rem" radius="sm" />
        <ul className={panelClass({ variant: "card", className: "mt-heading overflow-hidden px-lg sm:px-xl" })}>
          {Array.from({ length: 3 }, (_, i) => (
            <li
              key={i}
              className="flex items-start gap-sm border-t border-[var(--nf-panel-hair)] py-md first:border-t-0"
            >
              <Skeleton width="2.75rem" height="2.75rem" radius="pill" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <Skeleton width="58%" height="1rem" radius="sm" />
                <Skeleton className="mt-inline-tight" width="72%" height="0.90625rem" radius="sm" />
              </div>
              <div className="shrink-0 text-right">
                <Skeleton width="4.5rem" height="1rem" radius="sm" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </LoadingShell>
  );
}
