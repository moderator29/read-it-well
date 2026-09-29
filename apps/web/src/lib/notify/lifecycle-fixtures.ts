import type { Payload } from "./templates";

/**
 * One payload per lifecycle template, of exactly the shape its trigger in the
 * lifecycle migration composes (29 September 2026). Shared by
 * `templates.test.ts` (the words) and `outbox-delivery.test.ts` (the path to
 * the socket), so the two cannot disagree about what a trigger writes. Data
 * only, like `lib/email/fixtures.ts`; nothing in the application imports it.
 */
/** The payloads the lifecycle migration composes, key for key. */
export const LIFECYCLE_PAYLOADS: Record<string, Payload> = {
  "agreement.submitted": {
    agreement_id: "33333333-3333-4333-8333-333333333333",
    listing_id: "44444444-4444-4444-8444-444444444444",
    kind: "rent",
    amount_minor: 250_000_00,
    viewer: "renter",
  },
  "agreement.cancelled": {
    agreement_id: "33333333-3333-4333-8333-333333333333",
    listing_id: "44444444-4444-4444-8444-444444444444",
    kind: "rent",
    amount_minor: 250_000_00,
    viewer: "owner",
  },
  "guarantee.claim_opened": {
    claim_id: "5b5b5b5b-5b5b-4b5b-8b5b-5b5b5b5b5b5b",
    agreement_id: "33333333-3333-4333-8333-333333333333",
    requested_minor: 30_000_00,
  },
  "inspection.proposed": {
    inspection_id: "77777777-7777-4777-8777-777777777777",
    listing_id: "44444444-4444-4444-8444-444444444444",
    slot_at: "2026-10-03T14:00:00.000Z",
  },
  "inspection.declined": {
    inspection_id: "77777777-7777-4777-8777-777777777777",
    listing_id: "44444444-4444-4444-8444-444444444444",
    note: "The flat is let from Friday.",
  },
  "inspection.withdrawn": {
    inspection_id: "77777777-7777-4777-8777-777777777777",
    listing_id: "44444444-4444-4444-8444-444444444444",
    counterparty_id: "22222222-2222-4222-8222-222222222222",
    slot_at: "2026-10-02T10:30:00.000Z",
  },
  "inspection.completed": {
    inspection_id: "77777777-7777-4777-8777-777777777777",
    listing_id: "44444444-4444-4444-8444-444444444444",
    audience: "viewer",
    counterparty_id: "22222222-2222-4222-8222-222222222222",
  },
  "support.replied": { ticket_id: "5c5c5c5c-5c5c-4c5c-8c5c-5c5c5c5c5c5c", reference: "VAL-SUP-4K2P" },
  "listing.submitted": { listing_id: "44444444-4444-4444-8444-444444444444" },
  "reservation.confirmed": {
    reservation_id: "5d5d5d5d-5d5d-4d5d-8d5d-5d5d5d5d5d5d",
    listing_id: null,
    place_name: "Terra Kulture",
    reserved_for: "2026-10-04T18:30:00.000Z",
    party_size: 4,
  },
  "reservation.cancelled": {
    reservation_id: "5d5d5d5d-5d5d-4d5d-8d5d-5d5d5d5d5d5d",
    listing_id: null,
    place_name: "Terra Kulture",
    reserved_for: "2026-10-04T18:30:00.000Z",
    party_size: 4,
  },
  "refund.requested": {
    refund_request_id: "5e5e5e5e-5e5e-4e5e-8e5e-5e5e5e5e5e5e",
    booking_id: "5f5f5f5f-5f5f-4f5f-8f5f-5f5f5f5f5f5f",
    due_by: "2026-10-06T16:00:00.000Z",
  },
  "verification.rung_failed": {
    agent_id: "66666666-6666-4666-8666-666666666666",
    rung: "identity",
    note: "The photo of the card is too blurred to read.",
  },
};
