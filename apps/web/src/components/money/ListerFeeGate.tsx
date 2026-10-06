"use client";

import { useId } from "react";
import { formatMoney, type Locale } from "@vallo/i18n/core";
import { Amount } from "@/components/ui/Amount";
import { Checkbox } from "@/components/ui/Check";
import {
  FEE_ACCEPT_LABEL,
  FEE_ACCEPT_RECORD,
  FEE_GATE_TITLE,
  FEE_NEEDS_FIGURE,
  FEE_UNREADABLE_BODY,
  FEE_UNREADABLE_TITLE,
  LISTER_FIGURE_LABEL,
  LISTER_RECEIVE_LABEL,
  keepMoreSentence,
  platformFeeLabel,
  renterSeesSentence,
  type ListerFigureKind,
} from "@/lib/money/copy";
import {
  acceptanceMatches,
  keepMore,
  listerFeeFigures,
  type ListerFeeAcceptance,
  type ListerFeePolicy,
} from "@/lib/money/lister-fee";
import "@/app/css/money-layer.css";

/**
 * THE LISTER SEES THE ARITHMETIC AND ACCEPTS IT BEFORE PUBLISHING (D51).
 *
 *   Rent you set            1,800,000
 *   Platform fee (4%)          72,000
 *   You receive             1,728,000
 *
 * On the listing's own figure, in naira, never a bare percentage. The one
 * subject is "You receive": it is the largest figure and the only one in full
 * ink. Under it, what the renter sees (exactly the price, nothing added) and
 * the sales line framed as what the lister keeps against an agent.
 *
 * The accept is an explicit checkbox and nothing else accepts: the parent
 * (the listing wizard's submit step) holds the acceptance and sends it with
 * the publish request, where Session 2 records member, timestamp and rate
 * version. A price edit or a new rate version voids it on the next render,
 * because `acceptanceMatches` compares every figure.
 *
 * Honest states: no policy read (the gate says so and cannot be accepted, so
 * publishing waits), and no price yet (a sentence, never a zero).
 */
export type ListerFeeGateProps = {
  kind: ListerFigureKind;
  /** The lister's own figure in kobo, or null before one is typed. */
  priceMinor: number | null;
  /** The rate in force from the server read, or null when it could not be read. */
  policy: ListerFeePolicy | null;
  locale: Locale;
  accepted: ListerFeeAcceptance | null;
  onAcceptedChange: (next: ListerFeeAcceptance | null) => void;
};

export function ListerFeeGate({ kind, priceMinor, policy, locale, accepted, onAcceptedChange }: ListerFeeGateProps) {
  const headingId = useId();
  const figures = listerFeeFigures(priceMinor, policy);

  if (policy === null) {
    return (
      <section className="nf-panel nf-panel--card nf-feegate" aria-labelledby={headingId} data-testid="fee-gate" data-state="unreadable">
        <h3 id={headingId} className="nf-body font-semibold text-[var(--nf-content-primary)]">
          {FEE_UNREADABLE_TITLE}
        </h3>
        <p className="nf-body-sm mt-inline text-[var(--nf-content-secondary)]">{FEE_UNREADABLE_BODY}</p>
      </section>
    );
  }

  if (figures === null) {
    return (
      <section className="nf-panel nf-panel--card nf-feegate" aria-labelledby={headingId} data-testid="fee-gate" data-state="no-figure">
        <h3 id={headingId} className="nf-overline text-[var(--nf-content-muted)]">
          {FEE_GATE_TITLE}
        </h3>
        <p className="nf-body-sm mt-inline text-[var(--nf-content-secondary)]">{FEE_NEEDS_FIGURE}</p>
      </section>
    );
  }

  const isAccepted = acceptanceMatches(accepted, figures, policy);
  const more = keepMore(figures, policy);
  const priceText = formatMoney(figures.priceMinor, locale);

  return (
    <section className="nf-panel nf-panel--card nf-feegate" aria-labelledby={headingId} data-testid="fee-gate" data-state={isAccepted ? "accepted" : "open"}>
      <h3 id={headingId} className="nf-overline text-[var(--nf-content-muted)]">
        {FEE_GATE_TITLE}
      </h3>
      <dl className="nf-feegate__rows">
        <div className="nf-feegate__row">
          <dt>{LISTER_FIGURE_LABEL[kind]}</dt>
          <dd data-testid="fee-gate-price">
            <Amount minorUnits={figures.priceMinor} locale={locale} />
          </dd>
        </div>
        <div className="nf-feegate__row">
          <dt>{platformFeeLabel(figures.feePercentText)}</dt>
          <dd data-testid="fee-gate-fee">
            <Amount minorUnits={figures.feeMinor} locale={locale} />
          </dd>
        </div>
        <div className="nf-feegate__row nf-feegate__row--total">
          <dt>{LISTER_RECEIVE_LABEL}</dt>
          <dd data-testid="fee-gate-receive">
            <Amount minorUnits={figures.receiveMinor} locale={locale} />
          </dd>
        </div>
      </dl>

      <p className="nf-body-sm mt-row text-[var(--nf-content-secondary)]">{renterSeesSentence(priceText)}</p>
      {more && (
        <p className="nf-body-sm mt-inline font-semibold text-[var(--nf-state-success)]" data-testid="fee-gate-keep">
          {keepMoreSentence({
            agentPercentText: more.agentPercentText,
            keepPercentText: more.keepPercentText,
            agentKeepPercentText: more.agentKeepPercentText,
            moreText: formatMoney(more.moreMinor, locale),
            priceText,
          })}
        </p>
      )}

      <Checkbox
        className="mt-row"
        checked={isAccepted}
        data-testid="fee-gate-accept"
        onChange={(event) =>
          onAcceptedChange(
            event.currentTarget.checked
              ? {
                  rateVersion: policy.rateVersion,
                  priceMinor: figures.priceMinor,
                  feeMinor: figures.feeMinor,
                  receiveMinor: figures.receiveMinor,
                }
              : null,
          )
        }
      >
        {FEE_ACCEPT_LABEL}
      </Checkbox>
      <p className="nf-caption mt-inline text-[var(--nf-content-muted)]">{FEE_ACCEPT_RECORD}</p>
    </section>
  );
}
