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
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { DEFAULT_LOCALE, getDictionary } from "@vallo/i18n";
import { useMoneyStepUp } from "@/components/app/wallet/MoneyStepUp";

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
  /* V-81: paying held money out asks for the phone lock, when there is one. */
  const lock = useMoneyStepUp(DEFAULT_LOCALE);
  const confirmOut = async () => {
    const stepUp = await lock.prove({ kind: "escrow_confirm", target: id });
    if (stepUp === null) return { ok: false, error: getDictionary(DEFAULT_LOCALE).platform.moneyLock.notConfirmed };
    return confirmHeldPayment({ id, stepUp: stepUp || undefined });
  };

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
      <Button
        key="cancel"
        variant="secondary"
        disabled={pending}
        onClick={() => run(() => cancelHeldPayment({ id }))}
      >
        {payer ? "Withdraw it" : "Decline it"}
      </Button>,
    );
  }

  /* Money is set aside. The payer may confirm early; the payee may ask. */
  if (state === "HELD") {
    if (payer) {
      controls.push(
        <Button
          key="confirm"
          variant="primary"
          disabled={pending}
          onClick={() => run(confirmOut)}
        >
          Pay it out now
        </Button>,
      );
    } else {
      controls.push(
        <Button
          key="ask"
          variant="primary"
          disabled={pending}
          onClick={() => run(() => requestHeldPaymentRelease({ id }))}
        >
          Ask to be paid
        </Button>,
      );
    }
  }

  /* A payout has been asked for. The other side confirms or objects. */
  if (state === "RELEASE_REQUESTED" && payer) {
    controls.push(
      <Button
        key="confirm"
        variant="primary"
        disabled={pending}
        onClick={() => run(confirmOut)}
      >
        Confirm the payout
      </Button>,
    );
  }

  /* Objecting is open to both sides while the money is still set aside. */
  if (state === "HELD" || state === "RELEASE_REQUESTED") {
    controls.push(
      <Button
        key="object"
        variant="secondary"
        disabled={pending}
        onClick={() => setArguing((was) => !was)}
      >
        Say what is wrong
      </Button>,
    );
  }

  /* Under review. Nothing to decide, but facts can still be filed. */
  if (state === "DISPUTED") {
    controls.push(
      <Button
        key="fact"
        variant="secondary"
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
      </Button>,
    );
  }

  if (controls.length === 0 && !message) return null;

  return (
    <div className="nf-esc-controls">
      {lock.sheet}
      <div className="nf-esc-actions">{controls}</div>

      {arguing ? (
        <Panel as="div" variant="card" className="nf-esc-form">
          <label className="nf-esc-when-label" htmlFor={`why-${id}`}>
            What went wrong
          </label>
          <textarea
            id={`why-${id}`}
            className="nf-field"
            rows={3}
            maxLength={400}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="One or two sentences somebody can act on."
          />
          <Button
            variant="primary"
            disabled={pending || reason.trim().length < 4}
            onClick={() => run(() => disputeHeldPayment({ id, reason: reason.trim() }))}
          >
            Send it to Vallo
          </Button>
        </Panel>
      ) : null}

      {message ? (
        <p className="nf-esc-line" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
