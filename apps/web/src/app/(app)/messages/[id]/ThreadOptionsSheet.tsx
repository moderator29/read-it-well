"use client";

import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { MediaSkyline, mediaGround } from "@/components/app/MediaFrame";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { SAFETY_EDUCATION_COPY } from "@/lib/messages/education";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

/**
 * The conversation's options sheet, behind the kebab in the header.
 *
 * Three things live here and nothing else: the property this chat is about
 * with the one action the platform asks of guests before any money moves
 * (confirming the inspection really happened), the way to share a listing or
 * a booking INTO this chat, and the canonical safety wording. The container
 * mechanics (drag handle, detents, focus trap, focus restoration, Escape,
 * backdrop and body scroll lock) belong to `<Sheet>`.
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

export function ThreadOptionsSheet({
  open,
  conversationId,
  listing,
  counterpartName,
  inspected,
  confirmedLabel,
  busy,
  note,
  canShare,
  onConfirmInspection,
  onClose,
}: {
  open: boolean;
  conversationId: string;
  /** Null on a direct message or a context thread with no listing attached. */
  listing: SheetListing | null;
  counterpartName: string;
  inspected: boolean;
  /** The confirmed state line, e.g. "Inspection confirmed." */
  confirmedLabel: string;
  busy: boolean;
  /** An honest status line when a confirmation attempt needs explaining. */
  note: string | null;
  /** Sharing writes a real message, so it is only offered on a live thread. */
  canShare: boolean;
  onConfirmInspection: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Conversation"
      footer={
        listing ? (
          <>
            {inspected ? (
              <p className="nf-badge nf-badge--success w-full justify-center py-sm text-[var(--nf-text-caption)]">
                <UiIcon name="verified" size={16} />
                {confirmedLabel}
              </p>
            ) : (
              <Button variant="primary" full onClick={onConfirmInspection} loading={busy}>
                Confirm I have inspected this property
              </Button>
            )}
            {note && (
              <p role="status" className="mt-sm text-center text-[var(--nf-text-caption)] text-[var(--nf-content-muted)]">
                {note}
              </p>
            )}
          </>
        ) : undefined
      }
    >
      <div className="-mt-xs mb-md flex items-start justify-between gap-md">
        <p className="text-[var(--nf-text-caption)] text-[var(--nf-content-muted)]">
          Conversation with {counterpartName}
        </p>
        <button type="button" aria-label="Close" onClick={onClose} className="nf-icon-btn h-9 w-9">
          <UiIcon name="close" size={16} />
        </button>
      </div>

      {/* ------------------------------------------------ listing mini view */}
      {listing && (
        <Link href={`/listing/${listing.id}`} className="nf-card nf-card--interactive flex items-center gap-md p-sm">
          <div
            aria-hidden="true"
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl"
            style={{ background: mediaGround(listing.hue) }}
          >
            <MediaSkyline hue={0} className="opacity-60" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[var(--nf-text-body-sm)] font-semibold">{listing.title}</p>
            <p className="mt-3xs truncate text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
              {[listing.area, listing.city].filter(Boolean).join(", ")}
            </p>
            <div className="mt-2xs flex flex-wrap gap-2xs">
              {listing.verified ? (
                <span className="nf-badge nf-badge--success">
                  <UiIcon name="verified" size={12} />
                  Verified listing
                </span>
              ) : (
                <span className="nf-badge nf-badge--warning">Verification pending</span>
              )}
              {listing.approved && <span className="nf-badge nf-badge--brand">Approved</span>}
            </div>
          </div>
          <UiIcon name="chevron-right" size={16} className="shrink-0 text-[var(--nf-content-muted)]" />
        </Link>
      )}

      {/* ------------------------------------------------------- sharing */}
      {canShare && (
        <Link
          href={`/messages/share/into/${conversationId}`}
          className="nf-share-row mt-md"
          data-testid="thread-share-into"
        >
          <span className="h-11 w-11 shrink-0" aria-hidden="true">
            <BrandIcon name="listing-search" fill />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block nf-body font-semibold text-[var(--nf-content-primary)]">
              Share a listing or a booking here
            </span>
            <span className="block nf-caption text-[var(--nf-content-muted)]">
              It arrives as a card {counterpartName} can open.
            </span>
          </span>
          <UiIcon name="chevron-right" size={16} className="shrink-0 text-[var(--nf-content-muted)]" />
        </Link>
      )}

      {/* --------------------------------------------- inspection and safety */}
      <div className="mt-md flex items-start gap-md">
        <span className="h-14 w-14 shrink-0" aria-hidden="true">
          <BrandIcon name="shield-lock" fill />
        </span>
        <p className="text-[var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
          {SAFETY_EDUCATION_COPY}
        </p>
      </div>
    </Sheet>
  );
}
