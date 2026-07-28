import Link from "next/link";
import { formatMoney, type Dictionary, type Locale } from "@naijafinds/i18n";
import type { Listing } from "@/lib/listings/types";

/**
 * Mobile reserve bar.
 *
 * Lives at the end of the page flow and sticks 5rem above the viewport bottom
 * (`bottom-20`), which clears the fixed tab bar that the `(app)` shell already
 * pads for with `pb-24`. Hidden from `lg` up, where the sticky aside carries
 * the booking panel instead.
 */
export function ListingStickyBar({
  listing,
  locale,
  t,
}: {
  listing: Listing;
  locale: Locale;
  t: Dictionary;
}) {
  return (
    <div className="sticky bottom-20 z-30 mt-8 lg:hidden">
      <div className="nf-card flex items-center justify-between gap-3 p-3 pl-4">
        <p className="flex min-w-0 flex-col">
          <span className="nf-numeric truncate text-[1.0625rem] font-bold tracking-tight text-[var(--nf-content-primary)]">
            {formatMoney(listing.priceMinor, locale, listing.currency)}
          </span>
          <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
            {t.common.perNight}
          </span>
        </p>
        <Link href="/bookings" className="nf-btn nf-btn--primary shrink-0">
          Reserve
        </Link>
      </div>
    </div>
  );
}
