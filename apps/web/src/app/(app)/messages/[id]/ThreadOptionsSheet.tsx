"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ReportSheet } from "@/components/app/ReportSheet";
import { blockUserSafely } from "@/lib/safety/blocks-actions";
import { BLOCK_CONFIRM_COPY } from "@/lib/safety/blocks-copy";
import { MediaSkyline, mediaGround } from "@/components/app/MediaFrame";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { SAFETY_EDUCATION_COPY } from "@/lib/messages/education";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

/**
 * The conversation's options sheet, behind the kebab in the header.
 *
 * FIVE things live here. The property this chat is about with the one action
 * the platform asks of guests before any money moves (confirming the
 * inspection really happened), the way to share a listing or a booking INTO
 * this chat, the canonical safety wording, and then the two that were missing
 * and that this sheet is the only possible home for: REPORT THIS CONVERSATION
 * and BLOCK THE OTHER PERSON. The container mechanics (drag handle, detents,
 * focus trap, focus restoration, Escape, backdrop and body scroll lock)
 * belong to `<Sheet>`.
 *
 * WHY THE TWO SAFETY ROWS ARE HERE AND NOT ON THE SOCIAL PROFILE ONLY.
 *
 * `public.blocks` has enforced a block in both directions since the social
 * safety migration, and `lib/messages/blocks.ts` honours it inside messaging,
 * so the wall was already built. The only surface that could CREATE a block
 * was the social profile menu. A person being harassed in a listing
 * conversation, which on a property marketplace is where it actually happens,
 * had a wall with no door to it: they would have to leave the thread, find
 * the other person's social profile, and hope one existed. That is a safety
 * hole on its own terms, and it is also the exact pair of controls Apple
 * guideline 1.2 and Play's user generated content policy ask for on direct
 * messaging.
 *
 * Blocking is destructive to a live conversation, so it asks first, in the
 * sheet, with the consequence written out rather than summarised. The copy is
 * `BLOCK_CONFIRM_COPY` and it lives beside the action so the two cannot drift.
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
  counterpartId,
  signedIn,
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
  /**
   * The other party's id. Null on the seeded local thread, which has no real
   * counterpart to block, so the two safety rows are simply not drawn there
   * rather than drawn and broken.
   */
  counterpartId: string | null;
  /** Reporting belongs to somebody; the sheet says so rather than hiding. */
  signedIn: boolean;
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
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [blockNote, setBlockNote] = useState<string | null>(null);
  const [blocking, startBlocking] = useTransition();

  /* Every close resets the block confirmation, so reopening the sheet never
     lands somebody straight back on a destructive question they backed out
     of a moment ago. */
  function closeEverything() {
    setConfirmingBlock(false);
    setBlockNote(null);
    onClose();
  }

  function doBlock() {
    if (!counterpartId) return;
    startBlocking(async () => {
      const result = await blockUserSafely({ userId: counterpartId });
      if (!result.ok) {
        setBlockNote(result.error);
        return;
      }
      /* The thread is gone for both of them now, so the sheet does not stay
         open over a conversation that no longer exists. */
      setConfirmingBlock(false);
      closeEverything();
      window.location.assign("/messages");
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) closeEverything();
      }}
      title="Conversation"
      /* The sheet's own header row: the title and a 44px glass Close on one
         line. The Close used to sit in a second row drawn inside the body with
         a negative top margin, so the scrolling body clipped the top of it and
         of the line beside it, and it was 36px (the second audit's S-C). */
      closeLabel="Close"
      footer={
        listing ? (
          <>
            {inspected ? (
              <p className="nf-badge nf-badge--success w-full justify-center py-sm text-[length:var(--nf-text-caption)]">
                <UiIcon name="verified" size={16} />
                {confirmedLabel}
              </p>
            ) : (
              <Button variant="primary" full onClick={onConfirmInspection} loading={busy}>
                Confirm I have inspected this property
              </Button>
            )}
            {note && (
              <p role="status" className="mt-sm text-center text-[length:var(--nf-text-caption)] text-[var(--nf-content-muted)]">
                {note}
              </p>
            )}
          </>
        ) : undefined
      }
    >
      <p className="mb-md text-[length:var(--nf-text-caption)] text-[var(--nf-content-muted)]">
        Conversation with {counterpartName}
      </p>

      {/* ------------------------------------------------ listing mini view */}
      {listing && (
        <Link href={`/listing/${listing.id}`} className="nf-panel nf-panel--card flex-row items-center gap-md p-sm">
          <div
            aria-hidden="true"
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl"
            style={{ background: mediaGround(listing.hue) }}
          >
            <MediaSkyline hue={0} className="opacity-60" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[length:var(--nf-text-body-sm)] font-semibold">{listing.title}</p>
            <p className="mt-3xs truncate text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
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
        <p className="text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
          {SAFETY_EDUCATION_COPY}
        </p>
      </div>

      {/* ------------------------------------------- report, and then block */}
      {counterpartId && (
        <div data-testid="thread-safety-controls">
          <ReportSheet
            targetType="conversation"
            targetId={conversationId}
            targetLabel={`Conversation with ${counterpartName}`}
            signedIn={signedIn}
            trigger="row"
          />

          {confirmingBlock ? (
            <div className="nf-panel nf-panel--card mt-md p-md" data-testid="thread-block-confirm">
              <p className="nf-body font-semibold text-[var(--nf-content-primary)]">
                Block {counterpartName}?
              </p>
              <p className="mt-2xs text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
                {BLOCK_CONFIRM_COPY}
              </p>
              {blockNote && (
                <p
                  role="alert"
                  className="mt-xs text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]"
                >
                  {blockNote}
                </p>
              )}
              <div className="mt-sm grid gap-xs">
                <Button variant="danger" full onClick={doBlock} loading={blocking}>
                  Block {counterpartName}
                </Button>
                <Button
                  variant="ghost"
                  full
                  onClick={() => {
                    setConfirmingBlock(false);
                    setBlockNote(null);
                  }}
                >
                  Keep the conversation open
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingBlock(true)}
              data-testid="thread-block-opener"
              className="nf-share-row mt-md w-full text-left"
            >
              <span className="h-11 w-11 shrink-0" aria-hidden="true">
                <BrandIcon name="shield-check" fill />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block nf-body font-semibold text-[var(--nf-content-primary)]">
                  Block {counterpartName}
                </span>
                <span className="block nf-caption text-[var(--nf-content-muted)]">
                  They stop being able to reach you, here and everywhere else.
                </span>
              </span>
              <UiIcon name="chevron-right" size={16} className="shrink-0 text-[var(--nf-content-muted)]" />
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}
