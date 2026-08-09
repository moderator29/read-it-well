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
      className="mt-2 text-[0.75rem] font-medium leading-relaxed text-[var(--nf-state-error)]"
    >
      {message}
    </p>
  );
}

/* ------------------------------------------------------------ escrow ruling */

export function EscrowRuling({ escrowId, amountMinor, locale }: {
  escrowId: string;
  amountMinor: number;
  locale: Locale;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [direction, setDirection] = useState<"release" | "refund" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(chosen: "release" | "refund") {
    setDirection(chosen);
    setError(null);
    start(async () => {
      const result = await resolveEscrow({ escrowId, direction: chosen, note });
      if (!result.ok) {
        setError(result.fieldErrors?.["note"] ?? result.error);
        return;
      }
      setNote("");
      router.refresh();
    });
  }

  const money = formatMoney(amountMinor, locale);

  return (
    <div className="mt-3 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-3">
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
      <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-[var(--nf-content-muted)]">
        {money} moves the moment you choose. This cannot be undone, and the
        state machine will not let it be reversed afterwards.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => run("release")}
        >
          {pending && direction === "release" ? "Releasing" : `Release ${money} to the payee`}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => run("refund")}
        >
          {pending && direction === "refund" ? "Refunding" : `Refund ${money} to the payer`}
        </Button>
      </div>
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
    <div className="mt-2">
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
          <span className="mt-1 block text-[0.6875rem] text-[var(--nf-content-muted)]">
            This is sent to them word for word, so it has to be something they
            can act on.
          </span>
        </label>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
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
    <div className="mt-4 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-4">
      <p className="text-[0.875rem] font-semibold text-[var(--nf-content-primary)]">
        Change the rate
      </p>
      <p className="mt-1 text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
        This adds a new rate rather than editing the old one, so everything
        already charged stays explainable by the rate that was in force when it
        was charged. A rate cannot start in the past.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
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

      <label className="mt-3 block">
        <span className="nf-label">Starts</span>
        <input
          className="nf-field"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
        <span className="mt-1 block text-[0.6875rem] text-[var(--nf-content-muted)]">
          Leave blank to start now. Announce a rate change before it bites by
          dating it a month out.
        </span>
      </label>

      <label className="mt-3 block">
        <span className="nf-label">Why</span>
        <textarea
          className="nf-field min-h-[64px] resize-y"
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Announced to listers on 1 September. Takes effect a month later."
        />
      </label>

      <div className="mt-3">
        <Button type="button" size="sm" disabled={pending} onClick={submit}>
          {pending ? "Recording" : "Record this rate"}
        </Button>
      </div>
      <Refusal message={error} />
      {done && (
        <p className="mt-2 text-[0.75rem] font-medium text-[var(--nf-state-success)]">
          Recorded, with your name on it.
        </p>
      )}
    </div>
  );
}
