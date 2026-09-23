"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { payWithWallet, startCardCheckout } from "@/lib/bookings/checkout";
import type { CheckoutView } from "@/lib/bookings/checkout-view";
import { ResultSheet } from "@/components/app/ResultSheet";
import { PaystackCheckout } from "@/components/app/payments/PaystackCheckout";
import { paymentState } from "@/lib/payments/payment-state";
import { SavedCardPicker } from "@/components/app/payments/SavedCardPicker";
import { preselectedCardId } from "@/components/app/payments/format";
import { savedCardMoment, type SavedCardPhase } from "@/components/app/payments/saved-card-copy";
import type { PaymentMethod } from "@/lib/payments/methods";
import type { ChargeSavedCardOutcome } from "@/lib/payments/charge-saved-card";
import type { ActionResult } from "@/lib/actions/envelope";
import { failureConsequence } from "./payment-copy";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ActionBar } from "@/components/ui/ActionBar";
import { Amount } from "@/components/ui/Amount";
import { Panel } from "@/components/ui/Panel";
import { IconPlate } from "@/components/ui/IconPlate";
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
 * stayed disabled with no explanation, and there was no cancel. On a Lagos
 * network that is not an edge case. There is a soft message at ten seconds
 * and a terminal state at twenty-five, and both say whether the money moved.
 *
 * THE SECOND HALF OF THAT PARAGRAPH IS NOW OBSOLETE AND HAS BEEN REMOVED
 * RATHER THAN LEFT TO MISLEAD. It described `window.location.assign` being
 * slow or blocked, and `card-redirecting` spinning indefinitely behind it.
 * Neither exists: there is no navigation, and `checkout-open` hands the wait
 * to `PaystackCheckout`, which has its own clock and its own honest ending.
 * The two clocks here now cover only the server round trip, which is the only
 * thing left for them to cover.
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

/**
 * A CHECKOUT THAT OPENS ON THIS PAGE, NOT ON SOMEBODY ELSE'S.
 *
 * `card-redirecting` is gone and `checkout-open` has taken its place. The old
 * phase existed to cover the gap between the tap and a full-page navigation to
 * checkout.paystack.com; there is no navigation any more, so what the phase
 * carries now is the handle the in-app checkout resumes with. Both the fresh
 * card path and the saved-card 3-D Secure path arrive at the same phase with
 * the same shape, because they are the same transaction resumed the same way,
 * and the 3DS one keeps the caller's original reference.
 */
type Phase =
  | { kind: "idle" }
  | { kind: "saved-card-charging" }
  | { kind: "saved-card-hosted"; authorizationUrl: string; accessCode: string; reference: string }
  | { kind: "card-starting" }
  | { kind: "checkout-open"; accessCode: string; reference: string; authorizationUrl: string }
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
    <Panel as="li" variant="card" className="isolate flex-row items-start gap-group">
      <IconPlate size="lg">
        <span className="block h-8 w-8">
          <BrandIcon name={icon} fill tile={false} />
        </span>
      </IconPlate>
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
    </Panel>
  );
}

export function PayPanel({
  view,
  savedCards = [],
  chargeSavedCard,
}: {
  view: CheckoutView;
  /**
   * The caller's reusable cards, read on the server by `listPaymentMethods`.
   * Empty by default, so a page that does not pass them draws no saved-card
   * option rather than an empty group.
   */
  savedCards?: PaymentMethod[];
  /**
   * THE ONE THING THIS SCREEN CANNOT DO FOR ITSELF, AND IT IS A PROP FOR A
   * REASON.
   *
   * `lib/payments/charge-saved-card.ts` is deliberately NOT a server action:
   * "a function that charges a chosen amount against a chosen reference must
   * never be one". It is imported by the payment action that already decided
   * what is owed and under which reference, and the action that owes this
   * booking is `lib/bookings/checkout.ts`, where the payable guard, the
   * idempotency wrapper and the booking reference already live and are all
   * private to that module.
   *
   * So the button cannot be wired from here without re-implementing the money
   * orchestration, which is the one thing never worth duplicating. When that
   * module exports, say, `payWithSavedCard({ bookingId, methodId,
   * idempotencyKey })`, the page passes it here and every state below is
   * already built and tested. Until it does, no saved-card control renders at
   * all: a pay button that cannot pay is worse than no button.
   */
  chargeSavedCard?: (methodId: string) => Promise<ActionResult<ChargeSavedCardOutcome>>;
}) {
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

  /* The saved card offered first: the default when it can be charged. Null
     means nothing chargeable, so the whole option stays off the screen. */
  const [chosenCard, setChosenCard] = useState<string | null>(() =>
    preselectedCardId(savedCards),
  );
  const savedCardsOffered = Boolean(chargeSavedCard) && chosenCard !== null;
  /* The sheet below reads the moment three times (state, verdict, consequence),
     so the phase it reads is named once rather than reconstructed per call. */
  const hostedPhase: SavedCardPhase =
    phase.kind === "saved-card-hosted"
      ? { kind: "needs_hosted", authorizationUrl: phase.authorizationUrl }
      : { kind: "needs_hosted", authorizationUrl: "" };

  const busy =
    phase.kind === "saved-card-charging" ||
    phase.kind === "card-starting" ||
    phase.kind === "checkout-open" ||
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

  /**
   * Charging the saved card, and the 3DS rule in one place.
   *
   * `chargeSavedCard` answers with `charged` or with `needs_hosted_checkout`,
   * and the second is NOT a failure: the bank has asked to authenticate, the
   * reference is the same one, and the only honest move is to say so and go
   * there once. This never retries the saved card, because a loop of declined
   * charges is how a card gets blocked and a person gets charged twice.
   */
  const payBySavedCard = async () => {
    if (!chargeSavedCard || !chosenCard) return;
    startClocks("card");
    setPhase({ kind: "saved-card-charging" });
    const result = await chargeSavedCard(chosenCard);
    clearTimers();

    if (!result.ok) {
      setPhase({ kind: "error", message: result.error });
      return;
    }
    if (result.data.kind === "needs_hosted_checkout") {
      /* The bank wants to authenticate. Same reference, same transaction,
         opened in our own window rather than on the bank's own page. */
      setPhase({
        kind: "saved-card-hosted",
        authorizationUrl: result.data.authorizationUrl,
        accessCode: result.data.accessCode,
        reference: result.data.reference,
      });
      return;
    }
    /* Charged. The booking is settled server side, so the truth is on the
       server and this asks for it rather than drawing an optimistic success. */
    setPhase({ kind: "wallet-paid" });
    router.refresh();
  };

  const payByCard = async () => {
    startClocks("card");
    setPhase({ kind: "card-starting" });
    const result = await startCardCheckout({
      bookingId: view.bookingId,
      idempotencyKey: cardKey,
    });
    if (result.ok && result.data) {
      /* The clocks stop here. They covered the gap between the tap and a
         navigation; the checkout has its own, and leaving these running would
         declare the payment stalled while the person was typing their PIN. */
      clearTimers();
      setPhase({
        kind: "checkout-open",
        accessCode: result.data.accessCode,
        reference: result.data.reference,
        authorizationUrl: result.data.authorizationUrl,
      });
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
        {/*
          PAY WITH A SAVED CARD, ABOVE THE HOSTED REDIRECT.

          It is first because it is the shortest path for somebody who has
          already trusted us with a card: one tap against three fields and a
          round trip to another domain. It renders only when there is a card
          that can actually be charged AND a way to charge it; see the
          `chargeSavedCard` prop for why the second half is not this file's to
          supply. Nothing about a saved card ever appears in a third-party
          lane, which does not exist yet and is forbidden them when it does.
        */}
        {savedCardsOffered && (
          <Option
            icon="card-lock"
            title="Pay with a saved card"
            body="The card you saved, charged straight away. Your card details still never touch Vallo."
            action={
              <div>
                <SavedCardPicker
                  cards={savedCards}
                  value={chosenCard}
                  onChange={setChosenCard}
                  disabled={busy}
                />
                <Button
                  variant="primary"
                  full
                  className="mt-row"
                  onClick={payBySavedCard}
                  disabled={busy || chosenCard === null}
                  loading={phase.kind === "saved-card-charging"}
                >
                  Pay with this card
                </Button>
              </div>
            }
          />
        )}
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
                loading={phase.kind === "card-starting"}
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
              className="text-[length:var(--nf-text-body-lg)] font-bold leading-none tracking-[-0.02em] text-[var(--nf-content-primary)]"
              secondaryClassName="text-[0.62em] font-semibold text-[var(--nf-content-muted)]"
            />
          </span>
        </p>
        {view.cardAvailable ? (
          <Button
            variant="primary"
            onClick={payByCard}
            disabled={busy}
            loading={phase.kind === "card-starting"}
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
      {/*
        THE CHECKOUT, ON THIS PAGE.

        One component for both card paths. It draws nothing while Paystack's
        iframe is up, because that iframe is fixed and full viewport and a
        sheet of ours behind it would be a second dialog a screen reader
        announces over the one the person is using. What is underneath is our
        page, and the address bar has never stopped being ours.

        `paymentState` is what settles it: our own `transactions` row for this
        reference, polled on a backoff, never a call to Paystack from a
        browser. `onSuccess` from the popup only starts that asking.
      */}
      {phase.kind === "checkout-open" && (
        <PaystackCheckout
          key={phase.reference}
          accessCode={phase.accessCode}
          reference={phase.reference}
          authorizationUrl={phase.authorizationUrl}
          amountMinor={view.totalMinor}
          locale={view.locale}
          confirm={async (reference) => {
            const state = await paymentState(reference);
            return state.ok ? state.data : "pending";
          }}
          onPaid={() => {
            setPhase({ kind: "wallet-paid" });
            router.refresh();
          }}
          /* Cancelled is not a failure and it is not a stall. The reference
             stays open, so coming back resumes rather than double charges. */
          onCancelled={() => setPhase({ kind: "idle" })}
          onFailed={(message) => setPhase({ kind: "error", message })}
        />
      )}

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
        verdict={
          phase.kind === "wallet-paying"
            ? "Paying from your wallet"
            : phase.kind === "saved-card-charging"
              ? savedCardMoment({ kind: "charging" }, view.totalDisplay).verdict
              : "Opening your payment page"
        }
        fact={fact}
        locale={view.locale}
        consequence={
          slow
            ? "This is taking longer than usual. Nothing has moved yet and nothing has been charged. Stay here."
            : phase.kind === "wallet-paying"
              ? "Nothing leaves your wallet until this completes."
              : phase.kind === "saved-card-charging"
                ? savedCardMoment({ kind: "charging" }, view.totalDisplay).consequence
                : "Nothing has been charged yet."
        }
      />

      {/*
        THE BANK WANTS TO CHECK, AND THIS IS THE ONE STATE THAT MUST NOT READ
        AS A FAILURE.

        `review` rather than `failed`: cyan, with a mark that differs from
        pending's, so it is told apart by shape and word rather than by hue. It
        says nothing has been charged, because nothing has, and the only action
        goes to the bank's own page under the SAME reference. There is no
        "try again with the saved card" here by design.
      */}
      <ResultSheet
        open={phase.kind === "saved-card-hosted"}
        onOpenChange={() => setPhase({ kind: "idle" })}
        state={savedCardMoment(hostedPhase, view.totalDisplay).state}
        verdict={savedCardMoment(hostedPhase, view.totalDisplay).verdict}
        fact={fact}
        locale={view.locale}
        consequence={savedCardMoment(hostedPhase, view.totalDisplay).consequence}
        actions={[
          {
            label: "Continue to your bank",
            onClick: () => {
              /* The bank's own authentication page renders inside the checkout
                 iframe, on this page, under the same reference. Every 3-D
                 Secure challenge on this platform used to be served by
                 throwing the person at a hosted page. */
              if (phase.kind === "saved-card-hosted") {
                setPhase({
                  kind: "checkout-open",
                  accessCode: phase.accessCode,
                  reference: phase.reference,
                  authorizationUrl: phase.authorizationUrl,
                });
              }
            },
            tone: "primary",
          },
          { label: "Pay another way", onClick: () => setPhase({ kind: "idle" }), tone: "quiet" },
        ]}
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

