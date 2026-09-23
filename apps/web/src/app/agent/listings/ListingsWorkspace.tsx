"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type Dictionary, type Locale, formatMoneyGlance } from "@vallo/i18n";
import { fill } from "../_copy";
import {
  deleteListing,
  submitListing,
  unpublishListing,
} from "@/lib/agent/listings-actions";
import {
  MIN_DESCRIPTION_WORDS,
  MIN_PHOTOS,
  MIN_TITLE_LENGTH,
  type ListingStatus,
} from "@/lib/agent/listings-schema";
import type { ListingSummary } from "@/lib/agent/listings-queries";
import { createUndoWindow, type UndoWindow } from "@/lib/ui/undo-window";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";

/**
 * The agent's listings workspace.
 *
 * Cards grouped by where each listing stands, because that is the question an
 * agent actually has: what is earning, what is waiting on us, what is waiting
 * on them. Sending for review and taking a listing down go through a confirm
 * sheet and then a router refresh, so the list always re-renders from the
 * database rather than from an optimistic guess. Unmet quality requirements
 * come back from the submit action and are shown in the sheet, in the same
 * words the wizard checklist uses.
 *
 * DELETING A DRAFT OPENS NOTHING (inbox item 26). It used to raise the same
 * confirm sheet, which asks the question in the wrong direction: a dialogue
 * defends against the tap somebody meant to make, and the tap that needs
 * defending against is the one they did not. The row leaves immediately, its
 * slot offers the way back for six seconds, and NOTHING REACHES THE SERVER
 * until that offer runs out. Which matters here more than it does on a
 * shortlist: the action deletes the row and its photos out of storage, so
 * there is nothing to put back afterwards. The undo has to come first or it
 * cannot exist.
 *
 * Leaving the screen inside the window commits the delete rather than
 * cancelling it, because the agent asked for it and walking away is not a
 * change of mind. Closing the tab outright is the one case that will not
 * land, and the draft simply survives.
 *
 * All copy arrives from the page as a dictionary slice, so the workspace reads
 * in the agent's language, including the status vocabulary.
 */

/**
 * How long the way back stands. Six seconds is long enough to notice the row
 * has gone and reach the control, short enough that nobody wonders whether the
 * delete happened.
 */
const UNDO_WINDOW_MS = 6000;

export type WorkspaceCopy = Dictionary["agentListings"];

type Group = {
  key: keyof WorkspaceCopy["workspace"]["groups"];
  statuses: ListingStatus[];
};

const GROUPS: Group[] = [
  { key: "live", statuses: ["PUBLISHED", "APPROVED"] },
  { key: "review", statuses: ["SUBMITTED", "UNDER_REVIEW"] },
  { key: "attention", statuses: ["MORE_INFO_REQUIRED", "REJECTED", "SUSPENDED"] },
  { key: "drafts", statuses: ["DRAFT"] },
];

const EDITABLE: ListingStatus[] = ["DRAFT", "MORE_INFO_REQUIRED", "REJECTED"];

type SheetKind = "submit" | "unpublish";

type SheetState = { kind: SheetKind; listing: ListingSummary };

/**
 * The submit gate's requirements, in the agent's language.
 *
 * The action returns which fields are unmet, keyed by field name. The counts it
 * carried are dropped on purpose: the requirement itself is what an agent needs
 * here, and the wizard shows the live tally. A field this map does not know
 * falls back to the message the action sent, so nothing is ever blank.
 */
function requirementText(
  copy: WorkspaceCopy,
  field: string,
  fallback: string,
  yearly: boolean,
): string {
  switch (field) {
    case "title":
      return fill(copy.gate.titleShort, { min: MIN_TITLE_LENGTH });
    case "description":
      return fill(copy.submit.checklist.description, { min: MIN_DESCRIPTION_WORDS });
    case "propertyType":
      return copy.gate.propertyType;
    case "photos":
      return fill(copy.submit.checklist.photos, { min: MIN_PHOTOS });
    case "stateCode":
      return copy.gate.stateCode;
    case "city":
      return copy.gate.city;
    case "area":
      return copy.gate.area;
    case "amenities":
      return copy.gate.amenities;
    case "price":
      return yearly ? copy.gate.priceYear : copy.gate.priceNight;
    case "bedrooms":
      return copy.gate.bedrooms;
    case "bathrooms":
      return copy.gate.bathrooms;
    case "maxGuests":
      return copy.gate.maxGuests;
    default:
      return fallback;
  }
}

function ConfirmSheet({
  t,
  state,
  onClose,
}: {
  t: WorkspaceCopy;
  state: SheetState;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [unmet, setUnmet] = useState<string[]>([]);
  const copy = t.workspace.sheets[state.kind];

  function run() {
    setError(null);
    setUnmet([]);
    startTransition(async () => {
      const input = { listingId: state.listing.id };
      const result =
        state.kind === "submit" ? await submitListing(input) : await unpublishListing(input);

      if (!result.ok) {
        setError(result.error);
        setUnmet(
          Object.entries(result.fieldErrors ?? {}).map(([field, message]) =>
            requirementText(t, field, message, state.listing.pricePeriod === "year"),
          ),
        );
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={copy.title}
      footer={
        <div className="flex gap-md">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            {t.workspace.sheets.keep}
          </Button>
          {/*
            Deleting a listing and taking a live one down are destructive, and
            both used to confirm behind the same blue primary as submitting for
            review. Quiet danger rather than solid: this is the confirm step
            inside a sheet, where the sheet has already made the consequence
            plain and a solid red would shout louder than the decision needs.
          */}
          <Button
            variant={state.kind === "submit" ? "primary" : "dangerQuiet"}
            className="flex-1"
            onClick={run}
            loading={pending}
          >
            {copy.confirm}
          </Button>
        </div>
      }
    >
      <p className="text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
        {copy.body}
      </p>
      <p className="mt-sm truncate text-[length:var(--nf-text-caption)] font-semibold">{state.listing.title}</p>

      {error && (
        <p
          className="mt-sm rounded-[var(--nf-container-radius)] p-sm text-[length:var(--nf-text-caption)] font-medium"
          style={{
            background: "var(--nf-state-warning-surface)",
            color: "var(--nf-state-warning)",
          }}
          role="alert"
        >
          {error}
        </p>
      )}
      {unmet.length > 0 && (
        <ul className="mt-xs space-y-xs">
          {unmet.map((message) => (
            <li
              key={message}
              className="flex items-start gap-xs text-[length:var(--nf-text-overline)] text-[var(--nf-content-secondary)]"
            >
              <span className="mt-2xs h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nf-state-warning)]" />
              {message}
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

/**
 * The slot a deleted draft leaves behind.
 *
 * It holds the row's own height so the list does not jump under a thumb, says
 * what happened in the past tense because from the agent's side it has, and
 * carries the way back. The bar underneath is the clock: without it nobody can
 * tell whether the offer stands for one more second or ten.
 */
function UndoStrip({
  t,
  title,
  onUndo,
}: {
  t: WorkspaceCopy;
  title: string;
  onUndo: () => void;
}) {
  const button = useRef<HTMLButtonElement>(null);

  /* The row that held focus has just been removed from the document, so focus
     would otherwise fall to the body and a keyboard user would lose both the
     place in the list and the only chance to take it back. */
  useEffect(() => {
    button.current?.focus();
  }, []);

  return (
    <li className="nf-panel nf-panel--card block overflow-hidden p-0" data-testid="draft-undo">
      <div className="flex items-center justify-between gap-md p-md" role="status">
        <span className="min-w-0 leading-tight">
          <span className="block text-[length:var(--nf-text-body-sm)] font-semibold">{t.workspace.undo.removed}</span>
          <span className="block truncate text-[length:var(--nf-text-caption)] text-[var(--nf-content-muted)]">
            {title}
          </span>
        </span>
        <Button
          ref={button}
          variant="secondary"
          size="sm"
          onClick={onUndo}
          data-testid="draft-undo-action"
        >
          <UiIcon name="arrow-left" size={16} />
          {t.workspace.undo.action}
        </Button>
      </div>
      <span
        aria-hidden="true"
        className="nf-undo-drain block h-0.5 bg-[var(--nf-brand-primary)]"
        style={{ ["--nf-undo-window" as string]: `${UNDO_WINDOW_MS}ms` }}
      />
    </li>
  );
}

function ListingRow({
  t,
  reference,
  listing,
  locale,
  error,
  onAction,
  onDelete,
}: {
  t: WorkspaceCopy;
  /* The listing code's own namespace, shared with the search page and the
     public listing page so one set of words governs the code everywhere. */
  reference: Dictionary["listingReference"];
  listing: ListingSummary;
  locale: Locale;
  /** A delete the server refused. The row is back and this says why. */
  error?: string | undefined;
  onAction: (kind: SheetKind, listing: ListingSummary) => void;
  onDelete: (listing: ListingSummary) => void;
}) {
  const editable = EDITABLE.includes(listing.status);
  const live = listing.status === "PUBLISHED" || listing.status === "APPROVED";

  return (
    <li className="nf-panel nf-panel--card block overflow-hidden p-0">
      <div className="flex gap-4.5 p-md">
        <span
          className="relative block h-[5.25rem] w-[5.25rem] shrink-0 overflow-hidden rounded-[var(--nf-radius-md)]"
          style={{ background: "var(--nf-surface-raised)" }}
        >
          {listing.coverUrl ? (
            /* THE COMMENT THAT USED TO BE HERE WAS OUT OF DATE, and it was
               costing real bandwidth. It said the storage bucket's public URL
               is "outside the image optimiser's allowed hosts"; the Supabase
               host has been derived into `next.config.ts`'s `remotePatterns`
               since, so a public object IS allowed and this thumbnail was
               shipping a full size upload into an 84px square. */
            <RemoteImage
              src={listing.coverUrl}
              alt=""
              width={84}
              height={84}
              sizes="84px"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="grid h-full w-full place-items-center text-[var(--nf-content-muted)]">
              <UiIcon name="grid" size={24} />
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1 leading-tight">
          {/*
            THE TITLE IS THE ROW, SO IT IS NEVER TRUNCATED TO MAKE ROOM FOR A
            PILL. It was `truncate` beside a `shrink-0` StatusPill, and at
            390px "More information needed" left three characters of the
            property's name: a workspace listing four properties showed
            "Fo...", "Mo..." and "Lu...". The pill takes its own line on a
            phone and comes back beside the title where there is room, and
            the title wraps to two lines rather than losing its words.
          */}
          <div className="flex flex-col items-start gap-2xs sm:flex-row sm:items-start sm:justify-between sm:gap-xs">
            <h3 className="line-clamp-2 min-w-0 text-[length:var(--nf-text-body-sm)] font-semibold">
              {listing.title}
            </h3>
            <StatusPill tone={toneForStatus(listing.status)} className="shrink-0">
              {t.workspace.status[listing.status]}
            </StatusPill>
          </div>

          {(listing.area || listing.city) && (
            <p className="mt-2xs flex items-center gap-xs text-[length:var(--nf-text-caption)] text-[var(--nf-content-muted)]">
              <UiIcon name="location" size={12} className="shrink-0" />
              <span className="truncate">
                {[listing.area, listing.city].filter(Boolean).join(", ")}
              </span>
            </p>
          )}

          <p className="mt-xs flex items-baseline gap-xs">
            <span className="nf-numeric text-[length:var(--nf-text-body-sm)] font-bold">
              {listing.priceMinor > 0
                ? formatMoneyGlance(listing.priceMinor, locale)
                : t.guestView.priceToSet}
            </span>
            {/*
              SIX PERIODS, NOT TWO. This was a ternary on "year", so a monthly
              rent read "per night", a quarterly one read "per night", and a
              ₦24,000,000 ASKING PRICE on a house for sale read "per night" on
              the agent's own workspace. `PERIOD_SUFFIX` in lib/listings has
              carried all six for a while; the words are now in the dictionary
              too, so the row says the right one in four languages.
            */}
            <span className="text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
              {t.pricing.period[listing.pricePeriod]}
            </span>
          </p>

          <p className="mt-2xs text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
            {listing.photoCount === 1
              ? t.workspace.photoCountOne
              : fill(t.workspace.photoCount, { count: listing.photoCount })}
          </p>

          {/* THE CODE, ON THE ROW, the moment the listing has one. This is
              where a lister will be standing when somebody asks them for it
              over the phone. A listing in review has none, because the
              database issues it at publish, and an absent code draws nothing
              rather than an empty field. */}
          {listing.reference && (
            <p className="mt-2xs text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
              {reference.label}{" "}
              <span className="nf-numeric tracking-[0.08em] text-[var(--nf-content-secondary)]">
                {listing.reference}
              </span>
            </p>
          )}
        </div>
      </div>

      {listing.reviewNotes && (
        <p className="border-t border-[var(--nf-border-subtle)] px-md py-sm text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-secondary)]">
          {listing.reviewNotes}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-md gap-y-xs border-t border-[var(--nf-border-subtle)] px-md py-sm">
        {editable && (
          <Link
            href={`/agent/list?id=${listing.id}`}
            className="flex items-center gap-2xs text-[length:var(--nf-text-caption)] font-semibold text-[var(--nf-content-link)]"
          >
            {t.workspace.actions.edit}
            <UiIcon name="arrow-right" size={16} />
          </Link>
        )}
        {/* Closing nights only means anything once a listing is live, so the
            calendar appears exactly where a guest could otherwise book. */}
        <Link
          href={`/agent/listings/${listing.id}/calendar`}
          className="flex items-center gap-2xs text-[length:var(--nf-text-caption)] font-semibold text-[var(--nf-content-secondary)]"
        >
          <UiIcon name="calendar-booking" size={16} />
          Calendar
        </Link>
        {editable && (
          <button
            type="button"
            className="text-[length:var(--nf-text-caption)] font-semibold text-[var(--nf-content-secondary)]"
            onClick={() => onAction("submit", listing)}
          >
            {t.workspace.actions.submit}
          </button>
        )}
        {live && (
          <button
            type="button"
            className="text-[length:var(--nf-text-caption)] font-semibold text-[var(--nf-content-secondary)]"
            onClick={() => onAction("unpublish", listing)}
          >
            {t.workspace.actions.takeDown}
          </button>
        )}
        {/*
          Delete was the lowest-contrast element in this row - muted grey text,
          quieter than every reversible action beside it, on the one action
          that cannot be undone. It is a real danger control now. Quiet rather
          than solid, because a solid red pill among four text links would make
          deletion the loudest thing on the card; the point is that it should
          be legible as destructive, not that it should be shouted.

          It no longer opens anything. The row leaves and offers its way back.
        */}
        {listing.status === "DRAFT" && (
          <Button variant="dangerQuiet" size="sm" onClick={() => onDelete(listing)}>
            {t.workspace.actions.delete}
          </Button>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="border-t border-[var(--nf-border-subtle)] px-md py-sm text-[length:var(--nf-text-overline)] text-[var(--nf-state-error)]"
        >
          {error}
        </p>
      )}
    </li>
  );
}

export function ListingsWorkspace({
  t,
  reference,
  listings: all,
  locale,
  query = "",
}: {
  t: WorkspaceCopy;
  reference: Dictionary["listingReference"];
  listings: ListingSummary[];
  locale: Locale;
  /** The top bar's search term. Narrows by title; empty shows everything. */
  query?: string;
}) {
  /* The bar's search lands here with `?q=`, so it is a real narrowing and
     not a field that does nothing. */
  const term = query.trim().toLowerCase();
  const listings = term ? all.filter((row) => row.title.toLowerCase().includes(term)) : all;
  const [sheet, setSheet] = useState<SheetState | null>(null);

  /* Drafts whose delete is scheduled but has not been sent, and the failure a
     rejected delete came back with. A row in `pending` is off the screen and
     still in the database. */
  const [pending, setPending] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  /*
   * The timing lives in `createUndoWindow`, which owns one rule this component
   * must not get wrong: one delete per draft, ever, whichever of the three
   * paths reaches it first. Held in a ref, and built once, because the unmount
   * cleanup has to flush the CURRENT set rather than whatever was outstanding
   * when an effect last ran.
   */
  const send = useCallback(
    (id: string) => {
      void deleteListing({ listingId: id }).then((result) => {
        if (!result.ok) {
          /* Nothing was deleted, so the row comes back where it was and says
             why. This is the only path that puts a listing back on screen
             without the agent asking. */
          setPending((prev) => prev.filter((p) => p !== id));
          setErrors((prev) => ({ ...prev, [id]: result.error }));
          return;
        }
        router.refresh();
      });
    },
    [router],
  );

  /* The window is built once and outlives every render, so the indirection
     through a ref is what lets it call the current `send` rather than the one
     that existed when the first draft was deleted. */
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  const undoWindow = useRef<UndoWindow | null>(null);
  undoWindow.current ??= createUndoWindow({
    windowMs: UNDO_WINDOW_MS,
    onCommit: (id) => sendRef.current(id),
  });

  const scheduleDelete = useCallback((listing: ListingSummary) => {
    setErrors((prev) => {
      if (!(listing.id in prev)) return prev;
      const next = { ...prev };
      delete next[listing.id];
      return next;
    });
    setPending((prev) => (prev.includes(listing.id) ? prev : [...prev, listing.id]));
    undoWindow.current?.schedule(listing.id);
  }, []);

  const undoDelete = useCallback((id: string) => {
    undoWindow.current?.cancel(id);
    setPending((prev) => prev.filter((p) => p !== id));
  }, []);

  /* Leaving the screen commits what was scheduled. The agent asked for the
     delete; navigating away is not a change of mind, and a draft that quietly
     survived because somebody tapped Bookings would be the worse surprise. */
  useEffect(() => {
    const scheduled = undoWindow.current;
    return () => scheduled?.flush();
  }, []);

  if (listings.length === 0) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <span
          className="nf-plate nf-plate--brand nf-plate--lg mx-auto"
        >
          <UiIcon name="house" size={24} />
        </span>
        <h2 className="nf-h3 mt-5">{t.workspace.emptyTitle}</h2>
        <p className="mx-auto mt-xs max-w-[38ch] text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-secondary)]">
          {t.workspace.emptyBody}
        </p>
        <ButtonLink href="/agent/list" variant="primary" className="mt-lg">
          {t.workspace.start}
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {GROUPS.map((group) => {
        const rows = listings.filter((l) => group.statuses.includes(l.status));
        if (rows.length === 0) return null;
        const heading = t.workspace.groups[group.key];
        /* A draft on its way out is not in the group any more, as far as the
           agent is concerned, so the count says what the list shows. */
        const count = rows.filter((l) => !pending.includes(l.id)).length;
        return (
          <section key={group.key}>
            <span className="flex items-center gap-xs">
              <h2 className="nf-h3">{heading.title}</h2>
              <span className="nf-count-badge">{count}</span>
            </span>
            <p className="mb-sm mt-2xs text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
              {heading.blurb}
            </p>
            <ul className="space-y-sm">
              {rows.map((listing) =>
                pending.includes(listing.id) ? (
                  <UndoStrip
                    key={listing.id}
                    t={t}
                    title={listing.title}
                    onUndo={() => undoDelete(listing.id)}
                  />
                ) : (
                  <ListingRow
                    key={listing.id}
                    t={t}
                    reference={reference}
                    listing={listing}
                    locale={locale}
                    error={errors[listing.id]}
                    onAction={(kind, target) => setSheet({ kind, listing: target })}
                    onDelete={scheduleDelete}
                  />
                ),
              )}
            </ul>
          </section>
        );
      })}

      {sheet && <ConfirmSheet t={t} state={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
