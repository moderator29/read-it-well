"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * How long a money call is allowed to take, and what the screen says when it
 * takes longer.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS ITS OWN MODULE.
 *
 * It was two functions inside `WalletDeck.tsx`, which made it the one surface in
 * the product that a person could only reach by moving a quarter of a million
 * naira on a connection that then failed. It was written, type-checked, reported
 * as NOT VERIFIED, and never looked at.
 *
 * Out here it can be mounted in `/gallery` with fixtures, which is the only way
 * anybody was ever going to read this copy on a screen before a real person did.
 * `F2-018` also names three money paths and this is two of them; the third,
 * `PaymentReturn`, has its own clocks with the same two intervals, and if those
 * ever want to be one thing this is where it goes.
 */
/**
 * WITHDRAW AND TRANSFER HAD NO TIMEOUT, AND THEY ARE THE TWO PATHS THAT MOVE
 * SOMEBODY'S OWN MONEY OUT.
 *
 * Both are `useActionState`, so the only thing a hanging action produced was a
 * spinner inside a disabled button for as long as the reader was willing to sit
 * there. No sentence, no statement about the balance, no route to the record.
 * On a Lagos network a request that never settles is ordinary rather than an
 * edge case, and the person watching it is the one who has just asked us to
 * send a quarter of a million naira to their bank. F2-018.
 *
 * The two intervals are the ones the card path already uses, named the same, so
 * the product waits for the same length of time everywhere money is moving.
 *
 * WHAT THE TERMINAL STATE MAY NOT DO IS OFFER A RETRY. `startCardCheckout`
 * mints an idempotency key per attempt and can safely say "try again";
 * `withdraw` and `transferToUser` take no key and generate their reference
 * server-side, so a second submit is a second movement; both carry the long
 * version of this note in `lib/wallet/actions.ts`, because the reason lives
 * with the functions and not with this panel. The action is also
 * still genuinely in flight - nothing here can cancel a server action - so the
 * honest terminal state says what is and is not known, sends the reader to the
 * one page that holds the answer, and tells them not to send it twice. If the
 * answer does arrive at forty seconds the receipt replaces this on its own.
 */
export const SLOW_MS = 10_000;
export const GIVE_UP_MS = 25_000;

export type Wait = "quick" | "slow" | "stalled";

export function useMoneyWait(pending: boolean): Wait {
  const [wait, setWait] = useState<Wait>("quick");
  const [watching, setWatching] = useState(pending);

  /* React's documented "adjust state when a prop changes" pattern rather than
     an effect, and the difference is visible. A second attempt after a stalled
     first one has to begin at "quick" before anything paints; resetting in an
     effect paints the old terminal panel over the new attempt for one frame,
     which on this screen reads as "it has failed again already". */
  if (watching !== pending) {
    setWatching(pending);
    setWait("quick");
  }

  useEffect(() => {
    if (!pending) return;
    const slow = window.setTimeout(() => setWait("slow"), SLOW_MS);
    const giveUp = window.setTimeout(() => setWait("stalled"), GIVE_UP_MS);
    return () => {
      window.clearTimeout(slow);
      window.clearTimeout(giveUp);
    };
  }, [pending]);

  /* Nothing is waiting when nothing is in flight, whatever the last attempt
     ended on. */
  return pending ? wait : "quick";
}

/**
 * What a long wait says, and then what a wait that has stopped being one says.
 *
 * Cyan rather than rose, because nothing has failed: `--nf-status-pending` is
 * the token this product reserves for "still going through" and that is exactly
 * what is true here. A stalled request painted as an error would be us telling
 * somebody their money did not move when we do not know that.
 */
export function WaitNotice({
  wait,
  movement,
  onDone,
}: {
  wait: Wait;
  movement: "withdrawal" | "transfer";
  onDone: () => void;
}) {
  if (wait === "quick") return null;

  if (wait === "slow") {
    return (
      <p
        role="status"
        aria-live="polite"
        className="nf-body-sm mt-row leading-relaxed text-[var(--nf-content-muted)]"
      >
        This is taking longer than usual. Nothing has left your wallet yet, and nothing has been
        sent twice. Stay here.
      </p>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="nf-body-sm mt-row rounded-[var(--nf-radius-lg)] border border-[color-mix(in_oklab,var(--nf-status-pending)_45%,transparent)] bg-[var(--nf-status-pending-surface)] p-row leading-relaxed text-[var(--nf-content-secondary)]"
    >
      <span className="flex items-start gap-inline">
        <UiIcon
          name="history"
          size="xs"
          className="mt-3xs shrink-0 text-[var(--nf-status-pending)]"
        />
        <span className="min-w-0">
          <span className="block font-semibold text-[var(--nf-status-pending)]">
            We have not heard back
          </span>
          <span className="mt-3xs block">
            {movement === "withdrawal"
              ? "Do not send this again. If the withdrawal started it is at the top of your history as pending, and if it did not, your balance is untouched."
              : "Do not send this again. If the transfer went through it is at the top of your history, and if it did not, your balance is untouched."}
          </span>
        </span>
      </span>
      <span className="mt-block flex flex-col items-stretch gap-inline">
        <ButtonLink href="/wallet/transactions" variant="primary" full>
          See your history
        </ButtonLink>
        <Button type="button" variant="ghost" full onClick={onDone}>
          Close
        </Button>
      </span>
    </div>
  );
}
