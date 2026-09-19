"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate, type Locale } from "@vallo/i18n";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Sheet } from "@/components/ui/Sheet";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";
import { MediaFrame } from "@/components/app/MediaFrame";
import { TYPE } from "@/components/app/Screen";
import { formatPhone } from "@/lib/phone";
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

/**
 * ONE INSPECTION, IN THE ANATOMY OF F6A8A482.
 *
 * The listing card with the state on it, the date / other party / status
 * row, the ladder with its count and bar, the notes, then Add photos and the
 * report. Every control writes through the existing actions and the
 * database's own transition guard; the face shows its new state the moment
 * the action returns and then asks the router to re-read, so what is drawn
 * is never ahead of what was saved.
 *
 * WHAT IS HONEST HERE AND WHAT IS NOT DRAWN. The reference's eight-item
 * checklist has no model behind it (see `ladder.ts`), so the ladder is the
 * four things the record can say. "Add photos" goes to the conversation's
 * composer with the picker open, because the message-attachments bucket is
 * the one real photo path an inspection has. "Submit inspection report"
 * is `closeInspection` with an outcome, live only once the viewing is
 * agreed and an outcome is chosen. The notes are the two the row carries,
 * read-only, because no action writes a note after the fact.
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
};

const STATE_LABEL: Record<InspectionState, string> = {
  REQUESTED: "Requested",
  CONFIRMED: "Scheduled",
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

const RUNG: Record<LadderKey, { icon: UiIconName; name: string; detail: string }> = {
  asked: { icon: "calendar-booking", name: "Viewing requested", detail: "The request is on both sides' lists" },
  agreed: { icon: "history", name: "Time agreed", detail: "A day and a time both of you accepted" },
  visited: { icon: "house", name: "Viewing happened", detail: "Somebody stood in the property" },
  recorded: { icon: "document", name: "Outcome recorded", detail: "How it went, written on the record" },
};

const OUTCOME_LABEL: Record<InspectionOutcome, string> = {
  inspected: "I inspected it",
  deal_done: "Inspected, and we have a deal",
  no_deal: "Inspected, no deal",
};

function whenLine(value: string, locale: Locale): { day: string; time: string } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: "", time: "" };
  return {
    day: formatDate(date, locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }),
    time: formatDate(date, locale, { hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" }),
  };
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
    <details className="nf-insp-fold" open={open} data-testid="inspection-sheet">
      <summary>
        <div className="nf-insp-card">
          <div className="nf-insp-card__photo" aria-hidden="true">
            <MediaFrame hue={facts?.hue ?? 0} kind={facts?.kind ?? "home"} ghost={Boolean(facts?.photo)} />
            {facts?.photo && <Image src={facts.photo} alt="" fill sizes="116px" className="object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <StatusPill tone={STATE_TONE[inspection.state]} size="xs">
              {STATE_LABEL[inspection.state]}
            </StatusPill>
            <p className="nf-insp-card__title">{inspection.listingTitle ?? "A property that is no longer listed"}</p>
            {facts && (facts.area || facts.city) && (
              <p className="nf-insp-card__line">
                <UiIcon name="location" size={14} className="shrink-0 text-[var(--nf-brand-secondary)]" />
                <span className="truncate">{[facts.area, facts.city].filter(Boolean).join(", ")}</span>
              </p>
            )}
            {facts && (
              <p className="nf-insp-card__line">
                <UiIcon name="house" size={14} className="shrink-0 text-[var(--nf-brand-secondary)]" />
                <span className="truncate">{facts.kindLabel}</span>
              </p>
            )}
            {facts?.priceLabel && (
              <p className="nf-insp-card__price">
                {facts.priceLabel} {facts.periodLabel && <small>{facts.periodLabel}</small>}
              </p>
            )}
          </div>
          <UiIcon name="chevron-right" size={20} className="nf-insp-card__chev" />
        </div>
      </summary>

      {/* ------------------------------------------------ date, party, state */}
      <dl className="nf-insp-facts">
        <div className="nf-insp-fact">
          <span className="nf-insp-fact__glyph" aria-hidden="true">
            <UiIcon name="calendar-booking" size={16} />
          </span>
          <div className="min-w-0">
            <dt className="nf-insp-fact__label">Inspection date</dt>
            <dd className="nf-insp-fact__value">{when.day}</dd>
            <dd className="nf-insp-fact__label">{when.time}</dd>
          </div>
        </div>
        <div className="nf-insp-fact">
          <span className="nf-insp-fact__glyph" aria-hidden="true">
            <UiIcon name="user" size={16} />
          </span>
          <div className="min-w-0">
            <dt className="nf-insp-fact__label">{side === "requester" ? "Showing you round" : "Asked to view"}</dt>
            <dd className="nf-insp-fact__value">{inspection.counterpartName ?? "Not named yet"}</dd>
            {/*
              THE NUMBER, when this reader is allowed to have it.

              `lib/security/counterpart-contact.ts` decides: RLS membership
              first, a block in either direction withholds it, every failure
              withholds. Null therefore means the line is not drawn at all,
              rather than drawn empty or drawn as a dead control. The anchor
              hands the number to the device's dialler and nothing here logs
              it; `formatPhone` is what puts it on the screen, so the digits
              are grouped the same way everywhere on the platform.
            */}
            {inspection.counterpartPhone && (
              <dd className="nf-insp-fact__phone">
                <a href={`tel:${inspection.counterpartPhone}`} aria-label={`Call ${inspection.counterpartName ?? "them"}`}>
                  <UiIcon name="phone" size={14} className="shrink-0" />
                  <span className="nf-numeric">{formatPhone(inspection.counterpartPhone)}</span>
                </a>
              </dd>
            )}
          </div>
        </div>
        <div className="nf-insp-fact">
          <span className="nf-insp-fact__glyph" aria-hidden="true">
            <UiIcon name="history" size={16} />
          </span>
          <div className="min-w-0">
            <dt className="nf-insp-fact__label">Status</dt>
            <dd className="nf-insp-fact__pill">
              <StatusPill tone={STATE_TONE[inspection.state]} size="xs">
                {yourMove ? "Your move" : STATE_LABEL[inspection.state]}
              </StatusPill>
            </dd>
          </div>
        </div>
      </dl>

      {/* ---------------------------------------------------------- ladder */}
      <section className="nf-insp-ladder" aria-label="Inspection progress">
        <div className="nf-insp-ladder__head">
          <p className="nf-insp-ladder__title">
            <UiIcon name="document" size={20} className="text-[var(--nf-brand-secondary)]" />
            Inspection progress
          </p>
          <p className="nf-insp-ladder__count nf-numeric">
            {count.done} / {count.total} completed
          </p>
        </div>
        <Progress value={count.done} max={count.total} label="Inspection progress" size="sm" />
        <ol className="nf-insp-ladder__rows">
          {rungs.map((rung) => {
            const words = RUNG[rung.key];
            return (
              <li key={rung.key} className={`nf-insp-step${rung.done ? " nf-insp-step--done" : ""}`}>
                <span className="nf-insp-step__tile" aria-hidden="true">
                  <UiIcon name={words.icon} size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="nf-insp-step__name block">{words.name}</span>
                  <span className="nf-insp-step__detail block">{words.detail}</span>
                </span>
                <span className="nf-insp-step__ring" aria-hidden="true">
                  {rung.done && <UiIcon name="verified" size={14} />}
                </span>
                <span className="sr-only">{rung.done ? "Done" : "Not yet"}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ----------------------------------------------------------- notes */}
      <section className="nf-insp-notes" aria-label="Notes">
        <span className="nf-insp-fact__glyph" aria-hidden="true">
          <UiIcon name="document" size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={TYPE.rowTitle}>Notes</p>
          {inspection.note && <p className="nf-insp-notes__body">{inspection.note}</p>}
          {inspection.listerNote && <p className="nf-insp-notes__body">{inspection.listerNote}</p>}
          {!inspection.note && !inspection.listerNote && (
            <p className={`mt-2xs ${TYPE.rowMeta}`}>No notes on this viewing yet.</p>
          )}
        </div>
      </section>

      {error && (
        <p role="alert" className={`mt-inline ${TYPE.rowMeta} text-[var(--nf-state-error)]`}>
          {error}
        </p>
      )}

      {/* --------------------------------------------------------- actions */}
      <div className="nf-insp-actions">
        {/* The open states: whose move it is decides which controls exist. */}
        {yourMove && side === "lister" && (
          <div className="flex flex-wrap gap-xs">
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
          <div className="flex flex-wrap gap-xs">
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
            className="nf-btn nf-btn--primary nf-btn--lg nf-btn--full"
            data-testid="inspection-add-photos"
          >
            <UiIcon name="picture" size={20} />
            Add photos
            <UiIcon name="chevron-right" size={16} />
          </Link>
        )}

        {reportable && (
          <div className="nf-insp-notes flex-col" role="group" aria-label="How did it go?">
            <p className={TYPE.rowTitle}>How did it go?</p>
            <div className="mt-xs flex flex-col gap-2xs">
              {INSPECTION_OUTCOMES.map((value) => {
                const chosen = outcome === value;
                return (
                  <Button
                    key={value}
                    variant={chosen ? "primary" : "secondary"}
                    full
                    aria-pressed={chosen}
                    leadingIcon={chosen ? "verified" : undefined}
                    onClick={() => setOutcome(value)}
                  >
                    {OUTCOME_LABEL[value]}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
        <Button
          variant="secondary"
          size="lg"
          full
          disabled={!reportable || outcome === null || pending}
          leadingIcon="share"
          onClick={() =>
            outcome && run(() => closeInspection({ id: inspection.id, state: "COMPLETED", outcome }))
          }
          data-testid="inspection-submit"
        >
          Submit inspection report
        </Button>
        {!reportable && inspection.state !== "COMPLETED" && (
          <p className={`text-center ${TYPE.caption}`}>
            The report opens once a time is agreed on both sides.
          </p>
        )}
        {inspection.conversationId && (
          <Link
            href={`/messages/${inspection.conversationId}`}
            className={`self-center ${TYPE.rowMeta} font-semibold text-[var(--nf-content-link)] hover:underline`}
          >
            Open the chat
          </Link>
        )}
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

/** The hero every inspection page opens with. */
export function InspectionHero({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="nf-insp-hero">
      <div className="min-w-0 flex-1">
        <h1 className="nf-insp-hero__title">
          Property <span className="nf-insp-hero__lit">{title}</span>
        </h1>
        <p className="nf-insp-hero__sub">{sub}</p>
      </div>
      <span className="nf-insp-hero__mark" aria-hidden="true">
        <BrandIcon name="home-check" fill />
      </span>
    </div>
  );
}
