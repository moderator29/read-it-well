"use client";

import type { ConversationListing } from "@/lib/messages/types";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { MediaFrame } from "@/components/app/MediaFrame";
import { IconPlate } from "@/components/ui/IconPlate";

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
          <p className="nf-badge nf-badge--success w-full justify-center py-sm text-[length:var(--nf-text-caption)]">
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
      <div className="-mt-xs mb-md flex items-start justify-between gap-md">
        <p className="text-[length:var(--nf-text-caption)] text-[var(--nf-content-muted)]">
          Conversation with {agentName}
        </p>
        <Button variant="icon" leadingIcon="close" aria-label="Close" onClick={onClose} />
      </div>

      {/* ------------------------------------------------ listing mini view */}
      <div className="nf-panel nf-panel--card flex-row items-center gap-md p-sm">
        <div
          aria-hidden="true"
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[var(--nf-radius-md)]"
        >
          {/* No `kind` here, deliberately. `ConversationListing` is a narrow
              projection built by the messages query and it does not carry the
              property type; adding it would mean widening that select for a
              64px thumbnail inside a sheet. The frame draws its default house
              scene, which is the honest answer when the market is unknown. */}
          <MediaFrame hue={listing.hue} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[length:var(--nf-text-body-sm)] font-semibold">{listing.title}</p>
          <p className="mt-3xs truncate text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
            {listing.area}, {listing.city}
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
      </div>

      {/* --------------------------------------------- inspection and safety */}
      <div className="mt-md flex items-start gap-md">
        <IconPlate size="md" className="shrink-0">
          <UiIcon name="shield-lock" size={20} />
        </IconPlate>
        <p className="text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
          For your safety, only pay after you have inspected the property. Conversations are
          monitored for fraud.
        </p>
      </div>
    </Sheet>
  );
}
