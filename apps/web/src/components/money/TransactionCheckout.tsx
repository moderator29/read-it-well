import Link from "next/link";
import type { Locale } from "@vallo/i18n/core";
import { Amount } from "@/components/ui/Amount";
import { AGREEMENT_STATUS_LABEL } from "@/components/app/agreements/status";
import {
  CHECKOUT_AMOUNT_NOTE,
  CHECKOUT_NO_AGREEMENT,
  CHECKOUT_PAYEE_ROLE,
  CHECKOUT_PAYER_YOU,
  CHECKOUT_TX_LABEL,
  CHECKOUT_TX_TITLE,
  RAIL_COPY,
  type MoneyRail,
} from "@/lib/money/copy";
import type { MoneyReference } from "@/lib/money/references";
import { ReferenceList } from "./ReferenceList";
import "@/app/css/money-layer.css";

/**
 * THE CHECKOUT THAT UNDERSTANDS THE TRANSACTION (D50, Session 3's first build).
 *
 * Not a generic payment screen: before the pay action a member reads what the
 * money is for (the space), what it rests on (the agreement and its state),
 * who pays whom, how much, what stands behind it on the rail it is actually
 * on, the conditions, and when the owner or agent receives it. Seven facts,
 * one per row, in that order, each answering one question.
 *
 * Every sentence comes from `lib/money/copy.ts` for the rail handed in, so a
 * direct payment is never described as held and a protected one is never
 * described as paid on the spot. The amount is the advertised price and
 * nothing else (D51): no fee line, no footnote. Server-safe.
 */
export type TransactionCheckoutProps = {
  rail: MoneyRail;
  space: { title: string; location: string; href: string };
  agreement: { id: string; status: string } | null;
  /** The owner's or agent's display name, or null when it could not be read. */
  payeeName: string | null;
  amountMinor: number;
  currency: string;
  locale: Locale;
  /** Already-worded conditions (the cancellation standing, the gate). */
  conditions: readonly string[];
  references: readonly MoneyReference[];
};

export function TransactionCheckout(props: TransactionCheckoutProps) {
  const words = RAIL_COPY[props.rail];
  const L = CHECKOUT_TX_LABEL;
  return (
    <section
      className="nf-panel nf-panel--card"
      aria-labelledby="nf-tx-checkout"
      data-testid="transaction-checkout"
      data-rail={props.rail}
    >
      <h2 id="nf-tx-checkout" className="nf-overline text-[var(--nf-content-muted)]">
        {CHECKOUT_TX_TITLE}
      </h2>
      <dl className="mt-row grid gap-row">
        <Row label={L.space}>
          <Link href={props.space.href} className="font-semibold text-[var(--nf-content-primary)] underline-offset-2 hover:underline">
            {props.space.title}
          </Link>
          {props.space.location ? <span className="block text-[var(--nf-content-muted)]">{props.space.location}</span> : null}
        </Row>
        <Row label={L.agreement} testId="tx-agreement">
          {props.agreement ? (
            <Link href={`/agreements/${props.agreement.id}`} className="underline underline-offset-2">
              {AGREEMENT_STATUS_LABEL[props.agreement.status] ?? props.agreement.status}
            </Link>
          ) : (
            CHECKOUT_NO_AGREEMENT
          )}
        </Row>
        <Row label={L.payer}>{CHECKOUT_PAYER_YOU}</Row>
        <Row label={L.payee} testId="tx-payee">
          {props.payeeName ?? CHECKOUT_PAYEE_ROLE}
        </Row>
        <Row label={L.amount}>
          <Amount minorUnits={props.amountMinor} locale={props.locale} currency={props.currency} showFraction className="font-semibold text-[var(--nf-content-primary)]" />
          <span className="block text-[var(--nf-content-muted)]">{CHECKOUT_AMOUNT_NOTE}</span>
        </Row>
        <Row label={L.standing} testId="tx-standing">
          {words.standing}
        </Row>
        {props.conditions.length > 0 ? (
          <Row label={L.conditions}>
            <ul className="grid gap-2xs">
              {props.conditions.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Row>
        ) : null}
        <Row label={L.release} testId="tx-release">
          {words.releaseCondition}
        </Row>
      </dl>
      {props.references.length > 0 ? (
        <div className="mt-row border-t border-[var(--nf-panel-hair)] pt-row">
          <ReferenceList references={props.references} settlement="fiat" testId="tx-references" />
        </div>
      ) : null}
    </section>
  );
}

function Row({ label, children, testId }: { label: string; children: React.ReactNode; testId?: string }) {
  return (
    <div className="grid gap-2xs sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-md" data-testid={testId}>
      <dt className="nf-body-sm text-[var(--nf-content-muted)]">{label}</dt>
      <dd className="nf-body-sm min-w-0 text-[var(--nf-content-secondary)]">{children}</dd>
    </div>
  );
}
