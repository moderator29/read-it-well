"use client";

import type { ConversationListing } from "@/lib/messages/types";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { MediaFrame } from "@/components/app/MediaFrame";

/**
 * In-chat listing options sheet.
 *
 * The verification step lives inside the conversation: the sheet shows the
 * listing's approved and verified status and carries the single action the
 * platform asks of guests before any money moves, confirming that the property
 * has actually been inspected. The container mechanics (drag handle, detents,
 * focus trap, focus restoration, Escape, backdrop and body scroll lock) belong
 * to `<Sheet>`.
 */

export function ListingOptionsSheet({
  open,
  listing,
  agentName,
  inspected,
  onConfirmInspection,
  onClose,
}: {
  open: boolean;
  listing: ConversationListing;
  agentName: string;
  inspected: boolean;
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
        inspected ? (
          <p className="nf-badge nf-badge--success w-full justify-center py-2.5 text-[0.8125rem]">
            <UiIcon name="verified" size={16} />
            Inspection confirmed on this device
          </p>
        ) : (
          <Button variant="primary" full onClick={onConfirmInspection}>
            Confirm I have inspected this property
          </Button>
        )
      }
    >
      <div className="-mt-2 mb-4 flex items-start justify-between gap-4">
        <p className="text-[0.8125rem] text-[var(--nf-content-muted)]">
          Conversation with {agentName}
        </p>
        <button type="button" aria-label="Close" onClick={onClose} className="nf-icon-btn h-9 w-9">
          <UiIcon name="close" size={16} />
        </button>
      </div>

      {/* ------------------------------------------------ listing mini view */}
      <div className="nf-card flex items-center gap-4 p-3">
        <div
          aria-hidden="true"
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[var(--nf-radius-md)]"
        >
          <MediaFrame hue={listing.hue} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9063rem] font-semibold">{listing.title}</p>
          <p className="mt-0.5 truncate text-[0.75rem] text-[var(--nf-content-muted)]">
            {listing.area}, {listing.city}
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
          For your safety, only pay after you have inspected the property. Conversations are
          monitored for fraud.
        </p>
      </div>
    </Sheet>
  );
}
