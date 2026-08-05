"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type Dictionary, type Locale, formatMoneyGlance } from "@naijafinds/i18n";
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
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";

/**
 * The agent's listings workspace.
 *
 * Cards grouped by where each listing stands, because that is the question an
 * agent actually has: what is earning, what is waiting on us, what is waiting
 * on them. Every state change goes through a confirm sheet and then a router
 * refresh, so the list always re-renders from the database rather than from an
 * optimistic guess. Unmet quality requirements come back from the submit action
 * and are shown in the sheet, in the same words the wizard checklist uses.
 *
 * All copy arrives from the page as a dictionary slice, so the workspace reads
 * in the agent's language, including the status vocabulary.
 */

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

type SheetKind = "submit" | "unpublish" | "delete";

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
        state.kind === "submit"
          ? await submitListing(input)
          : state.kind === "unpublish"
            ? await unpublishListing(input)
            : await deleteListing(input);

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
        <div className="flex gap-4">
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
      <p className="text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
        {copy.body}
      </p>
      <p className="mt-3 truncate text-[0.8125rem] font-semibold">{state.listing.title}</p>

      {error && (
        <p
          className="mt-3 rounded-[var(--nf-radius-md)] p-3 text-[0.8125rem] font-medium"
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
        <ul className="mt-2 space-y-1.5">
          {unmet.map((message) => (
            <li
              key={message}
              className="flex items-start gap-2 text-[0.75rem] text-[var(--nf-content-secondary)]"
            >
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nf-state-warning)]" />
              {message}
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

function ListingRow({
  t,
  listing,
  locale,
  onAction,
}: {
  t: WorkspaceCopy;
  listing: ListingSummary;
  locale: Locale;
  onAction: (kind: SheetKind, listing: ListingSummary) => void;
}) {
  const editable = EDITABLE.includes(listing.status);
  const live = listing.status === "PUBLISHED" || listing.status === "APPROVED";

  return (
    <li className="nf-card overflow-hidden p-0">
      <div className="flex gap-4.5 p-3.5">
        <span
          className="relative block h-[5.25rem] w-[5.25rem] shrink-0 overflow-hidden rounded-[var(--nf-radius-md)]"
          style={{ background: "var(--nf-surface-raised)" }}
        >
          {listing.coverUrl ? (
            // Storage serves the bucket's public URL directly, outside the
            // image optimiser's allowed hosts.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-[var(--nf-content-muted)]">
              <UiIcon name="grid" size={24} />
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[0.9375rem] font-semibold">{listing.title}</h3>
            <StatusPill tone={toneForStatus(listing.status)} className="shrink-0">
              {t.workspace.status[listing.status]}
            </StatusPill>
          </div>

          {(listing.area || listing.city) && (
            <p className="mt-1 flex items-center gap-1.5 text-[0.78rem] text-[var(--nf-content-muted)]">
              <UiIcon name="location" size={12} className="shrink-0" />
              <span className="truncate">
                {[listing.area, listing.city].filter(Boolean).join(", ")}
              </span>
            </p>
          )}

          <p className="mt-2 flex items-baseline gap-1.5">
            <span className="nf-numeric text-[0.9375rem] font-bold">
              {listing.priceMinor > 0
                ? formatMoneyGlance(listing.priceMinor, locale)
                : t.guestView.priceToSet}
            </span>
            <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
              {listing.pricePeriod === "year" ? t.pricing.perYear : t.pricing.perNight}
            </span>
          </p>

          <p className="mt-1 text-[0.75rem] text-[var(--nf-content-muted)]">
            {listing.photoCount === 1
              ? t.workspace.photoCountOne
              : fill(t.workspace.photoCount, { count: listing.photoCount })}
          </p>
        </div>
      </div>

      {listing.reviewNotes && (
        <p className="border-t border-[var(--nf-border-subtle)] px-3.5 py-2.5 text-[0.75rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {listing.reviewNotes}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--nf-border-subtle)] px-3.5 py-3">
        {editable && (
          <Link
            href={`/agent/list?id=${listing.id}`}
            className="flex items-center gap-1 text-[0.8125rem] font-semibold text-[var(--nf-electric-300)]"
          >
            {t.workspace.actions.edit}
            <UiIcon name="arrow-right" size={16} />
          </Link>
        )}
        {/* Closing nights only means anything once a listing is live, so the
            calendar appears exactly where a guest could otherwise book. */}
        <Link
          href={`/agent/listings/${listing.id}/calendar`}
          className="flex items-center gap-1 text-[0.8125rem] font-semibold text-[var(--nf-content-secondary)]"
        >
          <UiIcon name="calendar-booking" size={16} />
          Calendar
        </Link>
        {editable && (
          <button
            type="button"
            className="text-[0.8125rem] font-semibold text-[var(--nf-content-secondary)]"
            onClick={() => onAction("submit", listing)}
          >
            {t.workspace.actions.submit}
          </button>
        )}
        {live && (
          <button
            type="button"
            className="text-[0.8125rem] font-semibold text-[var(--nf-content-secondary)]"
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
        */}
        {listing.status === "DRAFT" && (
          <Button
            variant="dangerQuiet"
            size="sm"
            onClick={() => onAction("delete", listing)}
          >
            {t.workspace.actions.delete}
          </Button>
        )}
      </div>
    </li>
  );
}

export function ListingsWorkspace({
  t,
  listings,
  locale,
}: {
  t: WorkspaceCopy;
  listings: ListingSummary[];
  locale: Locale;
}) {
  const [sheet, setSheet] = useState<SheetState | null>(null);

  if (listings.length === 0) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <span
          className="mx-auto grid h-16 w-16 place-items-center rounded-[var(--nf-radius-lg)]"
          style={{ background: "var(--nf-surface-raised)", color: "var(--nf-electric-300)" }}
        >
          <UiIcon name="house" size={32} />
        </span>
        <h2 className="nf-h3 mt-5">{t.workspace.emptyTitle}</h2>
        <p className="mx-auto mt-2 max-w-[38ch] text-[0.875rem] text-[var(--nf-content-secondary)]">
          {t.workspace.emptyBody}
        </p>
        <ButtonLink href="/agent/list" variant="primary" className="mt-6">
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
        return (
          <section key={group.key}>
            <span className="flex items-center gap-2">
              <h2 className="nf-h3">{heading.title}</h2>
              <span className="nf-count-badge">{rows.length}</span>
            </span>
            <p className="mb-3 mt-1 text-[0.75rem] text-[var(--nf-content-muted)]">
              {heading.blurb}
            </p>
            <ul className="space-y-3">
              {rows.map((listing) => (
                <ListingRow
                  key={listing.id}
                  t={t}
                  listing={listing}
                  locale={locale}
                  onAction={(kind, target) => setSheet({ kind, listing: target })}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {sheet && <ConfirmSheet t={t} state={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
