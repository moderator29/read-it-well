"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@vallo/i18n/core";
import { StatusPill } from "@/components/ui/StatusPill";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { balanceMovementStatus } from "@/lib/money/member-wallet-actions";
import type { MovementView } from "@/lib/money/member-wallet";
import { HELD_BY, WAITING_COPY, WAITING_STEPS, movementStatusLabel, movementTitle, movementTone, type StatusTone } from "@/lib/money/balance-copy";
import { formatKoboExact } from "@/components/app/money/money";
import type { ReceiptModel } from "@/components/app/money/receipt-model";
import { isOpenMovement, type WithdrawalBreakdown } from "@/lib/money/funds";
import { formatMoneyDate } from "@/lib/money/dates";
import { MoneyFigure, MoneyMoment, StatusWord } from "../kit";
import { StepPath, type PathState } from "../StepPath";
import { PaidMoment, SentMoment, WithdrawnMoment } from "@/components/ui/SuccessMoment";
import "@/app/css/money-layer.css";

/**
 * Shared pieces of the balance surface (/wallet). The plates use the finance
 * icon pack (`assets/icon-pack/raw/finance-payment-wallet/`, cropped to the
 * glyph into `public/brand/finance/`), kept for the one line that says who
 * holds the money; everything else draws from the money kit (`../kit`).
 */

export type FinanceGlyph = "add-money" | "withdraw" | "send-money" | "pending" | "success" | "failed" | "secure" | "history";

export function FinancePlate({ glyph, className }: { glyph: FinanceGlyph; className?: string }) {
  return (
    <span className={className ?? "nf-balance__plate"} aria-hidden="true">
      <Image src={`/brand/finance/${glyph}.png`} alt="" width={41} height={41} unoptimized />
    </span>
  );
}

const PILL_TONE: Record<StatusTone, "success" | "warning" | "danger" | "neutral"> = {
  done: "success",
  waiting: "warning",
  problem: "danger",
  neutral: "neutral",
};

export function MovementStatusPill({ movement }: { movement: Pick<MovementView, "kind" | "status"> }) {
  return <StatusPill tone={PILL_TONE[movementTone(movement.status)]}>{movementStatusLabel(movement.kind, movement.status)}</StatusPill>;
}

/** Reference 4's small status word under an amount, in the movement's own words. */
export function MovementStatusWord({ movement }: { movement: Pick<MovementView, "kind" | "status"> }) {
  return <StatusWord tone={PILL_TONE[movementTone(movement.status)]}>{movementStatusLabel(movement.kind, movement.status)}</StatusWord>;
}

/**
 * THE SEVEN FIGURES (founder section 12): amount, the provider's processing
 * fee, Vallo's fee, VAT, the total that leaves the balance, what arrives,
 * and where. A row is never hidden for being zero: "None" is a fact.
 *
 * Drawn as reference 8's bill: one card of line items, labels on the left,
 * figures right aligned and tabular, the total in a heavier weight under a
 * rule, and what arrives lit as the one figure the reader came for.
 */
export function Breakdown({
  breakdown,
  locale,
  destination,
  receivedLabel,
}: {
  breakdown: WithdrawalBreakdown;
  locale: Locale;
  destination: { label: string; title: string; detail: string };
  receivedLabel: string;
}) {
  const money = (minor: number) => <MoneyFigure minor={minor} locale={locale} size="row" kobo="auto" />;
  return (
    <dl className="nf-maths nf-maths--bill" data-testid="balance-breakdown">
      <div className="nf-maths__row">
        <dt>Amount</dt>
        <dd>{money(breakdown.amountMinor)}</dd>
      </div>
      <div className="nf-maths__row">
        <dt>Processing fee</dt>
        <dd>{breakdown.providerFeeMinor === 0 ? "None" : money(breakdown.providerFeeMinor)}</dd>
      </div>
      <div className="nf-maths__row">
        <dt>Vallo fee</dt>
        <dd>{breakdown.valloFeeMinor === 0 ? "None" : money(breakdown.valloFeeMinor)}</dd>
      </div>
      <div className="nf-maths__row">
        <dt>VAT</dt>
        <dd>{breakdown.vatMinor === 0 ? "Included in the processing fee where charged" : money(breakdown.vatMinor)}</dd>
      </div>
      <div className="nf-maths__row nf-maths__row--total">
        <dt>Total from your balance</dt>
        <dd>{money(breakdown.totalDebitedMinor)}</dd>
      </div>
      <div className="nf-maths__row nf-maths__row--total nf-maths__row--lit">
        <dt>{receivedLabel}</dt>
        <dd>{money(breakdown.receivedMinor)}</dd>
      </div>
      <div className="nf-maths__row nf-maths__row--to">
        <dt>{destination.label}</dt>
        <dd className="text-end">
          <span className="block font-semibold text-[var(--nf-content-primary)]">{destination.title}</span>
          <span className="block">{destination.detail}</span>
        </dd>
      </div>
    </dl>
  );
}

/**
 * A completed movement as the one receipt model (`ReceiptModel`), so it can
 * be saved as an image or a PDF and shared like every other receipt. Only
 * what the record holds: the amount, the day, the processor's fee when the
 * record carries one, the partner's confirmation when it gave one, the
 * reference. No total is worked out here.
 */
export function movementReceipt(m: MovementView, locale: Locale): ReceiptModel {
  const { whole, kobo } = formatKoboExact(m.amountMinor, locale);
  const fee = m.providerFeeMinor && m.providerFeeMinor > 0 ? formatKoboExact(m.providerFeeMinor, locale) : null;
  const cp = m.counterparty;
  const place =
    m.kind === "withdrawal"
      ? [cp.bank, cp.last4 ? `•••• ${cp.last4}` : ""].filter(Boolean).join(" ")
      : m.kind === "transfer_out"
        ? `To ${cp.name || "a Vallo member"}`
        : m.kind === "transfer_in"
          ? "From a Vallo member"
          : "From your bank or card";
  return {
    kind: "Receipt",
    title: movementTitle(m.kind),
    place,
    figureLabel: m.kind === "deposit" || m.kind === "transfer_in" ? "Received" : "Amount",
    figure: `${whole}${kobo}`,
    facts: [{ label: "Date", value: formatMoneyDate(m.createdAt, locale, { withTime: true }) ?? "" }],
    lines: fee ? [{ label: "Processing fee", value: `${fee.whole}${fee.kobo}` }] : [],
    total: { label: "Amount", value: `${whole}${kobo}` },
    confirmations: m.confirmedByProvider ? [{ label: "Our escrow partner", state: "Confirmed" }] : [],
    reference: { label: "Reference", value: m.reference },
    note: HELD_BY,
  };
}

/** Polling cadence for an open movement: quick at first, then patient. Never faster than the server allows. */
const POLL_MS = [4_000, 8_000, 12_000, 20_000, 30_000];

/**
 * Keep a movement current while it is open. Reads Vallo's record (kept by
 * the webhook); the server adds a provider read-back at most once a minute.
 * Resumes when the app comes back to the foreground (section 44: a
 * transaction must survive the app being backgrounded).
 */
export function useWatchedMovement(initial: MovementView, onSettled?: (m: MovementView) => void): MovementView {
  const [movement, setMovement] = useState(initial);
  const attempt = useRef(0);
  const settled = useRef(onSettled);
  useEffect(() => {
    settled.current = onSettled;
  });

  useEffect(() => {
    if (!isOpenMovement(movement.status)) return;
    let cancelled = false;
    const tick = async () => {
      const r = await balanceMovementStatus({ movementId: movement.id });
      if (cancelled || !r.ok) return;
      attempt.current += 1;
      setMovement(r.data);
      if (!isOpenMovement(r.data.status)) settled.current?.(r.data);
    };
    const delay = POLL_MS[Math.min(attempt.current, POLL_MS.length - 1)]!;
    const timer = window.setTimeout(tick, delay);
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [movement]);

  return movement;
}

type WaitKind = "withdrawal" | "deposit" | "send";

/* The status card's "Expected" cell, in the waiting sentences' own terms
   (WAITING_COPY): usual times, said as usual, never a countdown. */
const EXPECTED: Record<WaitKind | "check", string> = {
  withdrawal: "Usually a few minutes",
  deposit: "Usually a few minutes",
  send: "Usually within a minute",
  check: "We are checking now",
};

/**
 * THE WAITING ROOM (founder section 43; PREMIUM-STANDARD references 2 and
 * 7). "A Nigerian bank transfer takes minutes; the screen has to make waiting
 * feel safe." So: a ring that breathes only while the record is open, what
 * is happening in one sentence, the figure and its status word, the reassurance
 * on its own line, the path with each step ticked only when the record says
 * so, when we last heard, and the reference. No percentage, no timer, no
 * "almost there".
 */
export function WaitingRoom({ movement, locale, kind }: { movement: MovementView; locale: Locale; kind: WaitKind }) {
  const open = isOpenMovement(movement.status);
  const copy =
    movement.status === "unknown"
      ? WAITING_COPY.unknown
      : movement.status === "under_review"
        ? WAITING_COPY.review
        : WAITING_COPY[kind];
  const steps = WAITING_STEPS[kind];
  const done = movement.status === "completed";
  const failed = movement.status === "failed" || movement.status === "reversed" || movement.status === "cancelled";
  /* Step one is the request, true once it left Vallo; the last is the bank's word. */
  const ticks = [movement.status !== "awaiting_confirmation" && movement.status !== "awaiting_payment", done, done];
  const heard = open ? formatMoneyDate(movement.observedAt, locale, { withTime: true }) : null;
  const closing = done
    ? "Confirmed. This is done."
    : movement.status === "reversed"
      ? "Your bank returned this. The money is back in your balance."
      : "This did not go through, and nothing was taken for it.";
  const stateOf = (i: number): PathState => {
    if (ticks[i]) return "done";
    const reached = i === 0 || Boolean(ticks[i - 1]);
    if (open && reached) return "waiting";
    if (failed && reached) return "problem";
    return "upcoming";
  };

  return (
    <div className="nf-wait" data-testid="balance-waiting" data-status={movement.status}>
      {/* The head is the success family's member for the kind (ONE-PRODUCT-
          DECISIONS recommendation 2): a withdrawal shows its bank, a send
          its recipient with the figure travelling to them, money added the
          seal; a problem is the plain red mark. */}
      <div role="status" aria-live="polite" className="nf-wait__head">
        {kind === "withdrawal" && !failed ? (
          <WithdrawnMoment
            live={open}
            title={open ? copy.title : movementStatusLabel(movement.kind, movement.status)}
            line={open ? undefined : closing}
            bank={[movement.counterparty.bank, movement.counterparty.last4 ? `•••• ${movement.counterparty.last4}` : ""].filter(Boolean).join(" ") || "To your bank"}
          />
        ) : kind === "send" && done ? (
          <SentMoment
            recipient={movement.counterparty.name || "a Vallo member"}
            figure={<MoneyFigure minor={movement.amountMinor} locale={locale} size="md" kobo="auto" />}
            title={movementStatusLabel(movement.kind, movement.status)}
            line={closing}
          >
            <MovementStatusWord movement={movement} />
          </SentMoment>
        ) : kind === "deposit" && done ? (
          <PaidMoment title={movementStatusLabel(movement.kind, movement.status)} line={closing} />
        ) : (
          <MoneyMoment
            tone={done ? "done" : failed ? "problem" : open ? "waiting" : "neutral"}
            live={open}
            title={open ? copy.title : movementStatusLabel(movement.kind, movement.status)}
            line={open ? undefined : closing}
          />
        )}
      </div>
      {kind === "send" && done ? null : (
        <div className="nf-wait__figure">
          <MoneyFigure minor={movement.amountMinor} locale={locale} size="hero" kobo="auto" />
          <MovementStatusWord movement={movement} />
        </div>
      )}
      {open ? (
        /* The status card (status-tracking-timeline.jpg): how long, and
           what, if anything, the member must do; each cell a restatement of
           the waiting sentence under it, never a promise it does not make. */
        <section className="nf-wait__status" aria-label="Status">
          <dl className="nf-wait__cells">
            <div>
              <dt>Expected</dt>
              <dd>{EXPECTED[movement.status === "unknown" || movement.status === "under_review" ? "check" : kind]}</dd>
            </div>
            <div>
              <dt>Next action</dt>
              <dd>{movement.status === "unknown" ? "Do not try again" : "None. You can leave this screen"}</dd>
            </div>
          </dl>
          <p className="nf-wait__calm">
            <UiIcon name="shield-check" size={18} />
            <span>{copy.body}</span>
          </p>
        </section>
      ) : null}
      <StepPath compact label="Where it is" steps={steps.map((step, i) => ({
          key: step,
          title: step,
          /* The one step whose time the record holds: when it was asked for. */
          sub: i === 0 && ticks[0] ? (formatMoneyDate(movement.createdAt, locale, { withTime: true }) ?? undefined) : undefined,
          state: stateOf(i),
        }))}
      />
      <p className="nf-wait__meta">
        {heard ? <span>Last update {heard}</span> : null}
        <span>
          Reference <span className="font-mono">{movement.reference}</span>
        </span>
      </p>
    </div>
  );
}
