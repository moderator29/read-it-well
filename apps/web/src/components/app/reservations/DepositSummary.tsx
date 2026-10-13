import type { Dictionary, Locale } from "@vallo/i18n/core";
import { formatMoney } from "@vallo/i18n/core";
import { Amount } from "@/components/ui/Amount";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TYPE } from "@/components/app/Screen";
import { refundRuleLine } from "@/lib/reservations/deposits";

/**
 * A TABLE DEPOSIT, SAID BEFORE ANYBODY PAYS IT (track/restaurant-deposits).
 *
 * One block for the three places a guest meets a deposit: under the
 * reservation form while they pick (the restaurant's rule, matched on the
 * screen), in the step after the request (the database's own quote), and on
 * the deposit page. Always the same four facts in the same order: the amount
 * (the `Amount` figure, exact), how it is counted, the refund rule in plain
 * words, and that it is paid by card straight to the restaurant and comes off
 * the bill. Presentational and server-safe; every word is `tableDeposits.guest`.
 */
export function DepositSummary({
  amountMinor,
  perGuest,
  ratePerGuestMinor,
  refundUntilHours,
  words,
  locale,
  testId = "deposit-summary",
}: {
  amountMinor: number;
  /** How the rule counts it; null when the record does not say (a deposit already paid). */
  perGuest: boolean | null;
  /** The per-guest rate, when `perGuest`, for the "N per guest" line. */
  ratePerGuestMinor?: number | null;
  refundUntilHours: number;
  words: Dictionary["tableDeposits"]["guest"];
  locale: Locale;
  testId?: string;
}) {
  const rate =
    perGuest === true && ratePerGuestMinor
      ? words.perGuest.replace("{amount}", formatMoney(ratePerGuestMinor, locale, "NGN"))
      : perGuest === false
        ? words.perTable
        : null;
  return (
    <section
      className="rounded-[var(--nf-container-radius)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-raised)] p-row"
      aria-label={words.title}
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-inline">
        <div className="min-w-0">
          <p className={`flex items-center gap-inline-tight ${TYPE.rowTitle}`}>
            <UiIcon name="credit-card" size={20} aria-hidden />
            {words.title}
          </p>
          {rate ? <p className={`mt-inline-tight ${TYPE.rowMeta}`}>{rate}</p> : null}
        </div>
        <Amount
          minorUnits={amountMinor}
          locale={locale}
          className="nf-h3 shrink-0 font-semibold text-[var(--nf-content-primary)]"
        />
      </div>
      <ul className="mt-row grid gap-inline-tight">
        <li className={`flex items-start gap-inline-tight ${TYPE.rowMeta}`}>
          <UiIcon name="history" size={16} className="mt-[0.15rem] shrink-0" aria-hidden />
          <span>{refundRuleLine(refundUntilHours, words, locale)}</span>
        </li>
        <li className={`flex items-start gap-inline-tight ${TYPE.rowMeta}`}>
          <UiIcon name="info" size={16} className="mt-[0.15rem] shrink-0" aria-hidden />
          <span>{words.venueCancels}</span>
        </li>
        <li className={`flex items-start gap-inline-tight ${TYPE.rowMeta}`}>
          <UiIcon name="receipt" size={16} className="mt-[0.15rem] shrink-0" aria-hidden />
          <span>{words.howPaid}</span>
        </li>
      </ul>
    </section>
  );
}
