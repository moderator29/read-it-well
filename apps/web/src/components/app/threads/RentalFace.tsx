"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary, Locale } from "@vallo/i18n";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ICON, TYPE } from "@/components/app/Screen";
import {
  acceptProposedTime,
  answerInspection,
  closeInspection,
} from "@/lib/inspections/actions";
import type { Inspection, InspectionOutcome, InspectionState } from "@/lib/inspections/types";
import { fill, lagosWhen } from "./when";

/**
 * THE RENTAL FACE: the inspection request, inside the chat it was made in.
 *
 * Nothing in the thread used to surface the `inspection_requests` state
 * machine; the only inspection control was the after-the-visit safety record
 * in the options sheet, which is a different thing and stays where it is.
 * This is the accept button the research asked for (section 4.2, gap 2), and
 * it is the same record every list reads, so accepting here flips the row on
 * /inspections, /agent/inspections and /bookings at once.
 *
 * `role` changes what you can do, never what you can see. A lister answers:
 * yes, another time, or no. A requester takes an offered time or pulls out.
 * Either side can say the viewing happened.
 *
 * Every write goes through the existing actions and the database's own guard.
 * The face shows its new state the moment the action returns and then asks
 * the router to re-read, so what is drawn is never ahead of what was saved.
 */

type RentalCopy = Dictionary["threads"]["rental"];

export function RentalFace({
  inspection,
  role,
  counterpartName,
  copy,
  locale,
  onAccepted,
}: {
  inspection: Inspection;
  role: "lister" | "requester";
  counterpartName: string;
  copy: RentalCopy;
  locale: Locale;
  /** The accept ceremony: the header tints once. Pitch 13. */
  onAccepted: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<InspectionState>(inspection.state);
  const [slotAt, setSlotAt] = useState<string | null>(inspection.slotAt);
  const [settled, setSettled] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [closing, setClosing] = useState(false);

  function run(
    work: () => Promise<{ ok: boolean; error?: string }>,
    then: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await work();
      if (!result.ok) {
        setError(result.error ?? "That did not go through.");
        return;
      }
      then();
      router.refresh();
    });
  }

  const accept = () =>
    run(
      () => answerInspection({ id: inspection.id, state: "CONFIRMED" }),
      () => {
        setState("CONFIRMED");
        setSlotAt(inspection.slotAt ?? inspection.requestedAt);
        setSettled(copy.accepted);
        onAccepted();
      },
    );

  const acceptTime = () =>
    run(
      () => acceptProposedTime({ id: inspection.id }),
      () => {
        setState("CONFIRMED");
        setSettled(copy.accepted);
        onAccepted();
      },
    );

  const decline = () =>
    run(
      () => answerInspection({ id: inspection.id, state: "DECLINED" }),
      () => {
        setDeclining(false);
        setState("DECLINED");
        setSettled(copy.declined);
      },
    );

  const withdraw = () =>
    run(
      () => closeInspection({ id: inspection.id, state: "WITHDRAWN" }),
      () => {
        setState("WITHDRAWN");
        setSettled(copy.withdrawn);
      },
    );

  const propose = (when: string, note: string) =>
    run(
      () =>
        answerInspection({
          id: inspection.id,
          state: "PROPOSED",
          when,
          ...(note ? { note } : {}),
        }),
      () => {
        setProposing(false);
        setState("PROPOSED");
        setSlotAt(when);
      },
    );

  const complete = (outcome: InspectionOutcome) =>
    run(
      /* `outcome` rides the same call. The action's schema is BE2's to widen;
         until it is, the state still lands and the reason is dropped, which is
         the previous behaviour and not a lie about it. */
      () => closeInspection({ id: inspection.id, state: "COMPLETED", outcome }),
      () => {
        setClosing(false);
        setState("COMPLETED");
        setSettled(copy.inspected);
      },
    );

  const name = counterpartName;
  const asked = lagosWhen(inspection.requestedAt, locale);
  const agreed = slotAt ? lagosWhen(slotAt, locale) : asked;

  let sentence = "";
  let detail: string | null = null;
  if (state === "CONFIRMED") {
    sentence = fill(copy.confirmedFor, { when: agreed });
  } else if (state === "REQUESTED") {
    sentence = role === "lister" ? copy.waitingOnYou : fill(copy.waitingOnThem, { name });
    detail = fill(copy.askedFor, { when: asked });
  } else if (state === "PROPOSED") {
    sentence =
      role === "lister"
        ? fill(copy.offeredByYou, { name })
        : fill(copy.offeredToYou, { name });
    detail = agreed;
  }

  const yourMove =
    (role === "lister" && state === "REQUESTED") ||
    (role === "requester" && state === "PROPOSED");

  return (
    <section
      aria-label={sentence || settled || undefined}
      data-testid="thread-rental-face"
      className="nf-card mb-row rounded-[var(--nf-radius-lg)] p-card-sm"
    >
      <div className="flex items-start gap-row">
        <span
          aria-hidden="true"
          className={`mt-3xs shrink-0 ${
            state === "CONFIRMED"
              ? "text-[var(--nf-state-success)]"
              : "text-[var(--nf-brand-secondary)]"
          }`}
        >
          <UiIcon name={state === "CONFIRMED" ? "verified" : "calendar-booking"} size={ICON.row} />
        </span>

        <div className="min-w-0 flex-1">
          {settled ? (
            <p role="status" className={`${TYPE.rowTitle} nf-confirm-pop`}>
              {settled}
            </p>
          ) : (
            <p className={TYPE.rowTitle}>{sentence}</p>
          )}
          {!settled && detail && <p className={`mt-inline-tight ${TYPE.rowMeta}`}>{detail}</p>}
          {settled && state === "CONFIRMED" && (
            <p className={`mt-inline-tight ${TYPE.rowMeta}`}>{fill(copy.confirmedFor, { when: agreed })}</p>
          )}

          {error && (
            <p role="alert" className={`mt-inline-tight ${TYPE.rowMeta} text-[var(--nf-state-error)]`}>
              {error}
            </p>
          )}

          {yourMove && role === "lister" && (
            <div className="mt-row flex flex-wrap gap-xs">
              <Button size="sm" variant="primary" disabled={pending} onClick={accept}>
                {copy.accept}
              </Button>
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => setProposing(true)}>
                {copy.offerAnother}
              </Button>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => setDeclining(true)}>
                {copy.decline}
              </Button>
            </div>
          )}

          {role === "requester" && (state === "REQUESTED" || state === "PROPOSED") && (
            <div className="mt-row flex flex-wrap gap-xs">
              {state === "PROPOSED" && (
                <Button size="sm" variant="primary" disabled={pending} onClick={acceptTime}>
                  {copy.acceptTime}
                </Button>
              )}
              <Button size="sm" variant="ghost" disabled={pending} onClick={withdraw}>
                {copy.withdraw}
              </Button>
            </div>
          )}

          {state === "CONFIRMED" && (
            <div className="mt-row flex flex-wrap gap-xs">
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => setClosing(true)}>
                {copy.markInspected}
              </Button>
            </div>
          )}
        </div>
      </div>

      {declining && (
        <Sheet open={declining} onOpenChange={setDeclining} title={copy.declineTitle} detents={[0.42]}>
          <p className={TYPE.body}>{copy.declineBody}</p>
          {/* Rose on the confirming control only. The sheet, its title and the
              quiet way out carry no state colour at all. */}
          <div className="mt-block flex flex-col gap-inline">
            <Button variant="danger" full disabled={pending} onClick={decline}>
              {copy.declineConfirm}
            </Button>
            <Button variant="ghost" full disabled={pending} onClick={() => setDeclining(false)}>
              {copy.keep}
            </Button>
          </div>
        </Sheet>
      )}

      {proposing && (
        <ProposeSheet
          open={proposing}
          onOpenChange={setProposing}
          pending={pending}
          copy={copy}
          onSubmit={propose}
        />
      )}

      {closing && (
        <OutcomeSheet
          open={closing}
          onOpenChange={setClosing}
          pending={pending}
          copy={copy}
          onSubmit={complete}
        />
      )}
    </section>
  );
}

function ProposeSheet({
  open,
  onOpenChange,
  pending,
  copy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  copy: RentalCopy;
  onSubmit: (whenIso: string, note: string) => void;
}) {
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={copy.proposeTitle} detents={[0.55]}>
      <p className={TYPE.body}>{copy.proposeBody}</p>
      <label className="mt-md block">
        <span className="nf-label">{copy.proposeWhen}</span>
        <input
          type="datetime-local"
          value={when}
          onChange={(event) => setWhen(event.target.value)}
          className="nf-field mt-2xs w-full"
        />
      </label>
      <label className="mt-md block">
        <span className="nf-label">{copy.proposeNote}</span>
        <input
          type="text"
          value={note}
          maxLength={400}
          onChange={(event) => setNote(event.target.value)}
          className="nf-field mt-2xs w-full"
        />
      </label>
      <Button
        full
        size="lg"
        variant="primary"
        className="mt-lg"
        disabled={pending || when.length === 0}
        onClick={() => onSubmit(new Date(when).toISOString(), note.trim())}
      >
        {copy.proposeSend}
      </Button>
    </Sheet>
  );
}

/**
 * How it went. Three answers, one of which is chosen before Save is live, so
 * a thumb cannot mark a viewing done by accident. The choice is a group of
 * pressed buttons rather than a segmented row: the labels are sentences and
 * three of them side by side at 390px would be three truncated words.
 */
function OutcomeSheet({
  open,
  onOpenChange,
  pending,
  copy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  copy: RentalCopy;
  onSubmit: (outcome: InspectionOutcome) => void;
}) {
  const [outcome, setOutcome] = useState<InspectionOutcome | null>(null);
  const options: { value: InspectionOutcome; label: string }[] = [
    { value: "inspected", label: copy.outcomeInspected },
    { value: "deal_done", label: copy.outcomeDealDone },
    { value: "no_deal", label: copy.outcomeNoDeal },
  ];
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={copy.outcomeTitle} detents={[0.55]}>
      <div role="group" aria-label={copy.outcomeTitle} className="flex flex-col gap-inline">
        {options.map((option) => {
          const chosen = outcome === option.value;
          return (
            <Button
              key={option.value}
              type="button"
              variant={chosen ? "primary" : "secondary"}
              full
              aria-pressed={chosen}
              leadingIcon={chosen ? "verified" : undefined}
              onClick={() => setOutcome(option.value)}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
      <Button
        full
        size="lg"
        variant="primary"
        className="mt-lg"
        disabled={pending || outcome === null}
        onClick={() => outcome && onSubmit(outcome)}
      >
        {copy.outcomeSave}
      </Button>
    </Sheet>
  );
}
