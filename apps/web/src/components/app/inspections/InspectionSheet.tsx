"use client";

import "@/app/css/inspection.css";
import { UnsafeSheet } from "@/components/app/safety/UnsafeSheet";
import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { countOf, formatDate, type Dictionary, type Locale } from "@vallo/i18n/core";
import { GateHandshake } from "./GateHandshake";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { IconPlate } from "@/components/ui/IconPlate";
import { panelClass } from "@/components/ui/Panel";
import { Sheet } from "@/components/ui/Sheet";
import { SuccessSheet } from "@/components/ui/SuccessSheet";
import { successCopy, type SuccessWords } from "@/lib/ui/success-moments";
import { MediaFrame } from "@/components/app/MediaFrame";
import { TYPE } from "@/components/app/Screen";
import { formatPhone } from "@/lib/phone";
import { BackControl } from "@/components/ui/BackControl";
import type { ListingKind } from "@/lib/listings/types";
import {
  acceptProposedTime,
  answerInspection,
  addReportPhoto,
  closeInspection,
  createInspectionPhotoUpload,
  saveInspectionReport,
} from "@/lib/inspections/actions";
import { createClient } from "@/lib/supabase/client";
import {
  EMPTY_REPORT,
  ROOM_COPY,
  ROOM_ITEMS,
  canEditReport,
  canSubmit,
  checkedCount,
  fromSaved,
  photosShort,
  type InspectionReport,
  type RoomItem,
} from "@/lib/inspections/report";
import {
  INSPECTION_OUTCOMES,
  waitingOn,
  type Inspection,
  type InspectionOutcome,
  type InspectionState,
} from "@/lib/inspections/types";
import { type LadderKey } from "./ladder";
import { StatusTrack } from "@/components/app/status/StatusTrack";
import { viewingTrack } from "@/components/app/status/tracks";
import { statusFor, type BadgeTone } from "./status";
import { TierBadge } from "@/components/trust/TierBadge";
import { TruthQuestions } from "./TruthQuestions";
import { DrawUpAgreement } from "@/components/app/agreements/DrawUpAgreement";
import { AGREEMENT_STATUS_LABEL } from "@/components/app/agreements/status";
import { NO_INSPECTION_FEE, PRIVATE_FEE_NOTE, NO_INSPECTION_FEE_HEADLINE } from "@/lib/money/copy";
import { earliestLagosInput, lagosWallClockToIso } from "@/lib/inspections/when";

/**
 * ONE INSPECTION, EXACTLY IN THE ANATOMY OF F6A8A482 / founder/inspection-target.jpg.
 *
 * The listing card with its badge, the date / party / status row, the
 * inspection's lifecycle, the eight-room checklist with its count and bar,
 * the notes field, the outcome choice, Add Photos (lit) and Submit
 * Inspection Report (glass, disabled until it can be sent). Containers,
 * plates and buttons are the shared layer (Panel, IconPlate, Button).
 *
 * THE REPORT (eight rooms and notes) writes through
 * `saveInspectionReport` and nothing of this surface's own; photos go through
 * `addReportPhoto`. Behind ONE flag
 * (`reportLive`, `lib/inspections/report-flag.ts`). A tick is drawn only from
 * what the action read back from the database, never optimistically. With
 * the flag off the rows draw, the circles are not pressable, and a plain line
 * says so. The lifecycle above it writes through the existing actions.
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
  /**
   * The listing is let (`listing_intent = 'rent'`). Only then is an agreement
   * drawn up from the report, and only then does the report need photos.
   */
  isRental?: boolean;
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

/** The lifecycle, in four words, as a strip above the checklist. */
const RUNG_LABEL: Record<LadderKey, string> = {
  asked: "Requested",
  agreed: "Time agreed",
  visited: "Inspected",
  recorded: "Recorded",
};

/* The full meaning, which is the accessible name of each choice. */
const OUTCOME_LABEL: Record<InspectionOutcome, string> = {
  inspected: "I inspected it",
  deal_done: "Inspected, and we have a deal",
  no_deal: "Inspected, no deal",
};

/* The drawn words: short, so the three sit in one row (rule R-F). */
const OUTCOME_SHORT: Record<InspectionOutcome, string> = {
  inspected: "Inspected",
  deal_done: "Deal done",
  no_deal: "No deal",
};

const CROPS = "/brand/session-b/inspection";

/** A crop from the render (SOURCES.md), dark only. */
function Crop({ name, width, height, className }: { name: string; width: number; height: number; className?: string }) {
  return (
    <Image
      src={`${CROPS}/${name}.webp`}
      alt=""
      width={width}
      height={height}
      unoptimized
      className={`nf-ix-crop ${className ?? ""}`}
    />
  );
}

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
  report = null,
  reportLive = false,
  quoteLine = null,
  truth = null,
  tenancyReview = null,
  unsafe = null,
  gateCopy,
  needPhotos = 0,
  agreement = null,
  success,
}: {
  /** The page's `t.success`, for "report submitted" and "recorded". Absent, no sheet. */
  success?: SuccessWords;
  inspection: Inspection;
  side: "lister" | "requester";
  facts: InspectionListingFacts | null;
  locale: Locale;
  /** Expanded on arrival. The first live one is; the rest fold to their card. */
  open?: boolean;
  /** The saved report (I1), or null when none exists or storage is off. */
  report?: InspectionReport | null;
  /** The one flag: report storage exists. */
  reportLive?: boolean;
  /** V-13: "Quoted at ₦3,900,000 on Thu 1 Oct", once the lister's yes froze it. */
  quoteLine?: string | null;
  /**
   * V-05: the four truth questions, when the page decided they are open for
   * this viewer (the requester, after the agreed time). Null draws nothing.
   */
  truth?: { answeredAt: string | null; copy: Dictionary["trustVisible"]["truth"] } | null;
  /** V-59: the tenancy review, when one is waiting for this renter. */
  tenancyReview?: { href: string; label: string } | null;
  /** V-63: "I feel unsafe", on an inspection that is still ahead or under way. */
  unsafe?: Dictionary["trustVisible"]["unsafe"] | null;
  /** V-35: the gate handshake's copy. Absent, no gate section is drawn. */
  gateCopy?: Dictionary["platform"]["gate"];
  /**
   * `money_policy.min_inspection_photos`. Applied only to a rental, whose
   * report the agreement is drawn up from; the database holds the same rule.
   */
  needPhotos?: number;
  /** The agreement already drawn up from this inspection, when there is one. */
  agreement?: { id: string; status: string } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [proposing, setProposing] = useState(false);
  /* V-35: whether the card is open, so the gate section mounts only then. */
  const [expanded, setExpanded] = useState(open);
  const [outcome, setOutcome] = useState<InspectionOutcome | null>(null);
  const [saved, setSaved] = useState<InspectionReport>(report ?? EMPTY_REPORT);
  const [notes, setNotes] = useState(report?.notes ?? "");
  /* The report was submitted, or the inspection closed with its outcome.
     Opened only from the action's own ok, never from a draft save. */
  const [done, setDone] = useState<"inspectionReportSubmitted" | "inspectionRecorded" | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const waiting = waitingOn(inspection.state);
  const yourMove = waiting === side;
  const shown = inspection.slotAt ?? inspection.requestedAt;
  const when = whenLine(shown, locale);
  const status = statusFor(inspection, side);
  const editable = canEditReport(reportLive, inspection.state, saved);
  const rooms = checkedCount(saved.items);
  const isRental = facts?.isRental === true;
  const photoNeed = isRental ? needPhotos : 0;
  const submittable = canSubmit(reportLive, inspection.state, saved, outcome, photoNeed);
  const photosMissing = photosShort(saved, photoNeed);

  function run(work: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await work();
      if (!result.ok) {
        setError(result.error ?? "That did not go through.");
        return;
      }
      after?.();
      router.refresh();
    });
  }

  /*
   * A tick is drawn only from what the action read back, never
   * optimistically. The notes travel with EVERY call: the action writes
   * `notes ?? null` on each save, so a tick sent without them would clear
   * what was typed.
   */
  function saveReport(body: { items?: { item: RoomItem; checked: boolean }[]; submit?: boolean }) {
    setError(null);
    startTransition(async () => {
      const result = await saveInspectionReport({
        inspectionId: inspection.id,
        items: body.items ?? [],
        notes: notes.trim().length > 0 ? notes : null,
        submit: body.submit ?? false,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved((now) => fromSaved(result.data, now.photoCount));
      if (body.submit === true) setDone("inspectionReportSubmitted");
      router.refresh();
    });
  }

  /*
   * A photo into the report: a signed path from
   * `createInspectionPhotoUpload`, the upload straight from the browser to the
   * private bucket, then `addReportPhoto` records the row.
   * The count moves only when that row came back.
   */
  async function addPhoto(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    setError(null);
    setUploading(true);
    try {
      const target = await createInspectionPhotoUpload({ inspectionId: inspection.id, extension });
      if (!target.ok) {
        setError(target.error);
        return;
      }
      const upload = await createClient()
        .storage.from("inspection-photos")
        .uploadToSignedUrl(target.data.path, target.data.token, file, { contentType: file.type });
      if (upload.error) {
        setError("That photo did not upload. Try again in a moment.");
        return;
      }
      const added = await addReportPhoto({ inspectionId: inspection.id, storagePath: target.data.path });
      if (!added.ok) {
        setError(added.error);
        return;
      }
      setSaved((now) => ({ ...now, photoCount: now.photoCount + 1 }));
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    if (reportLive) {
      saveReport({ submit: true });
      return;
    }
    if (!outcome) return;
    run(
      () => closeInspection({ id: inspection.id, state: "COMPLETED", outcome }),
      () => setDone("inspectionRecorded"),
    );
  }
  const doneWords = done && success ? successCopy(success, done) : null;

  return (
    <>
    <details
      className="nf-ix nf-ix-fold"
      open={open}
      onToggle={(event) => setExpanded((event.currentTarget as HTMLDetailsElement).open)}
      data-testid="inspection-sheet"
    >
      <summary>
        <div className={panelClass({ variant: "card", className: "nf-ix-card" })}>
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
            {quoteLine && (
              <p className="nf-ix-card__line" data-testid="inspection-quote">
                <UiIcon name="key" size={12} />
                <span className="truncate">{quoteLine}</span>
              </p>
            )}
          </div>
          <UiIcon name="chevron-right" size={20} className="nf-ix-card__chev" />
        </div>
        {/* Track B: visible on the closed card too, so nobody has to open it
            to learn there is nothing to pay. */}
        <p className="nf-ix-nofee-line" data-testid="inspection-no-fee-headline">
          {NO_INSPECTION_FEE_HEADLINE}
        </p>
      </summary>

      {/* TRACK B: stated on the inspection screen itself, not only in a policy. */}
      <div className="nf-ix-nofee" role="note" data-testid="inspection-no-fee">
        <UiIcon name="verified" size={16} />
        <p>
          <strong>{NO_INSPECTION_FEE_HEADLINE}.</strong> {NO_INSPECTION_FEE} {PRIVATE_FEE_NOTE}
        </p>
      </div>

      <div className="nf-ix-body">
        {/* ---------------------------------------------- date, party, state */}
        <dl className={panelClass({ variant: "card", className: "nf-ix-facts" })}>
          <div className="nf-ix-fact">
            <span className="nf-ix-fact__glyph" aria-hidden="true">
              <Crop name="glyph-calendar" width={44} height={44} />
            </span>
            <div className="nf-ix-fact__text">
              <dt className="nf-ix-fact__label">Inspection Date</dt>
              <dd className="nf-ix-fact__value">{when.day}</dd>
              <dd className="nf-ix-fact__sub">{when.time}</dd>
            </div>
          </div>
          <div className="nf-ix-fact">
            <span className="nf-ix-fact__glyph" aria-hidden="true">
              <Crop name="glyph-person" width={46} height={46} />
            </span>
            <div className="nf-ix-fact__text">
              {/* The render says "Assigned Agent". The data model has no
                  assigned agent: `inspection_requests` names the requester
                  and the lister (owner or agent) and nobody else, so the
                  label says what the row holds (CLAIMS_RULE; ledger 9). */}
              <dt className="nf-ix-fact__label">{side === "requester" ? "Listed by" : "Requested by"}</dt>
              <dd className="nf-ix-fact__value">
                {inspection.counterpartName ?? "Not named yet"}
                {inspection.counterpartBadge ? <TierBadge tier={inspection.counterpartBadge} size={14} className="nf-ix-name-tier" /> : null}
              </dd>
              {/* The number, visible under the name and itself the tel: link,
                  when `lib/security/counterpart-contact.ts` hands one over. */}
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
              <Crop name="glyph-clock" width={46} height={44} />
            </span>
            <div className="nf-ix-fact__text">
              <dt className="nf-ix-fact__label">Status</dt>
              <dd className="nf-ix-fact__badge">
                <Badge tone={status.tone}>{status.label}</Badge>
              </dd>
            </div>
          </div>
        </dl>

        {/* -------------------------------------------------------- lifecycle */}
        {/* The shared status track (spec section 14): the four rungs the
            record can honestly say happened, dated from the request's own
            times; a decline or a withdrawal stops it where it stood. */}
        <StatusTrack
          label="Inspection progress"
          testId="inspection-track"
          steps={viewingTrack({
            state: inspection.state,
            outcome: inspection.outcome ?? null,
            createdAt: inspection.createdAt,
            respondedAt: inspection.respondedAt,
            slotAt: inspection.slotAt,
          }).map((step) => {
            const at = step.at ? whenLine(step.at, locale) : null;
            return {
              key: step.key,
              label:
                step.state === "failed"
                  ? inspection.state === "DECLINED"
                    ? "Declined"
                    : "Withdrawn"
                  : RUNG_LABEL[step.key],
              when: at && at.day ? `${at.day}, ${at.time}` : null,
              state: step.state,
            };
          })}
        />

        {/* ------------------------------------------ V-59, the tenancy review */}
        {tenancyReview && (
          <ButtonLink href={tenancyReview.href} variant="primary" full data-testid="tenancy-review-entry">
            {tenancyReview.label}
          </ButtonLink>
        )}

        {/* V-63: one control, whichever side of the viewing this person is. */}
        {unsafe && <UnsafeSheet copy={unsafe} inspectionId={inspection.id} trigger="button" filerIsLister={side === "lister"} />}

        {/* ------------------------------------------ V-05, the truth questions */}
        {truth && (
          <TruthQuestions
            inspectionId={inspection.id}
            answeredAt={truth.answeredAt}
            copy={truth.copy}
            locale={locale}
          />
        )}

        {/* -------------------------------------------------------- checklist */}
        <section className={panelClass({ className: "nf-ix-check" })} aria-label="Inspection checklist">
          <div className="nf-ix-check__head">
            <p className="nf-ix-check__title">
              <Crop name="glyph-list" width={34} height={34} className="nf-ix-check__glyph" />
              Inspection Checklist
            </p>
            <div className="nf-ix-check__count">
              <span className="nf-numeric">
                {rooms.done} / {rooms.total} Completed
              </span>
              <span
                className="nf-ix-bar"
                role="progressbar"
                aria-label="Rooms checked"
                aria-valuemin={0}
                aria-valuemax={rooms.total}
                aria-valuenow={rooms.done}
              >
                <span style={{ width: `${(rooms.done / rooms.total) * 100}%` }} />
              </span>
            </div>
          </div>
          {!reportLive && (
            <p className="nf-ix-check__note" data-testid="inspection-report-off">
              Ticking the rooms starts when inspection report storage is switched on. Nothing here is saved yet.
            </p>
          )}
          <ul className="nf-ix-check__rows">
            {ROOM_ITEMS.map((item) => {
              const checked = saved.items[item] === true;
              const copy = ROOM_COPY[item];
              return (
                <li key={item} className={`nf-ix-room${checked ? " nf-ix-room--done" : ""}`}>
                  <IconPlate size="sm" className="nf-ix-room__plate">
                    <Crop name={`room-${item}`} width={50} height={50} />
                  </IconPlate>
                  <span className="nf-ix-room__text">
                    <span className="nf-ix-room__name">{copy.title}</span>
                    <span className="nf-ix-room__detail">{copy.detail}</span>
                  </span>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    aria-label={`${copy.title} checked`}
                    className="nf-ix-room__check"
                    disabled={!editable || pending}
                    onClick={() => saveReport({ items: [{ item, checked: !checked }] })}
                    data-testid={`inspection-room-${item}`}
                  />
                </li>
              );
            })}
          </ul>
        </section>

        {/* ------------------------------------------------------------ notes */}
        <section className={panelClass({ className: "nf-ix-notes" })} aria-label="Notes">
          <span className="nf-ix-notes__glyph" aria-hidden="true">
            <Crop name="glyph-pencil" width={38} height={38} />
          </span>
          <div className="min-w-0 flex-1">
            <label className="nf-ix-notes__label" htmlFor={`notes-${inspection.id}`}>
              Notes
            </label>
            {inspection.note && (
              <p className="nf-ix-notes__said">
                <span className="nf-ix-notes__who">{side === "requester" ? "You wrote" : "They wrote"}</span>
                {inspection.note}
              </p>
            )}
            {inspection.listerNote && (
              <p className="nf-ix-notes__said">
                <span className="nf-ix-notes__who">{side === "lister" ? "You wrote" : "The lister wrote"}</span>
                {inspection.listerNote}
              </p>
            )}
            <textarea
              id={`notes-${inspection.id}`}
              className="nf-ix-notes__field"
              rows={1}
              maxLength={2000}
              placeholder="Add any additional notes or observations..."
              value={notes}
              disabled={!editable || pending}
              onChange={(event) => setNotes(event.target.value)}
              onBlur={() => {
                if (editable && notes !== (saved.notes ?? "")) saveReport({});
              }}
              data-testid="inspection-notes"
            />
          </div>
        </section>

        {/* The outcome is recorded by the close action, so it is drawn only
            while report storage is off; with it on, submitting the report
            is what closes the inspection and I1 has no outcome to carry it
            (request I1a). Drawn and dropped would be worse than not drawn. */}
        {/* V-35: the gate code, which works with no signal on either phone. */}
        {/* Mounted only while this card is open: a closed card asks for no
            seed, writes no pack and runs no clock (review finding 6). */}
        {inspection.state === "CONFIRMED" && gateCopy && expanded && (
          <GateHandshake inspectionId={inspection.id} locale={locale} copy={gateCopy} />
        )}

        {inspection.state === "CONFIRMED" && !reportLive && (
          <section className={panelClass({ className: "nf-ix-outcome" })} aria-label="How did it go?">
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
                    <span className="nf-ix-option__ring" aria-hidden="true" />
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

          {/*
            Add Photos, as the render draws it (the render's own camera). With
            the report on it uploads into the report through the report photo
            actions; with it off it opens the conversation, the one photo path
            an inspection then has.
          */}
          {reportLive ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                className="sr-only"
                tabIndex={-1}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void addPhoto(file);
                }}
              />
              <Button
                variant="primary"
                full
                className="nf-ix-cta"
                disabled={!editable || uploading || pending}
                onClick={() => fileRef.current?.click()}
                data-testid="inspection-add-photos"
              >
                <Crop name="glyph-camera" width={38} height={34} className="nf-ix-cta__glyph" />
                {uploading ? "Adding photo" : saved.photoCount > 0 ? `Add Photos (${saved.photoCount})` : "Add Photos"}
                <UiIcon name="chevron-right" size={16} className="nf-ix-cta__end" />
              </Button>
            </>
          ) : inspection.conversationId ? (
            <Link
              href={`/messages/${inspection.conversationId}?attach=1`}
              className="nf-btn nf-btn--primary nf-btn--md nf-btn--full nf-ix-cta"
              aria-label="Add Photos, in the conversation about this inspection"
              data-testid="inspection-add-photos"
            >
              <Crop name="glyph-camera" width={38} height={34} className="nf-ix-cta__glyph" />
              Add Photos
              <UiIcon name="chevron-right" size={16} className="nf-ix-cta__end" />
            </Link>
          ) : null}

          <Button
            variant="secondary"
            full
            className="nf-ix-submit"
            disabled={!submittable || pending}
            onClick={submit}
            data-testid="inspection-submit"
          >
            <Crop name="glyph-plane" width={36} height={36} className="nf-ix-cta__glyph" />
            Submit Inspection Report
          </Button>
          {/* The render draws no helper line: with the report on, the count
              ("n / 8 Completed") already says why Submit waits. These two
              carry states the render cannot show (report storage off, and an
              inspection not yet agreed), so they stay; ledger 9, S12. */}
          {!reportLive && inspection.state === "CONFIRMED" && !submittable && (
            <p className="nf-ix-hint">Choose how it went, and the report can be sent.</p>
          )}
          {inspection.state !== "CONFIRMED" && inspection.state !== "COMPLETED" && (
            <p className="nf-ix-hint">The report opens once a time is agreed on both sides.</p>
          )}
          {/* A submitted report takes no more photos, and the agreement needs
              them, so this is said while there is still time to add them. */}
          {editable && photosMissing > 0 && rooms.done === rooms.total && (
            <p className="nf-ix-hint" data-testid="inspection-photos-short">
              Still needed: {countOf(photosMissing, "photos", locale)} taken at the property. Add them, then submit. The
              agreement is drawn up from this report, and photos cannot be added once it is sent.
            </p>
          )}
          {/* TRACK A: the agreement is drawn up from the renter's submitted
              report. While one is live both sides are taken to it. A
              cancelled one no longer holds the inspection
              (`agreement_open_rent_as` releases it, migration
              20260929012543), so the renter may draw up a new one from the
              same report, and both sides are told so. */}
          {agreement?.status === "cancelled" && isRental && reportLive && saved.submittedAt ? (
            <>
              <p className="nf-ix-hint" data-testid="inspection-agreement-cancelled">
                {side === "requester"
                  ? "The agreement drawn up from this report was cancelled. You can draw up a new one from the same report."
                  : "The agreement drawn up from this report was cancelled. The renter can draw up a new one from the same report."}{" "}
                <Link href={`/agreements/${agreement.id}`} className="underline">
                  See the cancelled agreement
                </Link>
              </p>
              {side === "requester" && (
                <DrawUpAgreement
                  inspectionId={inspection.id}
                  minDate={new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" })}
                />
              )}
            </>
          ) : agreement ? (
            <>
              {/* The status sits under the button: `.nf-btn` does not wrap,
                  and the longest status overflows a phone-width button. */}
              <Link
                href={`/agreements/${agreement.id}`}
                className="nf-btn nf-btn--primary nf-btn--md nf-btn--full"
                data-testid="inspection-agreement"
              >
                Open the agreement
              </Link>
              <p className="nf-ix-hint">{AGREEMENT_STATUS_LABEL[agreement.status] ?? agreement.status}</p>
            </>
          ) : isRental && reportLive && saved.submittedAt ? (
            side === "requester" ? (
              <DrawUpAgreement
                inspectionId={inspection.id}
                minDate={new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" })}
              />
            ) : (
              <p className="nf-ix-hint" data-testid="inspection-agreement-waiting">
                The renter draws up the agreement from this report. You will be told when it is waiting for you.
              </p>
            )
          ) : null}
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
    {doneWords && success ? (
      <SuccessSheet
        open
        onOpenChange={(next) => {
          if (!next) setDone(null);
        }}
        variant={doneWords.variant}
        title={doneWords.title}
        body={doneWords.body}
        details={inspection.listingTitle ? [{ label: success.detail.for, value: inspection.listingTitle }] : undefined}
        primary={{ label: success.continue }}
      />
    ) : null}
    </>
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
        <span className="nf-label">When you can do it (Lagos time)</span>
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
        onClick={() => onSubmit(lagosWallClockToIso(when) ?? when, note.trim())}
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
  return (
    <div className="nf-ix nf-ix-hero">
      {back && (
        <BackControl fallback={fallback} className="nf-ix-back" />
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
