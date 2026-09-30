"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { panelClass } from "@/components/ui/Panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { handoffFor } from "@/lib/listings/handoff";

/**
 * THE LISTING IN ONE FRAME (recommendation B4, 30 September 2026).
 *
 * The listing route's loading state. When the tap came from a card on this
 * tab, the card left its facts in `lib/listings/handoff.ts`; this paints them
 * straight away in the real page's own boxes:
 *
 *   - the gallery's lead pane, at the gallery's aspect at every breakpoint
 *     (4:3, 16:9 from sm, 2:1 from lg), with the photo the card had already
 *     drawn (the browser has it, so nothing is downloaded twice) and the
 *     same view-transition name the card's morph aims at;
 *   - the lead card overlapping the photo's lower edge, with the title in
 *     the page's `nf-h2`, the place line and the card's price line.
 *
 * The rest of the page keeps its skeleton, so the real page streams in over
 * this with the photo and title where they already were. A cold open (a
 * shared link, a refresh) has no handoff and renders `fallback`, the route's
 * ordinary skeleton. Every string here is one the card printed.
 */
export function ListingHandoffShell({ fallback, exampleLabel, verifiedLabel }: {
  fallback: ReactNode;
  exampleLabel: string;
  verifiedLabel: string;
}) {
  const params = useParams<{ id?: string }>();
  const hit = handoffFor(typeof params?.id === "string" ? params.id : null);
  if (!hit) return <>{fallback}</>;

  return (
    <div className="nf-cat-surface mx-auto max-w-5xl" data-testid="listing-handoff" aria-busy="true">
      <div className="relative -mx-gutter -mt-xl sm:-mt-2xl">
        <div
          className="nf-handoff__pane relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/9] lg:aspect-[2/1]"
          style={{ viewTransitionName: `listing-photo-${hit.id}` }}
        >
          {hit.drawn ? (
            // eslint-disable-next-line @next/next/no-img-element -- the exact URL the card drew, already cached; an optimiser URL would be a second download
            <img src={hit.drawn} alt="" className="h-full w-full object-cover" decoding="sync" />
          ) : (
            <Skeleton radius="none" className="h-full w-full" />
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 [background-image:var(--nf-scrim-media)]" />
          {hit.mark ? (
            <p className="nf-gallery-marks">
              <span
                className={`nf-badge ${hit.mark === "example" ? "nf-badge--example" : "nf-badge--verified"} nf-gallery-mark`}
              >
                {hit.mark === "example" ? exampleLabel : verifiedLabel}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="relative z-10 -mt-xl sm:-mt-2xl">
        <div className="grid gap-xl lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
          <div className="min-w-0">
            <section className={panelClass({ variant: "card", className: "nf-detail-lead" })}>
              <h1 className="nf-h2 mt-row [overflow-wrap:anywhere]">{hit.title}</h1>
              <p className="mt-inline-tight inline-flex max-w-full items-center gap-inline nf-body text-[var(--nf-content-secondary)]">
                <UiIcon name="location" size={20} className="shrink-0 text-[var(--nf-brand-secondary)]" />
                <span className="min-w-0">{hit.place}</span>
              </p>
              {hit.price ? (
                <p className="nf-handoff__price mt-md">
                  <span className="nf-numeric">{hit.price}</span>
                  {hit.priceNote ? <span className="nf-handoff__note"> {hit.priceNote}</span> : null}
                </p>
              ) : null}
              <div className="mt-lg space-y-xs" aria-hidden="true">
                <Skeleton height="0.875rem" radius="sm" />
                <Skeleton width="72%" height="0.875rem" radius="sm" />
              </div>
            </section>
          </div>
          <aside className={panelClass({ className: "hidden p-lg lg:block" })} aria-hidden="true">
            <Skeleton width="60%" height="1.5rem" radius="sm" />
            <Skeleton className="mt-md" height="3rem" radius="sm" />
            <Skeleton className="mt-md" height="3.5rem" radius="sm" />
          </aside>
        </div>
      </div>
    </div>
  );
}
