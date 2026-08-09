"use client";

import { UiIcon } from "@/design-system/icons/UiIcon";
import { MediaSkyline, mediaGround } from "@/components/app/MediaFrame";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { SAFETY_EDUCATION_COPY } from "@/lib/messages/education";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

/**
 * In-chat listing options sheet for the thread view.
 *
 * The verification step lives inside the conversation: the sheet shows the
 * listing, carries the canonical safety wording and the one action the
 * platform asks of guests before any money moves, confirming that the
 * property has actually been inspected. The container mechanics (drag handle,
 * detents, focus trap, focus restoration, Escape, backdrop and body scroll
 * lock) belong to `<Sheet>`.
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

/*
 * THE SEVENTH COPY OF THE HARD-CODED HUE ARRAY, NOW DELETED.
 *
 * Twelve raw hex literals lived here as a local "placeholder media hues,
 * matching the listing card treatment" table. It did not match it: the card
 * moved to `mediaGround` and its tokens some time ago, so this sheet was the
 * last surface still painting a fixed navy ramp. Being fixed, it stayed navy in
 * the light theme, where the rest of the sheet is white.
 *
 * `mediaGround(hue)` is the shared treatment. It keeps the hue meaningful - the
 * value still rotates the gradient angle, so two listings do not look identical
 * - while the colours themselves come from `--nf-media-ground-*` and follow the
 * theme.
 */

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

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Listing and safety"
      footer={
        <>
          {inspected ? (
            <p className="nf-badge nf-badge--success w-full justify-center py-2.5 text-[0.8125rem]">
              <UiIcon name="verified" size={16} />
              {confirmedLabel}
            </p>
          ) : (
            <Button variant="primary" full onClick={onConfirmInspection} loading={busy}>
              Confirm I have inspected this property
            </Button>
          )}

          {note && (
            <p role="status" className="mt-3 text-center text-[0.8125rem] text-[var(--nf-content-muted)]">
              {note}
            </p>
          )}
        </>
      }
    >
      <div className="-mt-2 mb-4 flex items-start justify-between gap-4">
        <p className="text-[0.8125rem] text-[var(--nf-content-muted)]">
          Conversation with {counterpartName}
        </p>
        <button type="button" aria-label="Close" onClick={onClose} className="nf-icon-btn h-9 w-9">
          <UiIcon name="close" size={16} />
        </button>
      </div>

      {/* ------------------------------------------------ listing mini view */}
      <div className="nf-card flex items-center gap-4 p-3">
        <div
          aria-hidden="true"
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl"
          style={{ background: mediaGround(listing.hue) }}
        >
          {/* The platform's own media fallback, not a seventh copy of it.
              This carried the skyline path inline with `fill="rgba(0,0,0,0.42)"`
              hardcoded, which is a raw colour and a dark one: on a light theme
              it punched a black silhouette through the sheet. `MediaSkyline`
              draws the same path on `--nf-media-silhouette`, which is a depth
              of the surface family in each theme. */}
          <MediaSkyline hue={0} className="opacity-60" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9063rem] font-semibold">{listing.title}</p>
          <p className="mt-0.5 truncate text-[0.75rem] text-[var(--nf-content-muted)]">
            {[listing.area, listing.city].filter(Boolean).join(", ")}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
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
      </div>

      {/* --------------------------------------------- inspection and safety */}
      <div className="mt-4 flex items-start gap-4">
        <span className="h-14 w-14 shrink-0" aria-hidden="true">
          <BrandIcon name="shield-lock" fill />
        </span>
        <p className="text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {SAFETY_EDUCATION_COPY}
        </p>
      </div>
    </Sheet>
  );
}
