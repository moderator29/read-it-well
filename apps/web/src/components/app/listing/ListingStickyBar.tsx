"use client";

import { formatMoney, type Locale } from "@naijafinds/i18n";
import { useStayDatesOptional } from "./StayDates";
import { ButtonLink } from "@/components/ui/Button";

/**
 * The sticky action bar.
 *
 * Lives at the end of the page flow and sticks 5rem above the viewport bottom
 * (`bottom-20`), which clears the fixed tab bar the `(app)` shell already pads
 * for. Hidden from `lg` up, where the sticky aside carries the panel instead.
 *
 * What it quotes is never a guess: once real dates are picked it shows the very
 * total the reserve panel is about to submit, in integer kobo through
 * `formatMoney`, beside the nights it covers. Until then it shows the listing's
 * own rate and what that rate buys.
 *
 * The action is decided by the market, not by styling. A stay opens the date
 * picker with Check availability. A rental never carries Reserve or Check
 * availability at all, because an annual tenancy is not booked online: the path
 * is message the agent, inspect the property, then pay
 * (docs/HYBRID_INVENTORY.md sections 1 and 4).
 */

export type StickyAction = {
  label: string;
  href: string;
  /** Off-platform destinations open in a new tab. */
  external?: boolean;
};

export function ListingStickyBar({
  variant,
  priceMinor,
  currency,
  locale,
  perLabel,
  action,
  fallbackLabel,
}: {
  variant: "stay" | "rental" | "partner";
  priceMinor: number;
  currency: string;
  locale: Locale;
  /** What the rate buys, e.g. "per night" or "per year". */
  perLabel: string;
  action: StickyAction | null;
  /** Shown instead of a price when the listing carries no real rate. */
  fallbackLabel: string;
}) {
  // Only a stay has a date picker to read from; the hook is optional so the
  // same bar renders on rental and partner pages with no provider above it.
  const stay = useStayDatesOptional();
  const quoting = variant === "stay" && stay !== null && stay.ready && stay.totalMinor > 0;

  const amount = quoting && stay ? stay.totalMinor : priceMinor;
  const caption =
    quoting && stay
      ? `Total for ${stay.nights} ${stay.nights === 1 ? "night" : "nights"}`
      : perLabel;

  return (
    /*
     * Was `bottom-20 z-30`: 80px sat below the tab bar's 94px top edge and the
     * lower z-index put it behind, so the price bar disappeared under the nav
     * on notched iPhones. It now offsets by the tab bar's real measured
     * clearance and shares its stacking level.
     */
    <div className="sticky bottom-[var(--nf-tabbar-clearance)] z-50 mt-8 lg:hidden">
      <div
        data-testid="listing-sticky-bar"
        className="nf-card flex items-center justify-between gap-4 p-3 pl-4"
      >
        <p className="flex min-w-0 flex-col">
          {amount > 0 ? (
            <>
              <span
                data-testid="sticky-total"
                className="nf-numeric truncate text-[1.0625rem] font-bold tracking-tight text-[var(--nf-content-primary)]"
              >
                {formatMoney(amount, locale, currency)}
              </span>
              <span className="truncate text-[0.75rem] text-[var(--nf-content-muted)]">
                {caption}
              </span>
            </>
          ) : (
            <span className="truncate text-[0.875rem] font-semibold text-[var(--nf-content-primary)]">
              {fallbackLabel}
            </span>
          )}
        </p>

        {action &&
          (action.external ? (
            <ButtonLink
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
              className="shrink-0"
            >
              {action.label}
            </ButtonLink>
          ) : action.href.startsWith("#") ? (
            <ButtonLink href={action.href} variant="primary" className="shrink-0">
              {action.label}
            </ButtonLink>
          ) : (
            <ButtonLink href={action.href} variant="primary" className="shrink-0">
              {action.label}
            </ButtonLink>
          ))}
      </div>
    </div>
  );
}
