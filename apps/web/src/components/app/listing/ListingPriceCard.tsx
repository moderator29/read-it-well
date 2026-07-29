import Link from "next/link";
import { formatMoney, type Dictionary, type Locale } from "@naijafinds/i18n";
import type { Listing } from "@/lib/listings/types";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Booking panel for the listing detail page.
 *
 * Rendered twice: inline in the mobile flow and inside the sticky desktop
 * aside. Money always goes through `formatMoney` on integer kobo. The safety
 * caption is deliberate product policy, not copy decoration: RentMe users
 * are told on every listing to inspect before they pay.
 */
export function ListingPriceCard({
  listing,
  locale,
  t,
  messageHref = "/messages",
}: {
  listing: Listing;
  locale: Locale;
  t: Dictionary;
  /** Deep link into the conversation about this listing, when one exists. */
  messageHref?: string;
}) {
  return (
    <div className="nf-card p-5">
      <p className="flex items-baseline gap-1.5">
        <span className="nf-numeric text-[1.5rem] font-bold tracking-tight text-[var(--nf-content-primary)]">
          {formatMoney(listing.priceMinor, locale, listing.currency)}
        </span>
        <span className="text-[0.8125rem] text-[var(--nf-content-muted)]">/ {t.common.night}</span>
      </p>

      {listing.instantBook && (
        <p className="mt-2 flex items-center gap-1.5 text-[0.78rem] font-semibold text-[var(--nf-state-warning)]">
          <UiIcon name="sparkle" size={13} />
          Instant Book available
        </p>
      )}

      <div className="mt-4 grid gap-2.5">
        <Link href="/bookings" className="nf-btn nf-btn--primary w-full">
          Reserve
        </Link>
        <Link href={messageHref} className="nf-btn nf-btn--glass w-full">
          Message agent
        </Link>
      </div>

      <p className="mt-3.5 flex items-start gap-1.5 text-[0.78rem] leading-relaxed text-[var(--nf-content-muted)]">
        <UiIcon name="verified" size={14} className="mt-0.5 shrink-0 text-[var(--nf-state-success)]" />
        Pay only after you have inspected the property
      </p>
    </div>
  );
}
