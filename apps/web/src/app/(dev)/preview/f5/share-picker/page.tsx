import { getDictionary } from "@vallo/i18n";
import { ShareToThread } from "@/app/(app)/messages/share/SharePicker";
import { PageHeader } from "@/components/app/PageHeader";
import { LISTING_CARD, LISTING_ID } from "../fixtures";
import { COUNTERPART, HOTEL, PERSON } from "../../_fixtures/people";

/**
 * The share picker, as it looks when a property is in hand.
 *
 * The real route reads the sharer's own conversations under RLS and its
 * confirm calls `sendMessage`, which sets `messages.sender_id` to the caller
 * and refuses a blocked pair. This renders the same component from fixture
 * threads so the surface can be read at 390 dark; the write is the route's.
 */
export const dynamic = "force-dynamic";

export default function PreviewSharePicker() {
  return (
    <div className="nf-shell py-section-tight">
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Share to chat" subtitle={LISTING_CARD.title} fallback={`/listing/${LISTING_ID}`} />
        <ShareToThread
          card={LISTING_CARD}
          target={{ kind: "listing", id: LISTING_ID }}
          copy={getDictionary("en").experienceInbox.share.picker}
          threads={[
            {
              id: "00000000-0000-4000-8000-00000000c001",
              counterpartName: HOTEL.name,
              counterpartVerified: true,
    counterpartTier: "gold" as const,
              counterpartKind: "agent",
              listingTitle: HOTEL.name,
            },
            {
              id: "00000000-0000-4000-8000-00000000c002",
              counterpartName: COUNTERPART.name,
              counterpartVerified: true,
    counterpartTier: "gold" as const,
              counterpartKind: "agent",
              listingTitle: "Luxury 2 bedroom apartment",
            },
            {
              id: "00000000-0000-4000-8000-00000000c003",
              counterpartName: "Adaora Nwosu",
              counterpartVerified: false,
    counterpartTier: "none" as const,
              counterpartKind: "member",
              listingTitle: null,
            },
          ]}
        />
        <span className="sr-only">{PERSON.name}</span>
      </div>
    </div>
  );
}
