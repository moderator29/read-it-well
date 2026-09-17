"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { payWithWallet, startCardCheckout } from "@/lib/bookings/checkout";
import type { CheckoutView } from "@/lib/bookings/checkout-view";
import { ResultSheet } from "@/components/app/ResultSheet";
import { failureConsequence } from "./payment-copy";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ActionBar } from "@/components/ui/ActionBar";
import { Amount } from "@/components/ui/Amount";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The two ways to pay.
 *
 * Card opens a hosted Paystack page; wallet settles inside the platform in one
 * atomic database call. Neither button prices anything: the amount comes from
 * the stored booking row and the server actions read it again for themselves, so
 * nothing a browser could edit reaches the ledger.
 *
 * One idempotency key is minted per method per mount, so the second of two taps
 * on a flaky connection replays the first answer instead of paying twice. Every
 * failure lands as one plain sentence saying what happened and what the guest
 * can do next; no code, no stack, no silence.
 *
 * ---------------------------------------------------------------------------
 * THE THREE PENDING STATES USED TO BE A `loading` PROP ON A BUTTON.
 *
 * `card-starting`, `card-redirecting` and `wallet-paying` rendered as a
 * spinner inside a pill and nothing else. No sentence, no amount, no mark, no
 * live region. Between tapping "Pay 1,250,000 naira from my wallet" and
 * anything happening, a person moving the largest sum on this platform saw a
 * disc rotating inside the button they had just pressed, on a button that was
 * simultaneously disabled, which is how a loading state and a dead control end
 * up looking identical.
 *
 * All three are one `ResultSheet state="pending"` now, over the page, carrying
 * the three things a pending state owes somebody: a mark, the amount, and the
 * consequence. The wallet already did this properly four times over and
 * checkout did it nowhere.
 *
 * ---------------------------------------------------------------------------
 * AND NEITHER PATH HAD A TIMEOUT.
 *
 * If `startCardCheckout` hung, `busy` stayed true forever, BOTH pay buttons
 * stayed disabled with no explanation, and there was no cancel. If
 * `window.location.assign` was slow or blocked, `card-redirecting` spun
 * indefinitely. On a Lagos network neither is an edge case. There is a soft
 * message at ten seconds and a terminal state at twenty-five, and both say
 * whether the money has moved.
 */

/** A key per submit. crypto.randomUUID exists in every browser this ships to. */
function newKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `k-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

/** When the wait stops being normal, and when it stops being a wait. */
const SLOW_MS = 10_000;
const GIVE_UP_MS = 25_000;

type Phase =
  | { kind: "idle" }
  | { kind: "card-starting" }
  | { kind: "card-redirecting" }
  | { kind: "wallet-paying" }
  | { kind: "wallet-paid" }
  | { kind: "stalled"; method: "card" | "wallet" }
  | { kind: "error"; message: string };

/**
 * One way to pay.
 *
 * THE ROOM IS THE POINT. These rows were `p-4 gap-3.5` with 13px metadata,
 * which made the screen where somebody pays 1.2m naira one of the two most
 * tightly packed surfaces in the product, the other being the screen where an
 * operator decides whose money moves. Every value here is now a named interval
 * on the scale rather than a number chosen at this call site, and the tier they
 * land on is the one the rest of the product uses.
 */
function Option({
  icon,
  title,
  body,
  action,
  note,
}: {
  icon: BrandIconName;
  title: string;
  body: string;
  action?: React.ReactNode;
  note?: string;
}) {
  return (
    <li className="nf-card flex items-start gap-group p-card">
      <span className="block h-12 w-12 shrink-0">
        <BrandIcon name={icon} fill />
      </span>
      <div className="min-w-0 flex-1">
        <p className="nf-body font-semibold text-[var(--nf-content-primary)]">{title}</p>
        <p className="nf-body-sm mt-inline-tight leading-relaxed text-[var(--nf-content-secondary)]">
          {body}
        </p>
        {note && (
          <p className="nf-body-sm mt-inline leading-relaxed text-[var(--nf-content-muted)]">
            {note}
          </p>
        )}
        {action && <div className="mt-row">{action}</div>}
      </div>
    </li>
  );
}

export function PayPanel({ view }: { view: CheckoutView }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [slow, setSlow] = useState(false);
  /* Inline arrows rather than `useMemo(newKey, [])`. Passing the function by
     reference works today and the React compiler refuses to see through it, so
     it cannot keep the value stable when it takes over memoisation - which is
     the one thing these two exist for. They key the two result panels, so a key
     that changed between renders would remount a panel mid-payment. */
  const cardKey = useMemo(() => newKey(), []);
  const walletKey = useMemo(() => newKey(), []);
  const timers = useRef<number[]>([]);

  const busy =
    phase.kind === "card-starting" ||
    phase.kind === "card-redirecting" ||
    phase.kind === "wallet-paying";

  const clearTimers = () => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  /* Two clocks per attempt: one that admits the wait is long, one that stops
     pretending it is still a wait. Both are cleared the moment the server
     answers, so a fast payment never sees either. */
  const startClocks = (method: "card" | "wallet") => {
    clearTimers();
    setSlow(false);
    timers.current.push(window.setTimeout(() => setSlow(true), SLOW_MS));
    timers.current.push(
      window.setTimeout(() => {
        setSlow(false);
        setPhase({ kind: "stalled", method });
      }, GIVE_UP_MS),
    );
  };

  const payByCard = async () => {
    startClocks("card");
    setPhase({ kind: "card-starting" });
    const result = await startCardCheckout({
      bookingId: view.bookingId,
      idempotencyKey: cardKey,
    });
    if (result.ok && result.data) {
      setPhase({ kind: "card-redirecting" });
      window.location.assign(result.data.authorizationUrl);
      return;
    }
    clearTimers();
    setPhase({
      kind: "error",
      message: result.ok
        ? "The secure payment page could not be opened."
        : result.error,
    });
  };

  const payFromWallet = async () => {
    startClocks("wallet");
    setPhase({ kind: "wallet-paying" });
    const result = await payWithWallet({
      bookingId: view.bookingId,
      idempotencyKey: walletKey,
    });
    clearTimers();
    if (result.ok && result.data) {
      setPhase({ kind: "wallet-paid" });
      router.refresh();
      return;
    }
    setPhase({
      kind: "error",
      message: result.ok ? "The payment could not be completed." : result.error,
    });
  };

  const panel = (
    <section aria-labelledby="nf-checkout-pay">
      <h2 id="nf-checkout-pay" className="nf-h3">
        How would you like to pay?
      </h2>
      <ul className="mt-block grid gap-row">
        {view.cardAvailable ? (
          <Option
            icon="card-lock"
            title="Pay by card"
            body="A secure page in naira, then straight back here. Your card details never touch Vallo."
            action={
              /*
                THE AMOUNT IS NOT IN THE LABEL, AND IT WAS OVERFLOWING.

                `.nf-btn` is `white-space: nowrap` with no `overflow: hidden`,
                and the label was "Pay <amount> from my wallet" inside a full
                width button inside a row that already spends 48px on an object
                and a gap beside it. Reconstructed at 390px and measured: "Pay
                ₦95,000.00 by card" fits with one pixel to spare, "Pay
                ₦12,500,000.00 by card" overflows, and "Pay ₦1,250,000.00 from
                my wallet" overflows by 24 pixels, so a person could not read
                what they were about to pay on the largest amounts this
                platform handles.

                The total is already set at up to 60px directly above under
                "Total to pay", and it is repeated on the pinned bar and again
                on the confirmation. Three statements of one figure is enough;
                a fourth that clips is not a statement.
              */
              <Button
                variant="primary"
                full
                onClick={payByCard}
                disabled={busy}
                loading={phase.kind === "card-starting" || phase.kind === "card-redirecting"}
              >
                Pay by card
              </Button>
            }
          />
        ) : (
          <Option
            icon="card-lock"
            title="Pay by card"
            /* "Card payment switches on the moment payment keys land" was
               infrastructure jargon, printed to somebody trying to pay. This
               says what is true, what it costs them, and what to do instead. */
            body="Card payment is not available right now."
            /* "…or try again SHORTLY" is gone, and it was the last time this
               product named a schedule in a refusal on the money path. It is a
               milder relative of the banned "coming soon": a promise about a
               time nobody here can keep, told to somebody holding a card. The
               sentence loses the word and keeps the instruction, which is the
               only part the reader could act on anyway. */
            note="Your dates stay held and nothing has been charged. Pay from your wallet, or try the card again from here."
          />
        )}
        {view.walletCovers ? (
          <Option
            icon="wallet-secure"
            title="Pay from your Vallo wallet"
            body={`Your wallet holds ${view.walletBalanceDisplay}. Paying from it confirms this stay straight away.`}
            action={
              <Button
                variant="secondary"
                full
                onClick={payFromWallet}
                disabled={busy}
                loading={phase.kind === "wallet-paying"}
              >
                Pay from my wallet
              </Button>
            }
          />
        ) : (
          <Option
            icon="wallet-secure"
            title="Pay from your Vallo wallet"
            body={`Your wallet holds ${view.walletBalanceDisplay}, and this stay comes to ${view.totalDisplay}.`}
            note="Add money to your wallet first, or pay by card."
            action={
              <ButtonLink href="/wallet" variant="ghost" full trailingIcon="arrow-right">
                Open my wallet
              </ButtonLink>
            }
          />
        )}
      </ul>
      {/* `UiIcon` at 16 rather than a 16px `BrandIcon`. `docs/ICON_SYSTEM.md`
          says below 24 the plinth in the brand artwork collapses into a
          coloured square, and this row is otherwise all stroked glyphs, so the
          two tiers were sharing a line as well. */}
      {/*
        THE DECISION IS PINNED, AND THE PRIMITIVE THAT DOES IT WAS BUILT FOR
        THIS SCREEN AND NEVER USED ON IT.

        `components/ui/ActionBar.tsx` names checkout in its own docstring as
        "the screen that had no pinned bar at all", and it was imported by
        exactly one file on the whole platform, which was not this one. The pay
        buttons sat below a summary card, below a step bar, below a countdown,
        and scrolled out of view: on a 390px screen the money decision was
        somewhere above the fold and somewhere below it depending on where a
        thumb had last stopped.

        BOTH METHODS STAY IN THE BODY. Only the chosen one is pinned, with the
        total beside it, so the bar answers "how much, and do it" and the cards
        above keep answering "which way". Pinning both would be two primary
        actions on the bottom edge, which is how somebody taps the wrong one.
      */}
      <div
        aria-hidden="true"
        className="h-[5.5rem]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      />
      <ActionBar>
        <p className="flex min-w-0 flex-1 flex-col">
          <span className="nf-caption text-[var(--nf-content-muted)]">Total to pay</span>
          <span className="min-w-0">
            <Amount
              minorUnits={view.totalMinor}
              locale={view.locale}
              currency={view.currency}
              showFraction
              className="text-[var(--nf-text-body-lg)] font-bold leading-none tracking-[-0.02em] text-[var(--nf-content-primary)]"
              secondaryClassName="text-[0.62em] font-semibold text-[var(--nf-content-muted)]"
            />
          </span>
        </p>
        {view.cardAvailable ? (
          <Button
            variant="primary"
            onClick={payByCard}
            disabled={busy}
            loading={phase.kind === "card-starting" || phase.kind === "card-redirecting"}
            className="shrink-0"
          >
            Pay by card
          </Button>
        ) : view.walletCovers ? (
          <Button
            variant="primary"
            onClick={payFromWallet}
            disabled={busy}
            loading={phase.kind === "wallet-paying"}
            className="shrink-0"
          >
            Pay from my wallet
          </Button>
        ) : (
          /* Neither method can complete this payment right now, so the bar
             offers the one step that would change that rather than a disabled
             button that answers nothing. */
          <ButtonLink href="/wallet" variant="primary" className="shrink-0">
            Add money
          </ButtonLink>
        )}
      </ActionBar>

      <p className="nf-caption mt-block flex items-start gap-inline leading-relaxed text-[var(--nf-content-muted)]">
        <UiIcon name="verified" size="xs" className="mt-3xs shrink-0" />
        <span>
          Money moves inside Vallo, so the stay and the payment stay attached to each other. Keep
          every conversation and every payment on the platform.
        </span>
      </p>
    </section>
  );

  /* The fact every one of these sheets carries. Money on its own is not a
     receipt: the property is what makes it one. */
  const fact = {
    amountMinor: view.totalMinor,
    currency: view.currency,
    subject: view.title,
  };

  return (
    <>
      {/* ----------------------------------------------- what just happened */}
      <ResultSheet
        open={phase.kind === "wallet-paid"}
        onOpenChange={() => setPhase({ kind: "idle" })}
        state="sent"
        verdict="Payment sent"
        fact={fact}
        locale={view.locale}
        consequence="The agent has been paid and these dates are yours."
        actions={[
          { label: "See your stays", href: "/bookings", tone: "primary" },
          { label: "Back to the stay", href: `/listing/${view.listingId}`, tone: "quiet" },
        ]}
        footnote="Paid inside Vallo, recorded to the kobo."
      />

      <ResultSheet
        open={busy}
        onOpenChange={() => undefined}
        state="pending"
        /* Blocking on purpose and only here. The outcome is genuinely unknown,
           and a person who dismisses this and taps Pay again is trying to pay
           twice. Nothing else in this component blocks. */
        blocking
        verdict={phase.kind === "wallet-paying" ? "Paying from your wallet" : "Opening your payment page"}
        fact={fact}
        locale={view.locale}
        consequence={
          slow
            ? "This is taking longer than usual. Nothing has moved yet and nothing has been charged. Stay here."
            : phase.kind === "wallet-paying"
              ? "Nothing leaves your wallet until this completes."
              : "Nothing has been charged yet."
        }
      />

      <ResultSheet
        open={phase.kind === "stalled"}
        onOpenChange={() => setPhase({ kind: "idle" })}
        state="pending"
        verdict="We have not heard back"
        fact={fact}
        locale={view.locale}
        consequence={
          phase.kind === "stalled" && phase.method === "wallet"
            ? "Your wallet balance has not changed. Check your stays before you try again, so you do not pay twice."
            : "Your card has not been charged. Check your stays before you try again, so you do not pay twice."
        }
        actions={[
          { label: "See your stays", href: "/bookings", tone: "primary" },
          { label: "Try again", onClick: () => setPhase({ kind: "idle" }), tone: "quiet" },
        ]}
      />

      {/*
        A FAILED PAYMENT IS ROSE, IT CARRIES THE AMOUNT, AND IT SAYS WHETHER
        THE CARD WAS CHARGED.

        It was already rose and already `role="alert"`, which was the lead's
        own fix, and it was still 13px of text on a plain card with no heading,
        no amount and no statement about the money. A person who has just tried
        to pay rent is asking one question and it was not being answered.
      */}
      <ResultSheet
        open={phase.kind === "error"}
        onOpenChange={() => setPhase({ kind: "idle" })}
        state="failed"
        verdict="Payment not completed"
        fact={fact}
        locale={view.locale}
        /* THE SERVER'S STRING NO LONGER REACHES THE READER UNFILTERED. Every
           refusal in the action, and in the session, flag, idempotency and
           rate-limit helpers it calls, could put any sentence in front of
           somebody who has just tried to pay rent. `payment-copy` rewrites the
           two that carry infrastructure jargon, drops anything that is not
           prose a person wrote, and always leaves the money sentence standing. */
        consequence={failureConsequence(
          phase.kind === "error" ? phase.message : null,
          "Nothing has been taken from your card or your wallet.",
        )}
        actions={[
          { label: "Try again", onClick: () => setPhase({ kind: "idle" }), tone: "primary" },
          { label: "Get help", href: "/help", tone: "quiet" },
        ]}
      />

      {panel}
    </>
  );
}

