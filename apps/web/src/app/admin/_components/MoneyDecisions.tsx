"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, type Locale } from "@naijafinds/i18n";
import { Button } from "@/components/ui/Button";
import { resolveEscrow, setFeeRate } from "@/lib/admin/money-actions";
import { reviewKycDocument } from "@/lib/admin/kyc-actions";

/**
 * The three decisions the money side of the console can take.
 *
 * Each one is a small inline form rather than a confirm sheet, and that is a
 * deliberate departure from AdminActions. A sheet is right when the decision is
 * a yes or no with a note attached, which is what the moderation queues are.
 * These three are not: an escrow ruling needs a direction AND a reason, a fee
 * change needs four fields, and a rejection needs the reviewer to be looking at
 * the document while they type why it is wrong. Putting any of those behind a
 * sheet hides the thing being judged behind the judgement.
 *
 * Every one of them refuses in place, in the sentence the server sent, and
 * refreshes the route on success so the queue re-reads from the database rather
 * than from an optimistic guess about what happened.
 */

function Refusal({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="nf-body-sm mt-row font-medium text-[var(--nf-state-error)]"
    >
      {message}
    </p>
  );
}

/* ------------------------------------------------------------ escrow ruling */

export function EscrowRuling({
  escrowId,
  amountMinor,
  locale,
  payerName,
  payeeName,
}: {
  escrowId: string;
  amountMinor: number;
  locale: Locale;
  /** Who paid in. Named in the confirmation, because a refund goes to them. */
  payerName: string | null;
  /** Who is waiting to be paid. Named for the same reason. */
  payeeName: string | null;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [direction, setDirection] = useState<"release" | "refund" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run() {
    if (!direction) return;
    setError(null);
    start(async () => {
      const result = await resolveEscrow({ escrowId, direction, note });
      if (!result.ok) {
        setError(result.fieldErrors?.["note"] ?? result.error);
        return;
      }
      setNote("");
      setDirection(null);
      router.refresh();
    });
  }

  const money = formatMoney(amountMinor, locale);
  const payer = payerName ?? "the payer";
  const payee = payeeName ?? "the payee";
  /* Who actually receives the money under the chosen direction. Release pays
     the payee; refund returns it to the payer. */
  const recipient = direction === "release" ? payee : payer;

  return (
    <div className="mt-row rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-card-sm">
      <label className="block">
        <span className="nf-label">Your ruling</span>
        <textarea
          className="nf-field min-h-[80px] resize-y"
          value={note}
          maxLength={1000}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What you decided and why. Both people are sent this, word for word."
        />
      </label>

      {/*
        THE SECOND STEP, AND WHY IT IS NOT CEREMONY.
        Choosing a direction used to move the money on that same click. The
        amount was in the button label, which is half of the rule; the person
        receiving it was not, and "Release to the payee" reads identically
        whoever the payee happens to be. Naming them, next to the amount, in a
        sentence that has to be read before a second deliberate press, is the
        difference between confirming a decision and confirming a button.
      */}
      {!direction ? (
        <>
          <p className="nf-caption mt-row">
            Choose a direction. You will see exactly what moves, and to whom,
            before anything happens.
          </p>
          <div className="mt-row flex flex-wrap gap-inline">
            <Button type="button" size="sm" onClick={() => setDirection("release")}>
              Release to {payee}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setDirection("refund")}
            >
              Refund to {payer}
            </Button>
          </div>
        </>
      ) : (
        <div className="mt-row rounded-[var(--nf-radius-md)] border border-[var(--nf-state-warning)] p-card-sm">
          <p className="nf-body font-semibold text-content">
            {money} goes to {recipient}.
          </p>
          <p className="nf-body-sm mt-row text-content-2">
            {direction === "release"
              ? `${payer} does not get this money back.`
              : `${payee} does not receive this money.`}{" "}
            Both people are sent your ruling word for word. This cannot be
            undone: the state machine will not let a resolved escrow be
            reopened.
          </p>
          <div className="mt-group flex flex-wrap gap-inline">
            <Button type="button" size="sm" variant="danger" loading={pending} onClick={run}>
              {direction === "release" ? "Release" : "Refund"} {money} to {recipient}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setDirection(null);
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      <Refusal message={error} />
    </div>
  );
}

/* ------------------------------------------------------------ KYC decision */

export function DocumentDecision({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function decide(approve: boolean) {
    setError(null);
    start(async () => {
      const result = await reviewKycDocument(
        approve ? { documentId, approve: true } : { documentId, approve: false, reason },
      );
      if (!result.ok) {
        setError(result.fieldErrors?.["reason"] ?? result.error);
        return;
      }
      setReason("");
      setShowReason(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-row">
      {showReason && (
        <label className="block">
          <span className="nf-label">What is wrong with it</span>
          <textarea
            className="nf-field min-h-[64px] resize-y"
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            placeholder="The name is covered by a thumb. Photograph it again with all four corners visible."
          />
          <span className="nf-caption mt-inline-tight block">
            This is sent to them word for word, so it has to be something they
            can act on.
          </span>
        </label>
      )}
      <div className="mt-row flex flex-wrap gap-inline">
        <Button type="button" size="sm" disabled={pending} onClick={() => decide(true)}>
          Approve
        </Button>
        {showReason ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => decide(false)}
          >
            {pending ? "Sending" : "Send it back"}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => setShowReason(true)}
          >
            Reject
          </Button>
        )}
        {showReason && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setShowReason(false);
              setError(null);
            }}
          >
            Cancel
          </Button>
        )}
      </div>
      <Refusal message={error} />
    </div>
  );
}

/* ---------------------------------------------------------------- fee rate */

/**
 * Setting a rate.
 *
 * The operator types a PERCENTAGE because that is what a rate is called in
 * every conversation anybody will have about it, and it is converted to basis
 * points here, once, with Math.round. Storing basis points and typing
 * percentages is the right split: the database never sees a fraction, and
 * nobody has to think in ten-thousandths to set two and a half percent.
 *
 * The flat amount is typed in naira and converted to kobo the same way. It is
 * the only other float in this component and it is rounded away in the same
 * expression it is created in.
 */
export function FeeRateForm({
  kind,
  currentBasisPoints,
  currentFlatMinor,
}: {
  kind: "commission" | "listing_fee";
  currentBasisPoints: number;
  currentFlatMinor: number;
}) {
  const router = useRouter();
  const [percent, setPercent] = useState(String(currentBasisPoints / 100));
  const [flatNaira, setFlatNaira] = useState(String(currentFlatMinor / 100));
  const [startsAt, setStartsAt] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    setDone(false);
    const percentValue = Number(percent);
    const flatValue = Number(flatNaira);
    if (!Number.isFinite(percentValue) || percentValue < 0 || percentValue > 100) {
      setError("Enter the rate as a percentage between 0 and 100.");
      return;
    }
    if (!Number.isFinite(flatValue) || flatValue < 0) {
      setError("Enter the flat amount in naira, or zero.");
      return;
    }

    start(async () => {
      const result = await setFeeRate({
        kind,
        basisPoints: Math.round(percentValue * 100),
        flatMinor: Math.round(flatValue * 100),
        /* Empty means now. The database refuses anything in the past, so an
           operator who leaves this blank gets the earliest legal start. */
        effectiveFrom: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
        note,
      });
      if (!result.ok) {
        setError(
          result.fieldErrors?.["note"] ?? result.fieldErrors?.["effectiveFrom"] ?? result.error,
        );
        return;
      }
      setNote("");
      setDone(true);
      router.refresh();
    });
  }

  return (
    <div className="mt-group rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-card">
      <p className="nf-body font-semibold text-content">
        Change the rate
      </p>
      <p className="nf-caption mt-inline-tight">
        This adds a new rate rather than editing the old one, so everything
        already charged stays explainable by the rate that was in force when it
        was charged. A rate cannot start in the past.
      </p>

      <div className="mt-group grid gap-row sm:grid-cols-2">
        <label className="block">
          <span className="nf-label">Percentage</span>
          <input
            className="nf-field"
            inputMode="decimal"
            value={percent}
            onChange={(e) => setPercent(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0"
          />
        </label>
        <label className="block">
          <span className="nf-label">Flat amount, in naira</span>
          <input
            className="nf-field"
            inputMode="decimal"
            value={flatNaira}
            onChange={(e) => setFlatNaira(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0"
          />
        </label>
      </div>

      <label className="mt-group block">
        <span className="nf-label">Starts</span>
        <input
          className="nf-field"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
        <span className="nf-caption mt-inline-tight block">
          Leave blank to start now. Announce a rate change before it bites by
          dating it a month out.
        </span>
      </label>

      <label className="mt-group block">
        <span className="nf-label">Why</span>
        <textarea
          className="nf-field min-h-[64px] resize-y"
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Announced to listers on 1 September. Takes effect a month later."
        />
      </label>

      <div className="mt-group">
        <Button type="button" size="sm" disabled={pending} onClick={submit}>
          {pending ? "Recording" : "Record this rate"}
        </Button>
      </div>
      <Refusal message={error} />
      {done && (
        <p className="nf-body-sm mt-row font-medium text-[var(--nf-state-success)]">
          Recorded, with your name on it.
        </p>
      )}
    </div>
  );
}
