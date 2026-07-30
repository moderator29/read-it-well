"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney, type Locale } from "@naijafinds/i18n";
import {
  deleteListing,
  submitListing,
  unpublishListing,
} from "@/lib/agent/listings-actions";
import { STATUS_LABEL, STATUS_TONE, type ListingStatus } from "@/lib/agent/listings-schema";
import type { ListingSummary } from "@/lib/agent/listings-queries";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The agent's listings workspace.
 *
 * Cards grouped by where each listing stands, because that is the question an
 * agent actually has: what is earning, what is waiting on us, what is waiting
 * on them. Every state change goes through a confirm sheet and then a router
 * refresh, so the list always re-renders from the database rather than from an
 * optimistic guess. Unmet quality requirements come back from the submit action
 * and are shown in the sheet, in the same words the wizard checklist uses.
 */

type Group = { key: string; title: string; blurb: string; statuses: ListingStatus[] };

const GROUPS: Group[] = [
  {
    key: "live",
    title: "Live",
    blurb: "Guests can find these in search.",
    statuses: ["PUBLISHED", "APPROVED"],
  },
  {
    key: "review",
    title: "With our review team",
    blurb: "We check every listing by hand. This takes 24 to 48 hours.",
    statuses: ["SUBMITTED", "UNDER_REVIEW"],
  },
  {
    key: "attention",
    title: "Needs your attention",
    blurb: "A change is needed before this can go live.",
    statuses: ["MORE_INFO_REQUIRED", "REJECTED", "SUSPENDED"],
  },
  {
    key: "drafts",
    title: "Drafts",
    blurb: "Only you can see these.",
    statuses: ["DRAFT"],
  },
];

const EDITABLE: ListingStatus[] = ["DRAFT", "MORE_INFO_REQUIRED", "REJECTED"];

function toneStyle(status: ListingStatus): React.CSSProperties {
  switch (STATUS_TONE[status]) {
    case "success":
      return { background: "var(--nf-state-success-surface)", color: "var(--nf-state-success)" };
    case "warning":
      return { background: "var(--nf-state-warning-surface)", color: "var(--nf-state-warning)" };
    case "error":
      return { background: "var(--nf-state-error-surface)", color: "var(--nf-state-error)" };
    case "brand":
      return { background: "var(--nf-state-info-surface)", color: "var(--nf-state-info)" };
    default:
      return { background: "var(--nf-surface-raised)", color: "var(--nf-content-secondary)" };
  }
}

type SheetKind = "submit" | "unpublish" | "delete";

type SheetState = { kind: SheetKind; listing: ListingSummary };

const SHEET_COPY: Record<SheetKind, { title: string; body: string; confirm: string }> = {
  submit: {
    title: "Send this listing for review?",
    body: "Our team checks the photos, the description and the location. You hear back within 24 to 48 hours, either way.",
    confirm: "Send for review",
  },
  unpublish: {
    title: "Take this listing down?",
    body: "It leaves search straight away and returns to your drafts. You can edit it and send it back for review whenever you are ready.",
    confirm: "Take it down",
  },
  delete: {
    title: "Delete this draft?",
    body: "The draft and its photos are removed for good. This cannot be undone.",
    confirm: "Delete draft",
  },
};

function ConfirmSheet({
  state,
  onClose,
}: {
  state: SheetState;
  onClose: () => void;
}) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [unmet, setUnmet] = useState<string[]>([]);
  const copy = SHEET_COPY[state.kind];

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

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
        setUnmet(Object.values(result.fieldErrors ?? {}));
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={copy.title}
        className="nf-card relative w-full max-w-md p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] outline-none sm:pb-5"
      >
        <h2 className="nf-h3">{copy.title}</h2>
        <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
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

        <div className="mt-5 flex gap-3">
          <button type="button" className="nf-btn nf-btn--glass flex-1" onClick={onClose}>
            Keep it
          </button>
          <button
            type="button"
            className="nf-btn nf-btn--primary flex-1"
            onClick={run}
            disabled={pending}
          >
            {pending ? "Working" : copy.confirm}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ListingRow({
  listing,
  locale,
  onAction,
}: {
  listing: ListingSummary;
  locale: Locale;
  onAction: (kind: SheetKind, listing: ListingSummary) => void;
}) {
  const editable = EDITABLE.includes(listing.status);
  const live = listing.status === "PUBLISHED" || listing.status === "APPROVED";

  return (
    <li className="nf-card overflow-hidden p-0">
      <div className="flex gap-3.5 p-3.5">
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
              <UiIcon name="grid" size={22} />
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[0.9375rem] font-semibold">{listing.title}</h3>
            <span className="nf-badge shrink-0" style={toneStyle(listing.status)}>
              {STATUS_LABEL[listing.status]}
            </span>
          </div>

          {(listing.area || listing.city) && (
            <p className="mt-1 flex items-center gap-1.5 text-[0.78rem] text-[var(--nf-content-muted)]">
              <UiIcon name="location" size={13} className="shrink-0" />
              <span className="truncate">
                {[listing.area, listing.city].filter(Boolean).join(", ")}
              </span>
            </p>
          )}

          <p className="mt-2 flex items-baseline gap-1.5">
            <span className="nf-numeric text-[0.9375rem] font-bold">
              {listing.priceMinor > 0 ? formatMoney(listing.priceMinor, locale) : "Price to set"}
            </span>
            <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
              {listing.pricePeriod === "year" ? "per year" : "per night"}
            </span>
          </p>

          <p className="mt-1 text-[0.75rem] text-[var(--nf-content-muted)]">
            {listing.photoCount} {listing.photoCount === 1 ? "photo" : "photos"}
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
            Edit
            <UiIcon name="arrow-right" size={14} />
          </Link>
        )}
        {editable && (
          <button
            type="button"
            className="text-[0.8125rem] font-semibold text-[var(--nf-content-secondary)]"
            onClick={() => onAction("submit", listing)}
          >
            Send for review
          </button>
        )}
        {live && (
          <button
            type="button"
            className="text-[0.8125rem] font-semibold text-[var(--nf-content-secondary)]"
            onClick={() => onAction("unpublish", listing)}
          >
            Take it down
          </button>
        )}
        {listing.status === "DRAFT" && (
          <button
            type="button"
            className="text-[0.8125rem] font-semibold text-[var(--nf-content-muted)]"
            onClick={() => onAction("delete", listing)}
          >
            Delete
          </button>
        )}
      </div>
    </li>
  );
}

export function ListingsWorkspace({
  listings,
  locale,
}: {
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
          <UiIcon name="house" size={30} />
        </span>
        <h2 className="nf-h3 mt-5">No listings yet</h2>
        <p className="mx-auto mt-2 max-w-[38ch] text-[0.875rem] text-[var(--nf-content-secondary)]">
          Your first property takes about ten minutes, most of it photos. Start whenever you are
          ready: drafts are saved as you go.
        </p>
        <Link href="/agent/list" className="nf-btn nf-btn--primary mt-6">
          Start a listing
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {GROUPS.map((group) => {
        const rows = listings.filter((l) => group.statuses.includes(l.status));
        if (rows.length === 0) return null;
        return (
          <section key={group.key}>
            <h2 className="nf-h3">
              {group.title}
              <span className="nf-numeric ml-2 text-[0.8125rem] font-semibold text-[var(--nf-content-muted)]">
                {rows.length}
              </span>
            </h2>
            <p className="mb-3 mt-1 text-[0.75rem] text-[var(--nf-content-muted)]">{group.blurb}</p>
            <ul className="space-y-3">
              {rows.map((listing) => (
                <ListingRow
                  key={listing.id}
                  listing={listing}
                  locale={locale}
                  onAction={(kind, target) => setSheet({ kind, listing: target })}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {sheet && <ConfirmSheet state={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
