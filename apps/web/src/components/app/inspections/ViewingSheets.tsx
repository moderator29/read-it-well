"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TYPE } from "@/components/app/Screen";
import { earliestLagosInput, lagosWallClockToIso } from "@/lib/inspections/when";

/**
 * THE TWO SHEETS EVERY VIEWING SURFACE OPENS.
 *
 * The inspection card, the dashboard rows and the thread face each carried
 * their own copy of "Offer another time", and only the thread asked before a
 * decline. Three things went wrong in the copies:
 *
 *   1. A refusal was drawn on the card BEHIND the open sheet, so a time two
 *      hours too soon, or a request the other side had just withdrawn, looked
 *      like a button that did nothing. The answer is drawn here, in the sheet.
 *   2. Decline and Withdraw were one tap and final on the card and the rows
 *      (the database has no way back from either). Both ask first now, and a
 *      decline or a cancel can carry the one line the notification shows.
 *   3. A second tap while the first was still in flight sent the move twice.
 *      One call at a time, whatever the thumb does.
 *
 * Each sheet owns its pending state and its error, and calls back with the
 * caller's own action; the caller updates its face and refreshes on success.
 */

export type StepResult = { ok: boolean; error?: string; fieldErrors?: Record<string, string> };

export type TimeSheetWords = {
  title: string;
  body: string;
  /** The picker's label; says the clock is Lagos time. */
  when: string;
  note: string;
  notePlaceholder?: string;
  send: string;
};

export type StepSheetWords = {
  title: string;
  body: string;
  confirm: string;
  keep: string;
  /** A one-line reason field, when the move can carry one. */
  note?: string;
};

const FALLBACK = "That did not go through. Try again in a moment.";

function Refusal({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className={`mt-sm ${TYPE.rowMeta} text-[var(--nf-state-error)]`} data-testid="viewing-sheet-error">
      {error}
    </p>
  );
}

/** One call at a time; the answer and the busy state for the sheet to draw. */
function useOneCall() {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function call(work: () => Promise<StepResult>, onDone: () => void, field?: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await work();
      if (!result.ok) {
        setError((field ? result.fieldErrors?.[field] : undefined) ?? result.error ?? FALLBACK);
        return;
      }
      onDone();
    } catch {
      setError(FALLBACK);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return { busy, error, call };
}

/** A time instead of the one asked for: a counter-offer, or moving a booked viewing. */
export function ViewingTimeSheet({
  open,
  onOpenChange,
  words,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  words: TimeSheetWords;
  /** The instant (ISO, read as Lagos time) and the trimmed note. */
  onSubmit: (whenIso: string, note: string) => Promise<StepResult>;
}) {
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const { busy, error, call } = useOneCall();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={words.title} detents={[0.62]} testId="viewing-time-sheet">
      <div className="px-2xs pb-xs">
        <p className={TYPE.body}>{words.body}</p>
        <label className="mt-md block">
          <span className="nf-label">{words.when}</span>
          <input
            type="datetime-local"
            value={when}
            /* UX-20: Lagos time, two hours ahead at the earliest, as a request is. */
            min={earliestLagosInput()}
            suppressHydrationWarning
            step={900}
            onChange={(event) => setWhen(event.target.value)}
            className="nf-field mt-2xs w-full"
            data-testid="viewing-time-when"
          />
        </label>
        <label className="mt-md block">
          <span className="nf-label">{words.note}</span>
          <input
            type="text"
            value={note}
            maxLength={400}
            onChange={(event) => setNote(event.target.value)}
            placeholder={words.notePlaceholder}
            className="nf-field mt-2xs w-full"
          />
        </label>
        <Refusal error={error} />
        <Button
          full
          size="lg"
          variant="primary"
          className="mt-lg"
          loading={busy}
          disabled={when.length === 0}
          onClick={() =>
            void call(() => onSubmit(lagosWallClockToIso(when) ?? when, note.trim()), () => onOpenChange(false), "when")
          }
          data-testid="viewing-time-send"
        >
          {words.send}
        </Button>
      </div>
    </Sheet>
  );
}

/**
 * A move with no way back (decline, withdraw, cancel), asked before it is
 * made. Rose on the confirming control only; the sheet, its title and the
 * quiet way out carry no state colour.
 */
export function ViewingStepSheet({
  open,
  onOpenChange,
  words,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  words: StepSheetWords;
  /** The trimmed reason, empty when there is no field or nothing was typed. */
  onConfirm: (note: string) => Promise<StepResult>;
}) {
  const [note, setNote] = useState("");
  const { busy, error, call } = useOneCall();
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={words.title}
      detents={[words.note ? 0.55 : 0.42]}
      testId="viewing-step-sheet"
    >
      <div className="px-2xs pb-xs">
        <p className={TYPE.body}>{words.body}</p>
        {words.note && (
          <label className="mt-md block">
            <span className="nf-label">{words.note}</span>
            <input
              type="text"
              value={note}
              maxLength={400}
              onChange={(event) => setNote(event.target.value)}
              className="nf-field mt-2xs w-full"
              data-testid="viewing-step-note"
            />
          </label>
        )}
        <Refusal error={error} />
        <div className="mt-block flex flex-col gap-inline">
          <Button
            variant="danger"
            full
            loading={busy}
            onClick={() => void call(() => onConfirm(note.trim()), () => onOpenChange(false))}
            data-testid="viewing-step-confirm"
          >
            {words.confirm}
          </Button>
          <Button variant="quiet" full disabled={busy} onClick={() => onOpenChange(false)}>
            {words.keep}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
