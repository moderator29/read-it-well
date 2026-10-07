import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";
import { panelClass } from "@/components/ui/Panel";
import { iconPlateClass } from "@/components/ui/IconPlate";
import "@/app/css/home.css";

/**
 * The wait, on home.
 *
 * The `(app)` layout owns the rail, the tab bar and the top bar, so they are
 * already on screen when this renders: only the page's own content is
 * outstanding, which is why there is no chrome here.
 *
 * Home awaits the recommended listings before it can render its greeting, so
 * the whole screen waits on a database round trip. The shapes reserved are
 * the screen's own, in its order and on its own materials (the platform
 * sweep, 23 September): the greeting, the location chip and the hero on the
 * shared panel, the four category plates on the shared icon plate, then the
 * featured row at `ListingCard`'s proportions on the panel card. A skeleton
 * that does not match its screen teaches the eye the wrong shape and then
 * corrects it.
 */
export default function LoadingHome() {
  return (
    <LoadingShell label="Loading your home screen">
      <section>
        <Skeleton width="7rem" height="1rem" radius="sm" />
        <Skeleton className="mt-inline-tight" width="10rem" height="2.25rem" radius="sm" />
        <div className={panelClass({ variant: "card", className: "mt-md h-[3.25rem]" })} />
      </section>

      <div className={panelClass({ className: "mt-md h-64" })}>
        <Skeleton className="mt-auto" height="3.25rem" radius="sm" />
      </div>

      <div className="nf-cat-row mt-md">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="nf-cat-tile">
            <span className={iconPlateClass({ size: "lg", className: "nf-cat-tile__plate" })} />
            <Skeleton width="3rem" height="0.875rem" radius="sm" />
          </div>
        ))}
      </div>

      <div className="mt-section-tight">
        <Skeleton width="13rem" height="1.5rem" radius="sm" />
        {/* The featured stack's shape: one tall card with the next peeking. */}
        <div className="nf-stack">
          <div className="nf-stack__stage" aria-hidden="true">
            <div className="nf-stack__card" data-role="next" />
            <div className="nf-stack__card" data-role="front">
              <Skeleton className="h-full w-full" radius="none" />
            </div>
          </div>
        </div>
      </div>
    </LoadingShell>
  );
}
