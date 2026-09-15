"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate, type Locale } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";
import { ICON, Row, RowList, TYPE } from "@/components/app/Screen";
import {
  acceptProposedTime,
  answerInspection,
  closeInspection,
} from "@/lib/inspections/actions";
import { waitingOn, type Inspection, type InspectionState } from "@/lib/inspections/types";

/**
 * INSPECTIONS, AS ROWS, WITH THE STATE VISIBLE ON BOTH SIDES.
 *
 * One component, two audiences, and that is the point rather than an economy.
 * The single worst thing about arranging a viewing by chat is that the two
 * people are looking at different things: the agent remembers saying Sunday,
 * the renter remembers asking for Saturday and hearing nothing. A row that
 * renders from the same record on both screens cannot disagree with itself.
 *
 * `side` changes WHAT YOU CAN DO, never what you can see. A lister answers; a
 * requester takes an offered time or pulls out. Both read the same state, the
 * same two times and the same two notes.
 *
 * THE SHAPE IS THE SWITCH-PROFILE SHEET'S. Rows in one surface with inset
 * hairlines, a glyph in a tinted circle, a title, a line of detail, a state on
 * the right. Not a card per request: an agent with eleven enquiries would be
 * looking at eleven bordered boxes.
 */

const STATE_LABEL: Record<InspectionState, string> = {
  REQUESTED: "Waiting on you",
  CONFIRMED: "Confirmed",
  PROPOSED: "New time offered",
  DECLINED: "Declined",
  COMPLETED: "Inspected",
  WITHDRAWN: "Withdrawn",
};

/** The same six states as the person who ASKED reads them. */
const STATE_LABEL_REQUESTER: Record<InspectionState, string> = {
  REQUESTED: "Waiting for a reply",
  CONFIRMED: "Confirmed",
  PROPOSED: "New time offered",
  DECLINED: "Declined",
  COMPLETED: "Inspected",
  WITHDRAWN: "Withdrawn",
};

const STATE_TONE: Record<InspectionState, StatusTone> = {
  REQUESTED: "warning",
  CONFIRMED: "success",
  PROPOSED: "info",
  DECLINED: "neutral",
  COMPLETED: "success",
  WITHDRAWN: "neutral",
};

function whenLine(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${formatDate(date, locale, { weekday: "short", day: "numeric", month: "short" })}, ${date.toLocaleTimeString(
    locale,
    { hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" },
  )}`;
}

export function InspectionRows({
  inspections,
  side,
  locale,
}: {
  inspections: Inspection[];
  /** Which end of the request this screen is. Changes the controls only. */
  side: "lister" | "requester";
  locale: Locale;
}) {
  return (
    <RowList boxed>
      {inspections.map((inspection) => (
        <InspectionRow
          key={inspection.id}
          inspection={inspection}
          side={side}
          locale={locale}
        />
      ))}
    </RowList>
  );
}

function InspectionRow({
  inspection,
  side,
  locale,
}: {
  inspection: Inspection;
  side: "lister" | "requester";
  locale: Locale;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [proposing, setProposing] = useState(false);

  const waiting = waitingOn(inspection.state);
  const yourMove = waiting === side;
  const labels = side === "lister" ? STATE_LABEL : STATE_LABEL_REQUESTER;

  /* The time that matters is the agreed one once there is one, and the asked
     one until then. Showing both on a row would be two dates competing on a
     390px screen for a distinction almost nobody needs at a glance. */
  const shown = inspection.slotAt ?? inspection.requestedAt;

  function run(work: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await work();
      if (!result.ok) {
        setError(result.error ?? "That did not go through.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <Row className="flex-col items-stretch gap-2 py-4">
      <div className="flex w-full items-start gap-3.5">
        <span className="nf-role-mark mt-0.5 shrink-0" aria-hidden="true">
          <UiIcon name="calendar-booking" size={ICON.row} />
        </span>

        <span className="min-w-0 flex-1">
          {/* The property first. It is what an agent with nine of them is
              scanning for, and it is what a renter who asked three agents on
              Tuesday needs to tell the rows apart. */}
          <span className={`block ${TYPE.rowTitle}`}>
            {inspection.listingTitle ?? UNTITLED}
          </span>
          <span className={`mt-0.5 block ${TYPE.rowMeta}`}>
            {whenLine(shown, locale)}
            {inspection.counterpartName ? ` · ${inspection.counterpartName}` : ""}
          </span>

          {/* The time that was ASKED for, kept beside the one that was agreed.
              A reschedule that overwrote the ask would hide the fact that
              somebody wanted Saturday and is being given Sunday. */}
          {inspection.slotAt && inspection.slotAt !== inspection.requestedAt && (
            <span className={`mt-0.5 block ${TYPE.caption}`}>
              {ASKED_FOR} {whenLine(inspection.requestedAt, locale)}
            </span>
          )}

          {inspection.note && (
            <span className={`mt-1 block ${TYPE.rowMeta}`}>{inspection.note}</span>
          )}
          {inspection.listerNote && (
            <span className={`mt-1 block ${TYPE.rowMeta}`}>{inspection.listerNote}</span>
          )}
        </span>

        <span className="shrink-0 text-right">
          <StatusPill tone={STATE_TONE[inspection.state]}>
            {labels[inspection.state]}
          </StatusPill>
        </span>
      </div>

      {error && (
        <p role="alert" className={`${TYPE.rowMeta} text-[var(--nf-state-error)]`}>
          {error}
        </p>
      )}

      {/*
        THE CONTROLS, and only when it is actually this person's move.

        A row that always carries three buttons is a list you cannot scan. A
        confirmed viewing needs nothing done to it, so it says so and stops.
      */}
      {yourMove && side === "lister" && (
        <div className="flex flex-wrap gap-2 pl-[3.25rem]">
          <Button
            size="sm"
            variant="primary"
            disabled={pending}
            onClick={() => run(() => answerInspection({ id: inspection.id, state: "CONFIRMED" }))}
          >
            {CONFIRM}
          </Button>
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => setProposing(true)}>
            {PROPOSE}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => answerInspection({ id: inspection.id, state: "DECLINED" }))}
          >
            {DECLINE}
          </Button>
        </div>
      )}

      {yourMove && side === "requester" && inspection.state === "PROPOSED" && (
        <div className="flex flex-wrap gap-2 pl-[3.25rem]">
          <Button
            size="sm"
            variant="primary"
            disabled={pending}
            onClick={() => run(() => acceptProposedTime({ id: inspection.id }))}
          >
            {TAKE_TIME}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => closeInspection({ id: inspection.id, state: "WITHDRAWN" }))}
          >
            {WITHDRAW}
          </Button>
        </div>
      )}

      {/* A confirmed viewing can be marked as done by either side, because
          either of them might be the one holding the phone afterwards. */}
      {inspection.state === "CONFIRMED" && (
        <div className="flex flex-wrap items-center gap-2 pl-[3.25rem]">
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => closeInspection({ id: inspection.id, state: "COMPLETED" }))}
          >
            {MARK_DONE}
          </Button>
          {inspection.conversationId && (
            <Link
              href={`/messages/${inspection.conversationId}`}
              className={`${TYPE.rowMeta} font-semibold text-[var(--nf-content-link)] hover:underline`}
            >
              {OPEN_CHAT}
            </Link>
          )}
        </div>
      )}

      {proposing && (
        <ProposeSheet
          open={proposing}
          onOpenChange={setProposing}
          pending={pending}
          onSubmit={(when, note) =>
            run(async () => {
              const result = await answerInspection({
                id: inspection.id,
                state: "PROPOSED",
                when,
                ...(note ? { note } : {}),
              });
              if (result.ok) setProposing(false);
              return result;
            })
          }
        />
      )}
    </Row>
  );
}

/**
 * Offering another time.
 *
 * A sheet rather than an inline form, for the reason the profile's details
 * editor gives: an inline form on a list pushes every row below it down by a
 * screen, so the thing somebody was about to tap moves while they are reaching
 * for it.
 */
function ProposeSheet({
  open,
  onOpenChange,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSubmit: (when: string, note: string) => void;
}) {
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={PROPOSE_TITLE} detents={[0.55]}>
      <div className="px-1 pb-2">
        <p className={TYPE.body}>{PROPOSE_SUB}</p>

        <label className="mt-4 block">
          <span className="nf-label">{WHEN_LABEL}</span>
          <input
            type="datetime-local"
            value={when}
            onChange={(event) => setWhen(event.target.value)}
            className="nf-field mt-1 w-full"
          />
        </label>

        <label className="mt-4 block">
          <span className="nf-label">{NOTE_LABEL}</span>
          <input
            type="text"
            value={note}
            maxLength={400}
            onChange={(event) => setNote(event.target.value)}
            placeholder={NOTE_PLACEHOLDER}
            className="nf-field mt-1 w-full"
          />
        </label>

        <Button
          full
          size="lg"
          variant="primary"
          className="mt-6"
          disabled={pending || when.length === 0}
          onClick={() => onSubmit(new Date(when).toISOString(), note.trim())}
        >
          {PROPOSE_SEND}
        </Button>
      </div>
    </Sheet>
  );
}

/* --------------------------------------------------------------- the copy */
const UNTITLED = "A property that is no longer listed";
const ASKED_FOR = "Asked for";
const CONFIRM = "Confirm";
const PROPOSE = "Offer another time";
const DECLINE = "Decline";
const TAKE_TIME = "Take that time";
const WITHDRAW = "Withdraw";
const MARK_DONE = "It happened";
const OPEN_CHAT = "Open the chat";
const PROPOSE_TITLE = "Offer another time";
const PROPOSE_SUB =
  "They will see the time you offer and can take it in one tap. The time they asked for stays on the record.";
const WHEN_LABEL = "When you can do it";
const NOTE_LABEL = "A line for them, if you want one";
const NOTE_PLACEHOLDER = "The gate closes at 6, so earlier is better";
const PROPOSE_SEND = "Send this time";
