"use client";

import { useState, useTransition } from "react";

import {
  cancelHeldPayment,
  confirmHeldPayment,
  disputeHeldPayment,
  fileHeldPaymentFact,
  requestHeldPaymentRelease,
} from "@/lib/escrow/actions";
import type { EscrowState, Party } from "@/lib/escrow/copy";

/**
 * The two or three things a person can actually do, and nothing they cannot.
 *
 * WHICH CONTROLS APPEAR IS A FUNCTION OF THE STATE AND THE SIDE, and the
 * database refuses everything this component does not offer, so a control that
 * appears in error is refused rather than obeyed. That is the order the guard
 * has to be in: the screen is a convenience, the function is the rule.
 *
 * EVERY ANSWER IS A SENTENCE. A refusal the database decided comes back
 * through the server action already turned into English, and it says that
 * nothing moved, which is the first thing somebody in the middle of a money
 * action wants to know.
 *
 * ONE ACTION AT A TIME. A transition disables the whole row while one is in
 * flight, because two taps on "confirm" is the shape of every double spend
 * report ever filed, and because the database answering `duplicate` correctly
 * is not a reason to let a person send it twice.
 */
export function HeldPaymentControls({
  id,
  state,
  viewer,
}: {
  id: string;
  state: EscrowState;
  viewer: Party;
}): React.ReactElement | null {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [arguing, setArguing] = useState(false);

  function run(work: () => Promise<{ ok: boolean; error?: string }>): void {
    setMessage(null);
    start(async () => {
      const result = await work();
      setMessage(result.ok ? null : (result.error ?? "That did not work and nothing was moved."));
      if (result.ok) setArguing(false);
    });
  }

  const payer = viewer === "payer";
  const controls: React.ReactElement[] = [];

  /* A proposal nobody has funded. Either side may withdraw it. */
  if (state === "INITIATED" || state === "FUNDED") {
    controls.push(
      <button
        key="cancel"
        type="button"
        className="nf-esc-action"
        disabled={pending}
        onClick={() => run(() => cancelHeldPayment({ id }))}
      >
        {payer ? "Withdraw it" : "Decline it"}
      </button>,
    );
  }

  /* Money is set aside. The payer may confirm early; the payee may ask. */
  if (state === "HELD") {
    if (payer) {
      controls.push(
        <button
          key="confirm"
          type="button"
          className="nf-esc-action"
          disabled={pending}
          onClick={() => run(() => confirmHeldPayment({ id }))}
        >
          Pay it out now
        </button>,
      );
    } else {
      controls.push(
        <button
          key="ask"
          type="button"
          className="nf-esc-action"
          disabled={pending}
          onClick={() => run(() => requestHeldPaymentRelease({ id }))}
        >
          Ask to be paid
        </button>,
      );
    }
  }

  /* A payout has been asked for. The other side confirms or objects. */
  if (state === "RELEASE_REQUESTED" && payer) {
    controls.push(
      <button
        key="confirm"
        type="button"
        className="nf-esc-action"
        disabled={pending}
        onClick={() => run(() => confirmHeldPayment({ id }))}
      >
        Confirm the payout
      </button>,
    );
  }

  /* Objecting is open to both sides while the money is still set aside. */
  if (state === "HELD" || state === "RELEASE_REQUESTED") {
    controls.push(
      <button
        key="object"
        type="button"
        className="nf-esc-action"
        disabled={pending}
        onClick={() => setArguing((was) => !was)}
      >
        Say what is wrong
      </button>,
    );
  }

  /* Under review. Nothing to decide, but facts can still be filed. */
  if (state === "DISPUTED") {
    controls.push(
      <button
        key="fact"
        type="button"
        className="nf-esc-action"
        disabled={pending}
        onClick={() =>
          run(() =>
            fileHeldPaymentFact({
              id,
              fact: payer ? "service_not_delivered" : "service_delivered",
            }),
          )
        }
      >
        {payer ? "Say the work was not done" : "Say the work was done"}
      </button>,
    );
  }

  if (controls.length === 0 && !message) return null;

  return (
    <div>
      <div className="nf-esc-actions">{controls}</div>

      {arguing ? (
        <div className="nf-esc-when">
          <label className="nf-esc-when-label" htmlFor={`why-${id}`}>
            What went wrong
          </label>
          <textarea
            id={`why-${id}`}
            className="nf-esc-action"
            rows={3}
            maxLength={400}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="One or two sentences somebody can act on."
          />
          <button
            type="button"
            className="nf-esc-action"
            disabled={pending || reason.trim().length < 4}
            onClick={() => run(() => disputeHeldPayment({ id, reason: reason.trim() }))}
          >
            Send it to Vallo
          </button>
        </div>
      ) : null}

      {message ? (
        <p className="nf-esc-line" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
