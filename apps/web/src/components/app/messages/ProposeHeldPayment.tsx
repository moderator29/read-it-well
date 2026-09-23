"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  cancelHeldPayment,
  fundHeldPaymentProposal,
  proposeHeldPayment,
} from "@/lib/escrow/actions";
import {
  PROPOSAL_EXPLAINER,
  PROPOSAL_OPENER,
  PURPOSE_LABEL,
  STATE_LABEL,
  amountLine,
  nairaToKobo,
  payoutDateIfFundedNow,
  proposalStanding,
  stateLine,
  type EscrowState,
  type Party,
} from "@/lib/escrow/copy";

/**
 * THE PROPOSAL, INSIDE THE THREAD THE TWO PEOPLE ARE ALREADY IN.
 *
 * This is the entry point the whole feature hangs off. `/escrow` lists
 * agreements and `/escrow/[id]` is one of them, and until this existed there
 * was no way to make one: both surfaces could only ever have been empty.
 *
 * IT IS IN THE THREAD BECAUSE THAT IS WHERE THE CONVERSATION IS. Part 4.2 of
 * the research file puts it here rather than on a listing page, because the
 * thread is where the two people already are and where the safety scan
 * already runs. The same moment that flags payment talk is the moment to offer
 * the alternative.
 *
 * NOTHING HERE IS A DARK PATTERN, and each absence is deliberate. There is no
 * default amount, pulled from the listing or anywhere else: the person types
 * the figure. There is nothing pre-ticked. There is no countdown on a proposal
 * nobody has accepted. No sentence implies the other person has agreed to
 * anything. The word is "proposed" and never "requested", because a request
 * carries an obligation that a proposal does not. Declining is a control of
 * the same weight as accepting, beside it, not hidden behind a link.
 *
 * THE PURPOSE IS STATED, NOT CHOSEN. Only the agency fee may be set aside
 * today, so a menu with one item in it would be a choice that is not a choice.
 * The screen says what this is for as a fact.
 *
 * NAIRA IN THE BOX, INTEGER KOBO ON THE WIRE. The conversion happens once,
 * here, through a parser that refuses anything that is not a plain figure. No
 * float touches the amount at any point: the naira are parsed as digits and
 * the kobo as two more, and they are added as integers.
 *
 * IT DOES NOT RENDER AT ALL WHEN THE KILL SWITCH IS OFF. The thread page asks
 * `heldPaymentsAreOpen()` on the server and does not render this component
 * when the answer is no, which it is by default and on any failed read. That
 * is rule 11 as well as the switch: a feature that cannot operate is promised
 * to nobody, not even as a disabled button.
 */

/** The open agreement this thread is carrying, when it is carrying one. */
export type ThreadAgreement = {
  id: string;
  state: EscrowState;
  amountMinor: number;
  purpose: keyof typeof PURPOSE_LABEL;
  viewer: Party;
};

export function ProposeHeldPayment({
  conversationId,
  counterpartyId,
  counterpartName,
  agreement,
}: {
  conversationId: string;
  counterpartyId: string;
  counterpartName: string;
  agreement: ThreadAgreement | null;
}): React.ReactElement | null {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [iPay, setIPay] = useState<boolean | null>(null);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function run(work: () => Promise<{ ok: boolean; error?: string }>): void {
    setMessage(null);
    start(async () => {
      const result = await work();
      if (result.ok) {
        setOpen(false);
        setAmount("");
        setIPay(null);
      } else {
        setMessage(result.error ?? "That did not work and nothing was moved.");
      }
    });
  }

  /* ------------------------------------------- an agreement already exists */
  if (agreement) {
    const proposed = agreement.state === "INITIATED";
    const payer = agreement.viewer === "payer";

    return (
      <div className="nf-esc-thread" role="group" aria-label="Held payment">
        <p className="nf-esc-thread-head">
          <span className="nf-esc-thread-amount nf-numeric">
            {amountLine(agreement.amountMinor)}
          </span>
          <span className="nf-esc-thread-state">{STATE_LABEL[agreement.state]}</span>
        </p>
        <p className="nf-esc-line">
          {proposed ? proposalStanding(agreement.viewer) : stateLine(agreement.state, agreement.viewer)}
        </p>

        <div className="nf-esc-actions">
          {proposed && payer ? (
            <button
              type="button"
              className="nf-esc-action"
              disabled={pending}
              onClick={() => run(() => fundHeldPaymentProposal({ id: agreement.id }))}
            >
              Set this money aside
            </button>
          ) : null}
          {proposed ? (
            <button
              type="button"
              className="nf-esc-action"
              disabled={pending}
              onClick={() => run(() => cancelHeldPayment({ id: agreement.id }))}
            >
              {payer ? "Decline it" : "Withdraw it"}
            </button>
          ) : null}
          <Link className="nf-esc-action" href={`/escrow/${agreement.id}`}>
            Open it
          </Link>
        </div>

        {proposed && payer ? (
          <p className="nf-esc-line">{payoutDateIfFundedNow()}</p>
        ) : null}

        {message ? (
          <p className="nf-esc-line" role="alert">
            {message}
          </p>
        ) : null}
      </div>
    );
  }

  /* -------------------------------------------------------- the composer */
  if (!open) {
    return (
      <div className="nf-esc-thread">
        <button
          type="button"
          className="nf-esc-action"
          disabled={pending}
          onClick={() => {
            setOpen(true);
            setMessage(null);
          }}
        >
          {PROPOSAL_OPENER}
        </button>
      </div>
    );
  }

  const parsed = nairaToKobo(amount);

  return (
    <div className="nf-esc-thread" role="group" aria-label="Propose a held payment">
      <p className="nf-esc-thread-head">{PROPOSAL_OPENER}</p>
      <p className="nf-esc-line">{PROPOSAL_EXPLAINER}</p>
      <p className="nf-esc-line">
        This is for an agency fee. It is the only kind of payment that can be set aside here
        today.
      </p>

      <fieldset className="nf-esc-when">
        <legend className="nf-esc-when-label">Who pays</legend>
        <label className="nf-esc-choice" htmlFor={`pay-me-${conversationId}`}>
          <input
            id={`pay-me-${conversationId}`}
            type="radio"
            name={`who-pays-${conversationId}`}
            checked={iPay === true}
            onChange={() => setIPay(true)}
          />
          <span>I pay {counterpartName}</span>
        </label>
        <label className="nf-esc-choice" htmlFor={`pay-them-${conversationId}`}>
          <input
            id={`pay-them-${conversationId}`}
            type="radio"
            name={`who-pays-${conversationId}`}
            checked={iPay === false}
            onChange={() => setIPay(false)}
          />
          <span>{counterpartName} pays me</span>
        </label>
      </fieldset>

      <label className="nf-esc-when-label" htmlFor={`amount-${conversationId}`}>
        How much, in naira
      </label>
      <input
        id={`amount-${conversationId}`}
        type="text"
        inputMode="decimal"
        className="nf-esc-field nf-numeric"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        placeholder="250000"
        autoComplete="off"
      />
      {parsed !== null ? <p className="nf-esc-line">{amountLine(parsed)}</p> : null}

      <div className="nf-esc-actions">
        <button
          type="button"
          className="nf-esc-action"
          disabled={pending || iPay === null || parsed === null}
          onClick={() => {
            if (iPay === null || parsed === null) return;
            run(() =>
              proposeHeldPayment({
                conversationId,
                counterpartyId,
                purpose: "agency_fee",
                amountMinor: parsed,
                iPay,
              }),
            );
          }}
        >
          Propose it
        </button>
        <button
          type="button"
          className="nf-esc-action"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setMessage(null);
          }}
        >
          Not now
        </button>
      </div>

      {message ? (
        <p className="nf-esc-line" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
