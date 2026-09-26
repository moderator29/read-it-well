"use client";

import { TierBadge } from "@/components/trust/TierBadge";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate, type Locale } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { ICON_PLATE_GLYPH, IconPlate } from "@/components/ui/IconPlate";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";
import { Row, RowList, TYPE } from "@/components/app/Screen";
import {
  acceptProposedTime,
  answerInspection,
  closeInspection,
} from "@/lib/inspections/actions";
import { waitingOn, type Inspection, type InspectionState } from "@/lib/inspections/types";
import { earliestLagosInput, lagosWallClockToIso } from "@/lib/inspections/when";

/**
 * INSPECTIONS, AS ROWS, WITH THE STATE VISIBLE ON BOTH SIDES.
 *
 * One component, two audiences, and that is the point rather than an economy.
 * The single worst thing about arranging an inspection by chat is that the two
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


/**
 * The indent that puts a row's controls under its text.
 *
 * Each row is the plate (the shared `IconPlate`, md, 2.75rem like the old
 * `nf-role-mark`), then `gap-sm`, then the text column. The controls
 * sit below in their own full-width div, so lining them up under the title means
 * clearing exactly those two things: `.nf-role-mark` is 2.75rem in
 * `app/css/controls.css` and the gap is the 12px rung, which is 56px.
 *
 * IT MOVED TO THE STYLESHEET AND IT NOW HAS A WIDTH CONDITION. It was an
 * arbitrary Tailwind value here, which cannot carry one, and at 390px the
 * indent was spending a sixth of the card lining three buttons up under a
 * title: "Offer another time" and "Decline" wrapped onto a second row hard
 * against the right edge. `.nf-insp-row__controls` in `app/css/threads.css`
 * drops it on a phone and restores it at 640, with the sum written out so
 * that if either half moves the rule follows it.
 */
const CONTROL_INDENT = "nf-insp-row__controls";

function whenLine(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${formatDate(date, locale, { weekday: "short", day: "numeric", month: "short" })}, ${formatDate(date, locale, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function InspectionRows({
  inspections,
  side,
  sideFor,
  highlightId,
  locale,
}: {
  inspections: Inspection[];
  /** Which end of the request this screen is. Changes the controls only. */
  side: "lister" | "requester";
  /**
   * Per-row override of `side`, for the one screen where a person is both.
   *
   * `/inspections` merges what somebody asked to see with what they were asked
   * to show, so the side is a fact about the ROW there rather than about the
   * screen. Everywhere else the screen decides and this is left out.
   */
  sideFor?: (inspection: Inspection) => "lister" | "requester";
  /**
   * The row whose state just changed somewhere else (the thread banner, say),
   * which arrives with `nf-tx-in` so the eye lands on it. One row, once.
   */
  highlightId?: string | null;
  locale: Locale;
}) {
  return (
    <RowList boxed>
      {inspections.map((inspection) => (
        <InspectionRow
          key={inspection.id}
          inspection={inspection}
          side={sideFor ? sideFor(inspection) : side}
          highlighted={highlightId === inspection.id}
          locale={locale}
        />
      ))}
    </RowList>
  );
}

function InspectionRow({
  inspection,
  side,
  highlighted = false,
  locale,
}: {
  inspection: Inspection;
  side: "lister" | "requester";
  highlighted?: boolean;
  locale: Locale;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [proposing, setProposing] = useState(false);
  /*
   * THE ROW THAT JUST CHANGED ARRIVES, ONCE.
   *
   * After an answer lands the router re-reads the list and the row comes back
   * with its new state. `nf-tx-in` is the wallet's "something landed" nudge and
   * motion.css asks that nobody invent a second one, so it is reused here: the
   * row slides in a few pixels and settles, and reduced motion turns it off in
   * the stylesheet rather than here. `highlighted` is the same thing driven
   * from outside, for a change made in the thread and seen on this list.
   */
  const [justChanged, setJustChanged] = useState(false);
  const entrance = highlighted || justChanged ? "nf-tx-in" : "";

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
      setJustChanged(true);
      router.refresh();
    });
  }

  return (
    <Row className={`flex-col items-stretch gap-xs py-md ${entrance}`}>
      <div className="flex w-full flex-wrap items-start gap-sm">
        <IconPlate size="md" className="mt-3xs">
          <UiIcon name="calendar-booking" size={ICON_PLATE_GLYPH.md} />
        </IconPlate>

        <span className="min-w-0 flex-1">
          {/* The property first. It is what an agent with nine of them is
              scanning for, and it is what a renter who asked three agents on
              Tuesday needs to tell the rows apart. */}
          {/*
            THE PROPERTY IS A LINK, because the line above this one says the
            property comes first so a renter who asked three agents on Tuesday
            can tell the rows apart, and dead text is not how somebody checks
            which flat a row is about. A row whose listing has since been
            taken down carries no id, so it stays plain text rather than
            pointing at nothing.
          */}
          {inspection.listingId ? (
            <Link
              href={`/listing/${inspection.listingId}`}
              className={`block ${TYPE.rowTitle} hover:underline`}
            >
              {inspection.listingTitle ?? UNTITLED}
            </Link>
          ) : (
            <span className={`block ${TYPE.rowTitle}`}>
              {inspection.listingTitle ?? UNTITLED}
            </span>
          )}
          <span className={`mt-3xs block ${TYPE.rowMeta}`}>
            {whenLine(shown, locale)}
            {inspection.counterpartName ? ` · ${inspection.counterpartName}` : ""}
            {inspection.counterpartName && inspection.counterpartBadge ? <TierBadge tier={inspection.counterpartBadge} size={14} className="nf-ix-name-tier" /> : null}
          </span>

          {/* The time that was ASKED for, kept beside the one that was agreed.
              A reschedule that overwrote the ask would hide the fact that
              somebody wanted Saturday and is being given Sunday. */}
          {inspection.slotAt && inspection.slotAt !== inspection.requestedAt && (
            <span className={`mt-3xs block ${TYPE.caption}`}>
              {ASKED_FOR} {whenLine(inspection.requestedAt, locale)}
            </span>
          )}

          {inspection.note && (
            <span className={`mt-2xs block ${TYPE.rowMeta}`}>{inspection.note}</span>
          )}
          {inspection.listerNote && (
            <span className={`mt-2xs block ${TYPE.rowMeta}`}>{inspection.listerNote}</span>
          )}
        </span>

        {/* Its own line under the text on a phone, back on the right where
            there is room. See `.nf-insp-row__state` in threads.css: as a
            `shrink-0` cell at 390 it took a third of the card and every line
            of the row broke over three. */}
        <span className="nf-insp-row__state shrink-0">
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
        confirmed inspection needs nothing done to it, so it says so and stops.
      */}
      {yourMove && side === "lister" && (
        <div className={`flex flex-wrap gap-xs ${CONTROL_INDENT}`}>
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
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => answerInspection({ id: inspection.id, state: "DECLINED" }))}
          >
            {DECLINE}
          </Button>
        </div>
      )}

      {yourMove && side === "requester" && inspection.state === "PROPOSED" && (
        <div className={`flex flex-wrap gap-xs ${CONTROL_INDENT}`}>
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
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => closeInspection({ id: inspection.id, state: "WITHDRAWN" }))}
          >
            {WITHDRAW}
          </Button>
        </div>
      )}

      {/* A confirmed inspection can be marked as done by either side, because
          either of them might be the one holding the phone afterwards. */}
      {inspection.state === "CONFIRMED" && (
        <div className={`flex flex-wrap items-center gap-xs ${CONTROL_INDENT}`}>
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

      {/*
        THE MORNING AFTER THE INSPECTION, AND IT WAS A DEAD END.

        A COMPLETED row drew nothing at all. The only doors into
        `/rent/pay/<inspectionId>` in the whole product were inside a thread
        (`components/app/threads/RentalFace.tsx`, on the CONFIRMED state) and
        the move-in ledger, so `/inspections`, the surface somebody opens the
        day after standing in a flat, offered a chat link and stopped, on a
        platform whose name is about rent.

        The requester pays, so only that side sees it, exactly as the thread
        face decides. The route itself owns every answer to "is there a charge
        yet": no keys, not accepted, no figure, the lister looking at the
        tenant's page, already paid, each a designed screen. So this is a
        control that acts, not a picture of one.
      */}
      {inspection.state === "COMPLETED" && side === "requester" && (
        <div className={`flex flex-wrap items-center gap-xs ${CONTROL_INDENT}`}>
          <Link
            href={`/rent/pay/${inspection.id}`}
            className="nf-btn nf-btn--primary nf-btn--sm"
            data-testid="inspection-rent-pay"
          >
            {PAY_RENT}
            <UiIcon name="chevron-right" size={16} />
          </Link>
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
      <div className="px-2xs pb-xs">
        <p className={TYPE.body}>{PROPOSE_SUB}</p>

        <label className="mt-md block">
          <span className="nf-label">{WHEN_LABEL}</span>
          <input
            type="datetime-local"
            value={when}
            /* UX-20: Lagos time, two hours ahead at the earliest, as the request is. */
            min={earliestLagosInput()}
            suppressHydrationWarning
            step={900}
            onChange={(event) => setWhen(event.target.value)}
            className="nf-field mt-2xs w-full"
          />
        </label>

        <label className="mt-md block">
          <span className="nf-label">{NOTE_LABEL}</span>
          <input
            type="text"
            value={note}
            maxLength={400}
            onChange={(event) => setNote(event.target.value)}
            placeholder={NOTE_PLACEHOLDER}
            className="nf-field mt-2xs w-full"
          />
        </label>

        <Button
          full
          size="lg"
          variant="primary"
          className="mt-lg"
          disabled={pending || when.length === 0}
          onClick={() => onSubmit(lagosWallClockToIso(when) ?? when, note.trim())}
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
const PAY_RENT = "Pay the rent";
const PROPOSE_TITLE = "Offer another time";
const PROPOSE_SUB =
  "They will see the time you offer and can take it in one tap. The time they asked for stays on the record.";
const WHEN_LABEL = "When you can do it (Lagos time)";
const NOTE_LABEL = "A line for them, if you want one";
const NOTE_PLACEHOLDER = "The gate closes at 6, so earlier is better";
const PROPOSE_SEND = "Send this time";
