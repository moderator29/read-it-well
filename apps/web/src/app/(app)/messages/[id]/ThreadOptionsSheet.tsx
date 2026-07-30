"use client";

import { useEffect, useRef } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { SAFETY_EDUCATION_COPY } from "@/lib/messages/education";

/**
 * In-chat listing options sheet for the thread view.
 *
 * The verification step lives inside the conversation: the sheet shows the
 * listing, carries the canonical safety wording and the one action the
 * platform asks of guests before any money moves, confirming that the
 * property has actually been inspected. Accessible modal: focus moves in on
 * open, Escape and the backdrop close it, the trigger takes focus back
 * (handled by the parent).
 */

export type SheetListing = {
  id: string;
  title: string;
  area: string;
  city: string;
  verified: boolean;
  approved: boolean;
  hue: number;
};

/** Placeholder media hues, matching the listing card treatment. */
const HUES: [string, string][] = [
  ["#1E3A8A", "#172554"],
  ["#155E75", "#0F172A"],
  ["#0C4A6E", "#111827"],
  ["#334155", "#0F172A"],
  ["#1E40AF", "#1E1B4B"],
  ["#312E81", "#0F172A"],
];

export function ThreadOptionsSheet({
  open,
  listing,
  counterpartName,
  inspected,
  confirmedLabel,
  busy,
  note,
  onConfirmInspection,
  onClose,
}: {
  open: boolean;
  listing: SheetListing;
  counterpartName: string;
  inspected: boolean;
  /** The confirmed state line, e.g. "Inspection confirmed." */
  confirmedLabel: string;
  busy: boolean;
  /** An honest status line when a confirmation attempt needs explaining. */
  note: string | null;
  onConfirmInspection: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const [from, to] = HUES[listing.hue % HUES.length] ?? HUES[0]!;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close listing options"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="thread-options-title"
        tabIndex={-1}
        className="nf-rise relative w-full rounded-t-3xl border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-primary)] p-5 shadow-[var(--nf-shadow-float)] outline-none sm:max-w-md sm:rounded-3xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="thread-options-title" className="nf-h3">
              Listing and safety
            </h2>
            <p className="mt-0.5 text-[0.8125rem] text-[var(--nf-content-muted)]">
              Conversation with {counterpartName}
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="nf-icon-btn h-9 w-9">
            <span aria-hidden="true" className="text-[1.05rem] leading-none">
              &times;
            </span>
          </button>
        </div>

        {/* ------------------------------------------------ listing mini view */}
        <div className="nf-card flex items-center gap-3 p-3">
          <div
            aria-hidden="true"
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl"
            style={{ background: `linear-gradient(150deg, ${from} 0%, ${to} 100%)` }}
          >
            <svg
              viewBox="0 0 400 300"
              className="absolute inset-0 h-full w-full opacity-60"
              preserveAspectRatio="none"
            >
              <path
                d="M0 300V190h34v-52h30v52h28v-84h44v84h26v-40h38v40h30v-66h40v66h34v-30h32v30h30v-46h34v46Z"
                fill="rgba(0,0,0,0.42)"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9063rem] font-semibold">{listing.title}</p>
            <p className="mt-0.5 truncate text-[0.75rem] text-[var(--nf-content-muted)]">
              {[listing.area, listing.city].filter(Boolean).join(", ")}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {listing.verified ? (
                <span className="nf-badge nf-badge--success">
                  <UiIcon name="verified" size={12} strokeWidth={2.1} />
                  Verified listing
                </span>
              ) : (
                <span className="nf-badge nf-badge--warning">Verification pending</span>
              )}
              {listing.approved && <span className="nf-badge nf-badge--brand">Approved</span>}
            </div>
          </div>
        </div>

        {/* --------------------------------------------- inspection and safety */}
        <div className="mt-4 flex items-start gap-3">
          <span className="h-12 w-12 shrink-0" aria-hidden="true">
            <BrandIcon name="shield-lock" fill />
          </span>
          <p className="text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {SAFETY_EDUCATION_COPY}
          </p>
        </div>

        {inspected ? (
          <p className="nf-badge nf-badge--success mt-4 w-full justify-center py-2.5 text-[0.8125rem]">
            <UiIcon name="verified" size={14} strokeWidth={2.1} />
            {confirmedLabel}
          </p>
        ) : (
          <button
            type="button"
            onClick={onConfirmInspection}
            disabled={busy}
            className="nf-btn nf-btn--primary mt-4 w-full disabled:opacity-60"
          >
            {busy ? "Confirming" : "Confirm I have inspected this property"}
          </button>
        )}

        {note && (
          <p role="status" className="mt-3 text-center text-[0.8125rem] text-[var(--nf-content-muted)]">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}
