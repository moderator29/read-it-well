import type { ReactNode } from "react";
import type { Locale } from "@vallo/i18n/core";
import { Amount } from "@/components/ui/Amount";
import {
  WITHDRAW_AMOUNT,
  WITHDRAW_EXPIRED,
  WITHDRAW_FAILED,
  WITHDRAW_FEE,
  WITHDRAW_FEE_NOTE,
  WITHDRAW_RECEIVE,
  WITHDRAW_TITLE,
  WITHDRAW_WAITING_BODY,
  WITHDRAW_WAITING_FEE,
  withdrawDestination,
} from "@/lib/money/copy";
import { quoteIsConfirmable, type WithdrawalQuote } from "@/lib/money/vallo";
import "@/app/css/money-layer.css";

/**
 * WITHDRAWAL SHOWS ITS MATHS BEFORE CONFIRMING (D51).
 *
 *   Amount            1,000,000
 *   Processing fee          300
 *   You'll receive      999,700
 *
 * The fee is the one the partner set on THIS withdrawal's payment intent and
 * Vallo read back. There is no fee table in this file and no estimate: while
 * the intent is being prepared the fee row says it is being set and the total
 * row is not drawn, and the confirm slot is handed `confirmable = false`. A
 * quote whose figures do not add up, or whose intent has expired, is treated
 * exactly like no quote. Server-safe; the action is the caller's (`action`).
 */
export type WithdrawalState =
  | { state: "waiting"; amountMinor: number }
  | { state: "ready"; quote: WithdrawalQuote }
  | { state: "expired" }
  | { state: "failed" };

export function WithdrawalMaths({
  withdrawal,
  locale,
  now,
  action,
  id = "nf-withdraw",
}: {
  withdrawal: WithdrawalState;
  locale: Locale;
  /** The render's own clock, so expiry is judged once. */
  now: number;
  /** The confirm control, told whether it may be pressed. */
  action?: (confirmable: boolean) => ReactNode;
  /** Unique per page when more than one is drawn. */
  id?: string;
}) {
  const quote = withdrawal.state === "ready" ? withdrawal.quote : null;
  const confirmable = quoteIsConfirmable(quote, now);
  const expired = withdrawal.state === "expired" || (quote !== null && !confirmable && Date.parse(quote.expiresAt) <= now);

  return (
    <section className="nf-panel nf-panel--card" aria-labelledby={id} data-testid="withdrawal-maths" data-state={confirmable ? "ready" : expired ? "expired" : withdrawal.state}>
      <h2 id={id} className="nf-body font-semibold text-[var(--nf-content-primary)]">
        {WITHDRAW_TITLE}
      </h2>
      {withdrawal.state === "failed" ? (
        <p className="nf-body-sm mt-inline text-[var(--nf-content-secondary)]" role="alert">
          {WITHDRAW_FAILED}
        </p>
      ) : expired ? (
        <p className="nf-body-sm mt-inline text-[var(--nf-content-secondary)]" role="status">
          {WITHDRAW_EXPIRED}
        </p>
      ) : withdrawal.state === "waiting" || !confirmable || !quote ? (
        <>
          <dl className="nf-maths mt-row">
            <div className="nf-maths__row">
              <dt>{WITHDRAW_AMOUNT}</dt>
              <dd>
                <Amount minorUnits={withdrawal.state === "waiting" ? withdrawal.amountMinor : (quote?.amountMinor ?? 0)} locale={locale} showFraction />
              </dd>
            </div>
            <div className="nf-maths__row nf-maths__row--waiting">
              <dt>{WITHDRAW_FEE}</dt>
              <dd data-testid="withdraw-fee-waiting">{WITHDRAW_WAITING_FEE}</dd>
            </div>
          </dl>
          <p className="nf-body-sm mt-row text-[var(--nf-content-secondary)]" role="status">
            {WITHDRAW_WAITING_BODY}
          </p>
        </>
      ) : (
        <>
          <dl className="nf-maths mt-row">
            <div className="nf-maths__row">
              <dt>{WITHDRAW_AMOUNT}</dt>
              <dd data-testid="withdraw-amount">
                <Amount minorUnits={quote.amountMinor} locale={locale} currency={quote.currency} showFraction />
              </dd>
            </div>
            <div className="nf-maths__row">
              <dt>{WITHDRAW_FEE}</dt>
              <dd data-testid="withdraw-fee">
                <Amount minorUnits={quote.processingFeeMinor} locale={locale} currency={quote.currency} showFraction />
              </dd>
            </div>
            <div className="nf-maths__row nf-maths__row--total">
              <dt>{WITHDRAW_RECEIVE}</dt>
              <dd data-testid="withdraw-receive">
                <Amount minorUnits={quote.receiveMinor} locale={locale} currency={quote.currency} showFraction />
              </dd>
            </div>
          </dl>
          <p className="nf-body-sm mt-row text-[var(--nf-content-secondary)]">
            {withdrawDestination(quote.destination.accountName, quote.destination.bankName, quote.destination.last4)}
          </p>
          <p className="nf-caption mt-inline text-[var(--nf-content-muted)]">{WITHDRAW_FEE_NOTE}</p>
        </>
      )}
      {action ? <div className="mt-row">{action(confirmable)}</div> : null}
    </section>
  );
}
