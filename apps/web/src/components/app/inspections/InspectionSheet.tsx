"use client";

import "@/app/css/inspection.css";
import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate, type Locale } from "@vallo/i18n";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { MediaFrame } from "@/components/app/MediaFrame";
import { TYPE } from "@/components/app/Screen";
import { formatPhone } from "@/lib/phone";
import { useBack } from "@/lib/nav/use-back";
import type { ListingKind } from "@/lib/listings/types";
import {
  acceptProposedTime,
  answerInspection,
  closeInspection,
} from "@/lib/inspections/actions";
import {
  INSPECTION_OUTCOMES,
  waitingOn,
  type Inspection,
  type InspectionOutcome,
  type InspectionState,
} from "@/lib/inspections/types";
import { canReport, ladderCount, ladderFor, type LadderKey } from "./ladder";
import { statusFor, type BadgeTone } from "./status";

/**
 * ONE INSPECTION, IN THE ANATOMY OF F6A8A482.
 *
 * The listing card with its badge, the date / agent / status row, the
 * checklist panel with its count and bar, the notes, then Add Photos (lit)
 * and Submit Inspection Report (secondary, disabled until it can be sent).
 * Every control writes through the existing actions and the database's own
 * transition guard (`private.guard_inspection_transition`); the face asks the
 * router to re-read the moment an action returns, and `InspectionsLive`
 * re-reads when the OTHER side moves, so what is drawn is never ahead of what
 * was saved and never behind it for long.
 *
 * WHAT IS HONEST HERE AND WHAT IS NOT DRAWN. The render's eight room-by-room
 * rows (Exterior to Overall Condition) have no table behind them: nothing
 * stores a tick, a room note or a photo against an inspection. Drawing eight
 * circles that forget their ticks on reload would be a picture of a feature,
 * so the checklist panel carries the four things the record CAN say (see
 * `ladder.ts`), and the table the eight rows need is Session B scope request
 * I1. "Add Photos" goes to the conversation, because the message-attachments
 * bucket is the one real photo path an inspection has today. "Submit
 * Inspection Report" is `closeInspection` with an outcome, live once the
 * viewing is agreed and an outcome is chosen. The notes are the two the row
 * carries, read-only, because no action writes a note after the fact
 * (request I1 again).
 */

export type InspectionListingFacts = {
  area: string;
  city: string;
  kind: ListingKind;
  kindLabel: string;
  /** Pre-formatted through formatMoney; empty when nothing is stated. */
  priceLabel: string;
  periodLabel: string;
  photo: string | null;
  hue: number;
  /**
   * The listing is one of the catalogue's examples (`listings.is_demo`).
   * Optional because fixtures predate it. Drawn as its own badge so an
   * example can never pass as a real property someone is going to see.
   */
  isDemo?: boolean;
};

/** The listing card's badge: what the appointment is. */
const STATE_LABEL: Record<InspectionState, string> = {
  REQUESTED: "Requested",
  CONFIRMED: "Scheduled",
  PROPOSED: "New time offered",
  DECLINED: "Declined",
  COMPLETED: "Inspected",
  WITHDRAWN: "Withdrawn",
};

const STATE_TONE: Record<InspectionState, BadgeTone> = {
  REQUESTED: "pending",
  CONFIRMED: "good",
  PROPOSED: "pending",
  DECLINED: "bad",
  COMPLETED: "good",
  WITHDRAWN: "quiet",
};

/*
 * Each rung sits on a lit round disc, drawn to the render's measured size and
 * light, with the stroked glyph chosen for what the rung means: the house
 * for the request, the shield with its tick for the agreed time, the room
 * for the visit, the document for the outcome.
 */
const RUNG: Record<LadderKey, { icon: UiIconName; name: string; detail: string }> = {
  asked: { icon: "house", name: "Viewing requested", detail: "The request is on both sides' lists" },
  agreed: { icon: "verified", name: "Time agreed", detail: "A day and a time both sides took" },
  visited: { icon: "bed", name: "Viewing happened", detail: "Somebody stood in the property" },
  recorded: { icon: "document", name: "Outcome recorded", detail: "How it went, written on the record" },
};

const CROPS = "/brand/session-b/inspection";

/** A crop from the render, with its daylight cut; the theme picks one. */
function Crop({
  name,
  width,
  height,
  className,
}: {
  name: string;
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <>
      <Image
        src={`${CROPS}/${name}.webp`}
        alt=""
        width={width}
        height={height}
        unoptimized
        className={`nf-ix-crop nf-ix-crop--night ${className ?? ""}`}
      />
      <Image
        src={`${CROPS}/${name}-day.webp`}
        alt=""
        width={width}
        height={height}
        unoptimized
        className={`nf-ix-crop nf-ix-crop--day ${className ?? ""}`}
      />
    </>
  );
}

/* The full meaning, which is the accessible name of each choice. */
const OUTCOME_LABEL: Record<InspectionOutcome, string> = {
  inspected: "I inspected it",
  deal_done: "Inspected, and we have a deal",
  no_deal: "Inspected, no deal",
};

/* The drawn words: short, so the three sit in one row (lead ruling R-F). */
const OUTCOME_SHORT: Record<InspectionOutcome, string> = {
  inspected: "Inspected",
  deal_done: "Deal done",
  no_deal: "No deal",
};

function whenLine(value: string, locale: Locale): { day: string; time: string } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: "", time: "" };
  return {
    day: formatDate(date, locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }),
    time: formatDate(date, locale, { hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" }),
  };
}

function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return <span className={`nf-ix-badge nf-ix-badge--${tone}`}>{children}</span>;
}

export function InspectionSheet({
  inspection,
  side,
  facts,
  locale,
  open = false,
}: {
  inspection: Inspection;
  side: "lister" | "requester";
  facts: InspectionListingFacts | null;
  locale: Locale;
  /** Expanded on arrival. The first live one is; the rest fold to their card. */
  open?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [proposing, setProposing] = useState(false);
  const [outcome, setOutcome] = useState<InspectionOutcome | null>(null);

  const waiting = waitingOn(inspection.state);
  const yourMove = waiting === side;
  const rungs = ladderFor(inspection);
  const count = ladderCount(rungs);
  const shown = inspection.slotAt ?? inspection.requestedAt;
  const when = whenLine(shown, locale);
  const reportable = canReport(inspection.state);
  const status = statusFor(inspection, side);

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
    <details className="nf-ix nf-ix-fold" open={open} data-testid="inspection-sheet">
      <summary>
        <div className="nf-ix-glass nf-ix-card">
          <div className="nf-ix-card__photo" aria-hidden="true">
            <MediaFrame hue={facts?.hue ?? 0} kind={facts?.kind ?? "home"} ghost={Boolean(facts?.photo)} />
            {facts?.photo && <Image src={facts.photo} alt="" fill sizes="(min-width: 640px) 160px, 116px" className="object-cover" />}
          </div>
          <div className="nf-ix-card__text">
            <span className="nf-ix-card__badges">
              <Badge tone={STATE_TONE[inspection.state]}>{STATE_LABEL[inspection.state]}</Badge>
              {facts?.isDemo && <Badge tone="quiet">Example listing</Badge>}
            </span>
            <p className="nf-ix-card__title">{inspection.listingTitle ?? "A property that is no longer listed"}</p>
            {facts && (facts.area || facts.city) && (
              <p className="nf-ix-card__line">
                <UiIcon name="location" size={12} />
                <span className="truncate">{[facts.area, facts.city].filter(Boolean).join(", ")}</span>
              </p>
            )}
            {facts && (
              <p className="nf-ix-card__line">
                <UiIcon name="house" size={12} />
                <span className="truncate">{facts.kindLabel}</span>
              </p>
            )}
            {facts?.priceLabel && (
              <p className="nf-ix-card__price">
                {facts.priceLabel} {facts.periodLabel && <small>{facts.periodLabel}</small>}
              </p>
            )}
          </div>
          <UiIcon name="chevron-right" size={20} className="nf-ix-card__chev" />
        </div>
      </summary>

      <div className="nf-ix-body">
        {/* ---------------------------------------------- date, party, state */}
        <dl className="nf-ix-glass nf-ix-facts">
          <div className="nf-ix-fact">
            <span className="nf-ix-fact__glyph" aria-hidden="true">
              <UiIcon name="calendar-booking" size={16} />
            </span>
            <div className="nf-ix-fact__text">
              <dt className="nf-ix-fact__label">Inspection Date</dt>
              <dd className="nf-ix-fact__value">{when.day}</dd>
              <dd className="nf-ix-fact__sub">{when.time}</dd>
            </div>
          </div>
          <div className="nf-ix-fact">
            <span className="nf-ix-fact__glyph" aria-hidden="true">
              <UiIcon name="user" size={16} />
            </span>
            <div className="nf-ix-fact__text">
              {/* The render says "Assigned Agent". Nobody is assigned: the other
                  party is whoever lists the property, owner or agent, so the
                  label says that and no more (CLAIMS_RULE; ledger 9, refused). */}
              <dt className="nf-ix-fact__label">{side === "requester" ? "Listed by" : "Requested by"}</dt>
              <dd className="nf-ix-fact__value">{inspection.counterpartName ?? "Not named yet"}</dd>
              {/*
                THE NUMBER, when this reader is allowed to have it, visible
                under the name as the render draws it and itself the tel:
                link. `lib/security/counterpart-contact.ts` decides; null means
                no line is drawn at all rather than a dead control.
              */}
              {inspection.counterpartPhone && (
                <dd>
                  <a
                    href={`tel:${inspection.counterpartPhone}`}
                    className="nf-ix-fact__phone nf-numeric"
                    aria-label={`Call ${inspection.counterpartName ?? "them"} on ${formatPhone(inspection.counterpartPhone)}`}
                    data-testid="inspection-call"
                  >
                    {formatPhone(inspection.counterpartPhone)}
                  </a>
                </dd>
              )}
            </div>
          </div>
          <div className="nf-ix-fact">
            <span className="nf-ix-fact__glyph" aria-hidden="true">
              <UiIcon name="history" size={16} />
            </span>
            <div className="nf-ix-fact__text">
              <dt className="nf-ix-fact__label">Status</dt>
              <dd className="nf-ix-fact__badge">
                <Badge tone={status.tone}>{status.label}</Badge>
              </dd>
            </div>
          </div>
        </dl>

        {/* -------------------------------------------------------- checklist */}
        <section className="nf-ix-glass nf-ix-check" aria-label="Inspection checklist">
          <div className="nf-ix-check__head">
            <p className="nf-ix-check__title">
              <UiIcon name="document" size={16} />
              Inspection Checklist
            </p>
            <div className="nf-ix-check__count">
              <span className="nf-numeric">
                {count.done} / {count.total} Completed
              </span>
              <span
                className="nf-ix-bar"
                role="progressbar"
                aria-label="Inspection checklist"
                aria-valuemin={0}
                aria-valuemax={count.total}
                aria-valuenow={count.done}
              >
                <span style={{ width: `${(count.done / count.total) * 100}%` }} />
              </span>
            </div>
          </div>
          <ol className="nf-ix-check__rows">
            {rungs.map((rung) => {
              const words = RUNG[rung.key];
              return (
                <li key={rung.key} className={`nf-ix-step${rung.done ? " nf-ix-step--done" : ""}`}>
                  <span className="nf-ix-step__plate" aria-hidden="true">
                    <UiIcon name={words.icon} size={16} />
                  </span>
                  <span className="nf-ix-step__text">
                    <span className="nf-ix-step__name">{words.name}</span>
                    <span className="nf-ix-step__detail">{words.detail}</span>
                  </span>
                  <span className="nf-ix-step__ring" aria-hidden="true" />
                  <span className="sr-only">{rung.done ? "Done" : "Not yet"}</span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ------------------------------------------------------------ notes */}
        <section className="nf-ix-glass nf-ix-notes" aria-label="Notes">
          <UiIcon name="document" size={16} className="nf-ix-notes__glyph" />
          <div className="min-w-0 flex-1">
            <p className="nf-ix-notes__label">Notes</p>
            {inspection.note && (
              <p className="nf-ix-notes__well">
                <span className="nf-ix-notes__who">{side === "requester" ? "You wrote" : "They wrote"}</span>
                {inspection.note}
              </p>
            )}
            {inspection.listerNote && (
              <p className="nf-ix-notes__well">
                <span className="nf-ix-notes__who">{side === "lister" ? "You wrote" : "The agent wrote"}</span>
                {inspection.listerNote}
              </p>
            )}
            {!inspection.note && !inspection.listerNote && (
              <p className="nf-ix-notes__well nf-ix-notes__empty">No notes on this viewing yet.</p>
            )}
          </div>
        </section>

        {reportable && (
          <section className="nf-ix-glass nf-ix-outcome" aria-label="How did it go?">
            <p className="nf-ix-outcome__head" id={`outcome-${inspection.id}`}>
              How did it go?
            </p>
            <div className="nf-ix-outcome__options" role="radiogroup" aria-labelledby={`outcome-${inspection.id}`}>
              {INSPECTION_OUTCOMES.map((value) => {
                const chosen = outcome === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={chosen}
                    aria-label={OUTCOME_LABEL[value]}
                    className="nf-ix-option"
                    onClick={() => setOutcome(value)}
                    data-testid={`inspection-outcome-${value}`}
                  >
                    <span className="nf-ix-step__ring" aria-hidden="true" />
                    {OUTCOME_SHORT[value]}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {error && (
          <p role="alert" className="nf-ix-error">
            {error}
          </p>
        )}

        {/* ---------------------------------------------------------- actions */}
        <div className="nf-ix-actions">
          {yourMove && side === "lister" && (
            <div className="nf-ix-actions__row">
              <Button
                variant="primary"
                disabled={pending}
                onClick={() => run(() => answerInspection({ id: inspection.id, state: "CONFIRMED" }))}
              >
                Confirm
              </Button>
              <Button variant="secondary" disabled={pending} onClick={() => setProposing(true)}>
                Offer another time
              </Button>
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => run(() => answerInspection({ id: inspection.id, state: "DECLINED" }))}
              >
                Decline
              </Button>
            </div>
          )}
          {yourMove && side === "requester" && inspection.state === "PROPOSED" && (
            <div className="nf-ix-actions__row">
              <Button
                variant="primary"
                disabled={pending}
                onClick={() => run(() => acceptProposedTime({ id: inspection.id }))}
              >
                Take that time
              </Button>
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => run(() => closeInspection({ id: inspection.id, state: "WITHDRAWN" }))}
              >
                Withdraw
              </Button>
            </div>
          )}
          {side === "requester" && inspection.state === "REQUESTED" && (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => run(() => closeInspection({ id: inspection.id, state: "WITHDRAWN" }))}
            >
              Withdraw the request
            </Button>
          )}

          {inspection.conversationId && (
            <Link
              href={`/messages/${inspection.conversationId}?attach=1`}
              className="nf-btn nf-btn--primary nf-btn--lg nf-btn--full nf-ix-cta"
              aria-label="Add Photos, in the conversation about this viewing"
              data-testid="inspection-add-photos"
            >
              <UiIcon name="chevron-right" size={16} className="nf-ix-cta__start" />
              <UiIcon name="picture" size={16} />
              Add Photos
              <UiIcon name="chevron-right" size={16} className="nf-ix-cta__end" />
            </Link>
          )}

          <Button
            variant="secondary"
            full
            className="nf-ix-submit"
            disabled={!reportable || outcome === null || pending}
            leadingIcon="telegram"
            onClick={() =>
              outcome && run(() => closeInspection({ id: inspection.id, state: "COMPLETED", outcome }))
            }
            data-testid="inspection-submit"
          >
            Submit Inspection Report
          </Button>
          {reportable && outcome === null && (
            <p className="nf-ix-hint">Choose how it went, and the report can be sent.</p>
          )}
          {!reportable && inspection.state !== "COMPLETED" && (
            <p className="nf-ix-hint">The report opens once a time is agreed on both sides.</p>
          )}
          {inspection.conversationId && (
            <Link href={`/messages/${inspection.conversationId}`} className="nf-ix-link">
              Open the chat
            </Link>
          )}
        </div>
      </div>

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
    </details>
  );
}

/** Offering another time, in a sheet so the list under it does not move. */
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
    <Sheet open={open} onOpenChange={onOpenChange} title="Offer another time" detents={[0.55]}>
      <p className={TYPE.body}>
        They will see the time you offer and can take it in one tap. The time they asked for stays on the record.
      </p>
      <label className="mt-md block">
        <span className="nf-label">When you can do it</span>
        <input
          type="datetime-local"
          value={when}
          onChange={(event) => setWhen(event.target.value)}
          className="nf-field mt-2xs w-full"
        />
      </label>
      <label className="mt-md block">
        <span className="nf-label">A line for them, if you want one</span>
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
        Send this time
      </Button>
    </Sheet>
  );
}

/**
 * The top every inspection page opens with: the page's own back square (the
 * logo, bell and profile in the render's top row are the shared app header,
 * not this page's), the title with its second word lit, the blue sub line,
 * and the glass house with the tick at the right.
 */
export function InspectionHero({
  title = "Inspection",
  sub,
  fallback = "/home",
  back = true,
}: {
  /** The lit second word. */
  title?: string;
  sub: string;
  fallback?: string;
  /** Off where a console shell already draws its own way back. */
  back?: boolean;
}) {
  const goBack = useBack(fallback);
  return (
    <div className="nf-ix nf-ix-hero">
      {back && (
        <button
          type="button"
          aria-label="Back"
          onClick={goBack}
          className="nf-icon-btn nf-icon-btn--glass h-11 w-11 shrink-0"
        >
          <UiIcon name="arrow-left" size={20} />
        </button>
      )}
      <div className="nf-ix-hero__row">
        <div className="min-w-0 flex-1">
          <h1 className="nf-ix-hero__title">
            Property <span className="nf-ix-hero__lit">{title}</span>
          </h1>
          <p className="nf-ix-hero__sub">{sub}</p>
        </div>
        {/* The render's own glass house, cropped and keyed (SOURCES.md). */}
        <span className="nf-ix-hero__mark" aria-hidden="true">
          <Crop name="house-check" width={186} height={140} />
        </span>
      </div>
    </div>
  );
}
