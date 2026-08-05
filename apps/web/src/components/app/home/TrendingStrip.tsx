import Link from "next/link";
import type { TrendingItem } from "@/lib/app/home-queries";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * What people are actually reading, in the reader's own city.
 *
 * A thumbnail, one line of copy, and a way through. Stories carry their own
 * picture; a gist does not, so it gets the place mark from the commissioned
 * pack instead of an empty grey square. Every row is a link to a real screen.
 *
 * The empty state is designed rather than hidden, because a city with nothing
 * in it yet is a real state on a young platform and pretending otherwise is how
 * a product ends up shipping invented content.
 */
export function TrendingStrip({
  items,
  cityLabel,
  hasPlaces,
}: {
  items: TrendingItem[];
  cityLabel: string;
  hasPlaces: boolean;
}) {
  return (
    <section aria-labelledby="trending-heading">
      <div className="mb-3 flex items-end justify-between gap-4">
        <h2 id="trending-heading" className="nf-h3">
          Trending in {cityLabel ? cityLabel : "your city"}
        </h2>
        {/* The directory. The word beside it is "All places", and `/around` is
            the feed of the places somebody is already in, which is a different
            promise. */}
        {hasPlaces && (
          <Link
            href="/around/manage"
            className="shrink-0 text-[0.8125rem] font-semibold text-[var(--nf-electric-300)] underline-offset-4 hover:underline"
          >
            All places
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="nf-card flex items-center gap-4 p-4 sm:p-5">
          <span className="block h-12 w-12 shrink-0">
            <BrandIcon name="chat-duo" fill />
          </span>
          <div className="min-w-0">
            <p className="text-[0.9375rem] font-semibold">Nothing is trending yet</p>
            <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
              {hasPlaces
                ? "Be the first to say something in one of the places above."
                : "Once a place opens near you, what people are saying appears here."}
            </p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="nf-card nf-card--interactive flex items-center gap-3.5 p-3 sm:p-3.5"
              >
                <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-[var(--nf-radius-md)] bg-[var(--nf-surface-elevated)]">
                  {item.imageUrl ? (
                    /* Private object, read through a short-lived signed URL, so
                       next/image would only add a second hop to a URL that has
                       already expired by the time it is cached. */
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center p-2.5">
                      <BrandIcon name="pin-map" fill />
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[var(--nf-content-muted)]">
                    {item.kindLabel}
                    {item.placeLabel && (
                      <>
                        <span aria-hidden="true">&middot;</span>
                        <span className="truncate normal-case tracking-normal">
                          {item.placeLabel}
                        </span>
                      </>
                    )}
                  </span>
                  <span className="mt-1 block text-[0.9375rem] font-semibold leading-snug text-[var(--nf-content-primary)]">
                    {item.headline}
                  </span>
                </span>

                <UiIcon
                  name="chevron-down"
                  size={20}
                  className="shrink-0 -rotate-90 text-[var(--nf-content-muted)]"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
