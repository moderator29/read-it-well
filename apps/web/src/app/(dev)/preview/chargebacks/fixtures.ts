import { countChargebacks, type ChargebackRow, type TimelineEntry } from "@/lib/admin/reads/chargebacks-model";
import type { ChargebackDetail } from "@/lib/admin/reads/chargebacks";

/**
 * Fixture chargebacks for the preview decks, on a pinned Tuesday 13 October
 * 2026, 10:00 Lagos. Invented references and names; never a real record.
 */
export const NOW = Date.parse("2026-10-13T09:00:00Z");

const id = (n: number) => `cb0000c0-0000-4000-8000-${String(n).padStart(12, "0")}`;
const booking = (n: number) => `b0000b00-0000-4000-8000-${String(n).padStart(12, "0")}`;
const person = (n: number) => `a0000a00-0000-4000-8000-${String(n).padStart(12, "0")}`;

const row = (n: number, over: Partial<ChargebackRow>): ChargebackRow => ({
  id: id(n),
  reference: `VAL-PSK-24${n}91${n}`,
  transactionId: `tx-${n}`,
  provider: "paystack",
  providerDisputeId: `DSP_${n}8K2${n}Q`,
  amountMinor: 18_500_000,
  currency: "NGN",
  state: "opened",
  providerStatus: "awaiting-merchant-feedback",
  evidenceDueAt: null,
  listerId: person(10 + n),
  listerUnattributed: false,
  recoveryState: "none",
  recoveredMinor: 0,
  openedAt: "2026-10-11T08:20:00Z",
  closedAt: null,
  recoveryClosedAt: null,
  bookingId: booking(n),
  agreementId: null,
  payerId: person(n),
  payerName: "Ada Okafor",
  listerName: "Lekki Shortlets",
  listingTitle: "Two-bed serviced flat, Lekki Phase 1",
  ...over,
});

export const ROWS: ChargebackRow[] = [
  row(1, { evidenceDueAt: "2026-10-12T22:59:00Z", state: "evidence_requested", openedAt: "2026-10-02T11:00:00Z", listingTitle: "Studio by the lagoon, Yaba" }),
  row(2, { evidenceDueAt: "2026-10-16T22:59:00Z", amountMinor: 42_000_000, listerName: "Maitama Suites", payerName: "Musa Bello", listingTitle: "Executive suite, Maitama" }),
  row(3, { state: "evidence_submitted", evidenceDueAt: "2026-10-20T22:59:00Z", amountMinor: 9_000_000, openedAt: "2026-09-25T10:00:00Z" }),
  row(4, {
    state: "lost",
    recoveryState: "owed",
    recoveredMinor: 5_000_000,
    amountMinor: 27_500_000,
    openedAt: "2026-09-01T09:00:00Z",
    closedAt: "2026-09-29T14:10:00Z",
    providerStatus: "lost",
    listerName: "Ikoyi Homes",
    listingTitle: "Three-bed apartment, Ikoyi",
  }),
  row(5, {
    reference: "VAL-PSK-2405550",
    listerId: null,
    listerUnattributed: true,
    listerName: null,
    amountMinor: 6_500_000,
    openedAt: "2026-10-12T16:30:00Z",
    providerStatus: null,
  }),
  row(6, { state: "won", closedAt: "2026-09-20T12:00:00Z", openedAt: "2026-08-28T09:00:00Z", amountMinor: 12_000_000, providerStatus: "won" }),
  row(7, {
    state: "lost",
    recoveryState: "recovered",
    recoveredMinor: 15_000_000,
    amountMinor: 15_000_000,
    openedAt: "2026-08-10T09:00:00Z",
    closedAt: "2026-08-30T09:00:00Z",
    recoveryClosedAt: "2026-09-04T09:00:00Z",
  }),
];

export const DESK = { rows: ROWS, counts: countChargebacks(ROWS) };

const entry = (n: number, over: Partial<TimelineEntry>): TimelineEntry => ({
  id: `ev-${n}`,
  kind: "transition",
  from: null,
  to: "opened",
  recovery: null,
  recoveredMinor: null,
  evidenceDueAt: null,
  actorId: null,
  actorName: null,
  note: null,
  hasRaw: false,
  at: "2026-09-01T09:00:00Z",
  ...over,
});

const LOST = ROWS[3]!;

export const LOST_DETAIL: ChargebackDetail = {
  row: LOST,
  timelineSource: "events",
  notesOpen: true,
  timeline: [
    entry(1, { kind: "opened", to: "opened", recovery: "none", hasRaw: true, note: "Paystack dispute webhook: fraudulent transaction claimed by the card holder." }),
    entry(2, {
      from: "opened",
      to: "evidence_requested",
      actorId: person(90),
      actorName: "Tolu, Finance",
      evidenceDueAt: "2026-09-08T22:59:00Z",
      note: "Asked the lister for the check-in photos and the guest's messages.",
      at: "2026-09-01T12:30:00Z",
    }),
    entry(3, { kind: "note", from: "evidence_requested", to: "evidence_requested", actorId: person(90), actorName: "Tolu, Finance", note: "Lister sent four check-in photos and the WhatsApp thread.", at: "2026-09-03T10:05:00Z" }),
    entry(4, { from: "evidence_requested", to: "evidence_submitted", actorId: person(90), actorName: "Tolu, Finance", note: "Uploaded the photos, the thread and the receipt to the Paystack dispute.", at: "2026-09-04T09:40:00Z" }),
    entry(5, { from: "evidence_submitted", to: "lost", recovery: "owed", actorId: null, note: "Issuer ruled for the card holder.", hasRaw: true, at: "2026-09-29T14:10:00Z" }),
    entry(6, { from: "lost", to: "lost", recovery: "owed", recoveredMinor: 5_000_000, actorId: person(90), actorName: "Tolu, Finance", note: "First instalment of NGN 50,000 received by transfer from the lister.", at: "2026-10-06T11:00:00Z" }),
  ],
};

export const OPEN_DETAIL: ChargebackDetail = {
  row: ROWS[1]!,
  timelineSource: "audit",
  notesOpen: false,
  timeline: [entry(11, { kind: "opened", to: "opened", recovery: "none", actorId: person(90), actorName: "Tolu, Finance", at: "2026-10-11T08:20:00Z" })],
};
