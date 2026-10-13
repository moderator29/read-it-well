"use client";

import Link from "next/link";
import { formatMoney, type Dictionary, type Locale } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { ReservedDeposit } from "@/lib/reservations/actions";
import { DepositSummary } from "./DepositSummary";
import { PayDepositButton } from "./PayDepositButton";

/**
 * THE ONE STEP LEFT (track/restaurant-deposits). The table request exists
 * and the restaurant's rule asks a deposit of it: the database's own quote,
 * its refund rule in plain words, and the card button. No success sheet over
 * it: the request is not done until this is paid, and the venue cannot
 * confirm before. Drawn by the reservation form after a request, and by the
 * preview harness from fixtures.
 */
export function DepositStep({
  reservationId,
  due,
  party,
  words,
  locale,
}: {
  reservationId: string;
  due: ReservedDeposit;
  party: number;
  words: Dictionary["tableDeposits"]["guest"];
  locale: Locale;
}) {
  return (
    <div className="nf-panel nf-panel--card isolate grid gap-row p-lg" data-testid="deposit-step">
      <div>
        <p className="flex items-center gap-xs text-[length:var(--nf-text-body)] font-semibold text-[var(--nf-content-primary)]">
          <UiIcon name="credit-card" size={20} className="shrink-0 opacity-80" aria-hidden />
          {words.stepTitle}
        </p>
        <p className="mt-xs text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
          {words.stepBody}
        </p>
      </div>
      <DepositSummary
        amountMinor={due.amountMinor}
        perGuest={due.perGuest}
        ratePerGuestMinor={due.perGuest && party > 0 ? Math.round(due.amountMinor / party) : null}
        refundUntilHours={due.refundUntilHours}
        words={words}
        locale={locale}
        testId="deposit-step-summary"
      />
      <PayDepositButton
        reservationId={reservationId}
        label={words.pay.replace("{amount}", formatMoney(due.amountMinor, locale, "NGN"))}
        pendingLabel={words.opening}
        size="lg"
        full
      />
      <div className="flex flex-wrap items-center justify-between gap-inline">
        <Link
          href="/bookings?side=stays&from=stays"
          className="text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)] underline underline-offset-4"
        >
          {words.payLater}
        </Link>
        <Link
          href={`/pay/deposit/${reservationId}`}
          className="text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-secondary)] underline underline-offset-4"
        >
          {words.seeDeposit}
        </Link>
      </div>
    </div>
  );
}
