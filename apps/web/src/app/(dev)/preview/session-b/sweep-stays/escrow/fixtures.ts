import type { HeldPayment, HeldPaymentEvidence } from "@/lib/escrow/queries";

/** Held payments on fixture rows, one per tone the list draws. */
const BASE: HeldPayment = {
  id: "0b6c6f0e-0000-4000-8000-000000000001",
  state: "HELD",
  purpose: "rent_deposit",
  amountMinor: 120_000_000,
  commissionMinor: 0,
  viewer: "payer",
  counterpartyId: "0b6c6f0e-0000-4000-8000-0000000000aa",
  listingId: null,
  autoReleaseAt: "2026-10-04T09:00:00Z",
  heldAt: "2026-09-20T09:00:00Z",
  releaseRequestedAt: null,
  disputedAt: null,
  resolvedAt: null,
  releasedAt: null,
  refundedAt: null,
  initiatedAt: "2026-09-19T09:00:00Z",
  payerConfirmedAt: null,
  payeeConfirmedAt: null,
  disputeReason: null,
  resolutionNote: null,
};

export const HELD: HeldPayment = BASE;
export const DISPUTED: HeldPayment = {
  ...BASE,
  id: "0b6c6f0e-0000-4000-8000-000000000002",
  state: "DISPUTED",
  purpose: "agency_fee",
  amountMinor: 25_000_000,
  viewer: "payee",
  disputedAt: "2026-09-22T12:00:00Z",
  disputeReason: "The keys were not handed over on the agreed day.",
};
export const RELEASED: HeldPayment = {
  ...BASE,
  id: "0b6c6f0e-0000-4000-8000-000000000003",
  state: "RELEASED",
  purpose: "first_rent",
  amountMinor: 350_000_000,
  releasedAt: "2026-09-18T10:00:00Z",
  autoReleaseAt: null,
};

export const EVIDENCE: HeldPaymentEvidence[] = [
  {
    id: "e1",
    kind: "fact",
    authorId: BASE.counterpartyId,
    mine: false,
    fact: "The keys were not handed over on the agreed day.",
    happenedOn: "2026-09-21",
    amountMinor: null,
    fileName: null,
    storagePath: null,
    mimeType: null,
    sizeBytes: null,
    caption: null,
    createdAt: "2026-09-22T12:05:00Z",
    href: null,
  },
  {
    id: "e2",
    kind: "file",
    authorId: "me",
    mine: true,
    fact: null,
    happenedOn: null,
    amountMinor: null,
    fileName: "handover-receipt.pdf",
    storagePath: "x/handover-receipt.pdf",
    mimeType: "application/pdf",
    sizeBytes: 182_000,
    caption: "Signed handover receipt",
    createdAt: "2026-09-22T13:00:00Z",
    href: "#",
  },
];
