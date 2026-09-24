"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_LOCALE, getDictionary, type Locale } from "@vallo/i18n";
import { settleCardPayment } from "@/lib/bookings/checkout";
import { ResultSheet } from "@/components/app/ResultSheet";
import { failureConsequence } from "./payment-copy";

/**
 * The return trip from Paystack.
 *
 * The guest usually lands back here before the webhook arrives, so this calls
 * the verify path, which settles the charge through exactly the same function
 * the webhook uses. Whichever gets there first does the work; the second finds
 * the attempt already SUCCESSFUL and the booking already CONFIRMED and moves
 * nothing. That is why running both is safe rather than merely tolerable.
 *
 * The action runs once per mount, guarded by a ref, because React may mount an
 * effect twice in development and a settlement is not something to ask for
 * twice on a whim, idempotent or not.
 *
 * ---------------------------------------------------------------------------
 * THIS WAS THE WORST CONFIRMATION SURFACE IN THE PRODUCT, AND IT IS ON THE
 * CARD MONEY PATH.
 *
 * A person entered their card details, came back, verification failed, and the
 * screen said the words **"Payment check"** as a heading in neutral grey, with
 * the reason in muted grey, inside a plain card at the top of a live checkout
 * page, announced `role="status" aria-live="polite"`. No mark. No colour. No
 * statement of whether money had left their account. No retry. No route to
 * help. The success branch three lines above was emerald with a consequence
 * line, and that asymmetry was the whole problem in one file.
 *
 * All three branches go through `ResultSheet` now, over the page rather than
 * as a banner on it, and the failure branch says the one sentence that
 * matters: whether the card has been charged.
 *
 * ---------------------------------------------------------------------------
 * AND IT HAD NO TIMEOUT.
 *
 * If `settleCardPayment` hangs, c.confirmingPayment ran forever. On a
 * Lagos network that is ordinary rather than an edge case, and a person
 * staring at a frozen payment screen for two minutes assumes the worst and
 * rings their bank. There is a soft message at ten seconds and a terminal
 * state at twenty-five, and both of them say what is and is not known.
 */

/** When the wait stops being normal, and when it stops being a wait. */
const SLOW_MS = 10_000;
const GIVE_UP_MS = 25_000;

type Phase =
  | { kind: "checking" }
  | { kind: "slow" }
  | { kind: "settled"; confirmed: boolean }
  | { kind: "failed"; message: string }
  | { kind: "unknown" };

export function PaymentReturn({
  reference,
  amountMinor,
  currency,
  subject,
  locale,
  /** Where c.tryAgain goes. The checkout screen this sits on. */
  retryHref,
  plansAction,
}: {
  reference: string;
  amountMinor?: number;
  currency?: string;
  subject?: string;
  locale?: Locale;
  retryHref: string;
  /** Where "done" sends somebody, in the dictionary's words (V-76 review). */
  plansAction: { label: string; href: string };
}) {
  const c = getDictionary(locale ?? DEFAULT_LOCALE).checkout;
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;

    const slow = window.setTimeout(() => {
      if (!cancelled) setPhase((p) => (p.kind === "checking" ? { kind: "slow" } : p));
    }, SLOW_MS);
    const giveUp = window.setTimeout(() => {
      if (!cancelled) {
        setPhase((p) => (p.kind === "checking" || p.kind === "slow" ? { kind: "unknown" } : p));
      }
    }, GIVE_UP_MS);

    settleCardPayment(reference).then((result) => {
      if (cancelled) return;
      window.clearTimeout(slow);
      window.clearTimeout(giveUp);
      if (result.ok && result.data) {
        setPhase({ kind: "settled", confirmed: result.data.confirmed });
        router.refresh();
        return;
      }
      setPhase({
        kind: "failed",
        /*
         * The server's own string reaches a person who has just tried to pay
         * rent, so it is used only when there IS one and it is followed by the
         * sentence that answers the question they are actually asking. Never
         * "Something went wrong": that tells somebody nothing and costs them
         * the one fact they need.
         */
        message: result.ok ? "" : result.error,
      });
    });

    return () => {
      cancelled = true;
      window.clearTimeout(slow);
      window.clearTimeout(giveUp);
    };
  }, [reference, router]);

  const fact = {
    ...(amountMinor === undefined ? {} : { amountMinor }),
    ...(currency ? { currency } : {}),
    ...(subject ? { subject } : {}),
    reference,
  };

  if (phase.kind === "checking" || phase.kind === "slow") {
    return (
      <ResultSheet
        open={open}
        onOpenChange={setOpen}
        state="pending"
        /* Blocking, because the outcome is genuinely unknown and a person who
           dismisses this and taps Pay again may pay twice. It stops blocking
           the moment the wait becomes a terminal state below. */
        blocking
        verdict={c.confirmingPayment}
        fact={fact}
        locale={locale}
        consequence={
          phase.kind === "slow"
            ? c.returnSlow
            : c.returnChecking
        }
      />
    );
  }

  if (phase.kind === "settled") {
    return (
      <ResultSheet
        open={open}
        onOpenChange={setOpen}
        state="received"
        verdict={c.paymentReceived}
        fact={fact}
        locale={locale}
        consequence={
          phase.confirmed
            ? c.stayConfirmed
            : c.alreadyRecorded
        }
        actions={[
          { label: plansAction.label, href: plansAction.href, tone: "primary" },
          { label: "Close", onClick: () => setOpen(false), tone: "quiet" },
        ]}
      />
    );
  }

  if (phase.kind === "unknown") {
    return (
      <ResultSheet
        open={open}
        onOpenChange={setOpen}
        state="pending"
        verdict={c.stillChecking}
        fact={fact}
        locale={locale}
        consequence={c.returnStalled}
        actions={[
          { label: plansAction.label, href: plansAction.href, tone: "primary" },
          { label: c.getHelp, href: "/help", tone: "quiet" },
        ]}
      />
    );
  }

  return (
    <ResultSheet
      open={open}
      onOpenChange={setOpen}
      state="failed"
      verdict={c.paymentNotConfirmed}
      fact={fact}
      locale={locale}
      /* Filtered rather than interpolated. See `payment-copy`: the envelope
         carries a free string and nothing constrains what goes in it, so the
         boundary lives here and the sentence about the card is said whether or
         not the server gave a reason worth showing. */
      consequence={failureConsequence(
        phase.message,
        c.returnFailed,
      )}
      actions={[
        { label: c.tryAgain, href: retryHref, tone: "primary" },
        { label: c.getHelp, href: "/help", tone: "quiet" },
      ]}
    />
  );
}
