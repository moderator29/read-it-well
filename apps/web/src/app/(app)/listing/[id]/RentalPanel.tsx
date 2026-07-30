import Link from "next/link";
import { formatMoney, type Locale } from "@naijafinds/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The panel for rental listings, the serious rent market.
 *
 * Annual tenancies carry NO Reserve control by design: the path is message
 * the agent inside the platform, inspect the property, then pay. Per-year
 * price, one primary CTA, and the canonical safety wording. A server
 * component on purpose: nothing here needs JavaScript.
 */
export function RentalPanel({
  listingId,
  priceMinor,
  currency,
  locale,
}: {
  listingId: string;
  priceMinor: number;
  currency: string;
  locale: Locale;
}) {
  return (
    <div className="nf-card p-5" data-testid="rental-panel">
      <p className="flex items-baseline gap-1.5">
        <span className="nf-numeric text-[1.5rem] font-bold tracking-tight text-[var(--nf-content-primary)]">
          {formatMoney(priceMinor, locale, currency)}
        </span>
        <span className="text-[0.8125rem] text-[var(--nf-content-muted)]">/ year</span>
      </p>

      <div className="mt-4 grid gap-2.5">
        <Link
          href={`/messages/new?listing=${listingId}`}
          className="nf-btn nf-btn--primary w-full"
        >
          Message agent
        </Link>
      </div>

      <p className="mt-3.5 flex items-start gap-1.5 text-[0.78rem] leading-relaxed text-[var(--nf-content-muted)]">
        <UiIcon
          name="verified"
          size={14}
          className="mt-0.5 shrink-0 text-[var(--nf-state-success)]"
        />
        For your safety, keep every chat and payment inside RentMe. Deals made outside the
        platform are not protected by us. Pay only after you have inspected the property.
      </p>
    </div>
  );
}
