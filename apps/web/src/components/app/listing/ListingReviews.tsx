import { formatNumber, type Dictionary, type Locale } from "@naijafinds/i18n";
import { Icon } from "@/design-system/icons/Icon";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Reviews section.
 *
 * The summary shows only figures the listing record actually carries. There is
 * no review document store yet, so no written reviews are ever invented: with
 * a rating on file the section explains where the written entries will appear,
 * and with none it shows a straightforward zero state.
 */
export function ListingReviews({
  rating,
  reviewCount,
  locale,
  t,
}: {
  rating: number;
  reviewCount: number;
  locale: Locale;
  t: Dictionary;
}) {
  if (reviewCount === 0) {
    return (
      <div className="nf-card p-8 text-center">
        <span className="mx-auto block h-12 w-12">
          <Icon name="star" fill />
        </span>
        <p className="mt-3.5 font-semibold text-[var(--nf-content-primary)]">No reviews yet</p>
        <p className="mx-auto mt-1 max-w-[38ch] text-[0.875rem] text-[var(--nf-content-muted)]">
          This place has not hosted a RentMe stay yet. Reviews appear here
          after verified stays.
        </p>
      </div>
    );
  }

  return (
    <div className="nf-card p-5">
      <div className="flex items-center gap-3.5">
        <span className="block h-11 w-11 shrink-0">
          <Icon name="star" fill />
        </span>
        <p className="flex items-baseline gap-2">
          <span className="nf-numeric text-[1.375rem] font-bold tracking-tight text-[var(--nf-content-primary)]">
            {rating.toFixed(1)}
          </span>
          <span className="text-[0.875rem] text-[var(--nf-content-secondary)]">
            {formatNumber(reviewCount, locale)} {t.common.reviews}
          </span>
        </p>
      </div>

      <p className="mt-4 flex items-start gap-2 border-t border-[var(--nf-border-subtle)] pt-4 text-[0.875rem] leading-relaxed text-[var(--nf-content-muted)]">
        <UiIcon name="star" size={15} className="mt-0.5 shrink-0" />
        Written reviews from verified stays will appear here once guests share
        them on RentMe.
      </p>
    </div>
  );
}
