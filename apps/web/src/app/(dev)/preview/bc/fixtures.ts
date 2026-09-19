import type { AuditRowView } from "@/lib/admin/audit-queries";
import { COUNTERPART, PERSON } from "../_fixtures/people";

/**
 * BC's fixtures: a page of the audit log as the writers in this codebase
 * actually write it. Brand-neutral, the harness's fictional people, opaque
 * ids and references only, never an email, a card, an account number or a
 * document number (rule 16). Never the proof of the writes.
 */

const ADMIN_ID = PERSON.id;
const HOST_ID = COUNTERPART.id;
const GUEST_ID = "00000000-0000-4000-8000-000000000004";
const BOOKING_ID = "00000000-0000-4000-8000-00000000b001";
const BUSINESS_ID = "00000000-0000-4000-8000-00000000e001";
const LISTING_ID = "00000000-0000-4000-8000-00000000a001";

function at(minutesAgo: number): string {
  return new Date(Date.parse("2026-09-18T21:40:00+01:00") - minutesAgo * 60_000).toISOString();
}

export const AUDIT_ROWS: readonly AuditRowView[] = [
  {
    id: "00000000-0000-4000-8000-0000000000f1",
    createdAt: at(3),
    actorId: null,
    actorName: null,
    action: "wallet.reconciliation.run",
    entityType: "wallet_entry",
    entityId: null,
    metadata: {
      outcome: "clean",
      hours: 6,
      apply: true,
      charges_seen: 14,
      charges_ours: 14,
      gaps: 0,
      holds_examined: 2,
      overdrawn: 0,
    },
  },
  {
    id: "00000000-0000-4000-8000-0000000000f2",
    createdAt: at(11),
    actorId: GUEST_ID,
    actorName: null,
    action: "wallet.withdrawal.requested",
    entityType: "wallet_entry",
    entityId: "rm-wd-4c0d2f6e-91b3-4a8f-9d2e-6b7c8a9f0e11",
    metadata: { amount_minor: 4_500_000, outcome: "held", bank: "Zenith Bank" },
  },
  {
    id: "00000000-0000-4000-8000-0000000000f3",
    createdAt: at(26),
    actorId: ADMIN_ID,
    actorName: PERSON.name,
    action: "business.verification_check",
    entityType: "business",
    entityId: BUSINESS_ID,
    metadata: { rung: "registration", status: "passed", tier_before: 1, tier_after: 2 },
  },
  {
    id: "00000000-0000-4000-8000-0000000000f4",
    createdAt: at(41),
    actorId: null,
    actorName: null,
    action: "wallet.funding.posted",
    entityType: "paystack_webhook",
    entityId: "rm-fund-9d4f813d-da60-431a-84b0-6a329352ad75",
    metadata: { amount_minor: 2_000_000, outcome: "posted", event: "charge.success" },
  },
  {
    id: "00000000-0000-4000-8000-0000000000f5",
    createdAt: at(58),
    actorId: ADMIN_ID,
    actorName: PERSON.name,
    action: "accommodation.publish",
    entityType: "business",
    entityId: BUSINESS_ID,
    metadata: {
      accommodation_name: "Grand Vista Hotel",
      business_name: "Grand Vista Hospitality",
      photo_count: 6,
      business_published: true,
    },
  },
  {
    id: "00000000-0000-4000-8000-0000000000f6",
    createdAt: at(74),
    actorId: HOST_ID,
    actorName: COUNTERPART.name,
    action: "booking.no_show.recorded",
    entityType: "booking",
    entityId: BOOKING_ID,
    metadata: { by: "host", nights_reopened: 2 },
  },
  {
    id: "00000000-0000-4000-8000-0000000000f7",
    createdAt: at(95),
    actorId: ADMIN_ID,
    actorName: PERSON.name,
    action: "listing.approve",
    entityType: "listing",
    entityId: LISTING_ID,
    metadata: {},
  },
  {
    id: "00000000-0000-4000-8000-0000000000f8",
    createdAt: at(132),
    actorId: GUEST_ID,
    actorName: null,
    action: "payment_method.charged",
    entityType: "wallet_entry",
    entityId: "rm-bk-2a7e5c11-0f3b-4d6a-8e9c-1b2d3f4a5c6e",
    metadata: { purpose: "booking", amount_minor: 18_000_000, outcome: "success" },
  },
  {
    id: "00000000-0000-4000-8000-0000000000f9",
    createdAt: at(160),
    actorId: ADMIN_ID,
    actorName: PERSON.name,
    action: "risk_alert.resolve",
    entityType: "risk_alert",
    entityId: "00000000-0000-4000-8000-00000000c9a1",
    metadata: { status_before: "open", status_after: "resolved" },
  },
  {
    id: "00000000-0000-4000-8000-0000000000fa",
    createdAt: at(214),
    actorId: null,
    actorName: null,
    action: "cron.hold_sweep.run",
    entityType: "wallet_entry",
    entityId: null,
    metadata: { outcome: "ok", released: 3, kept: 41, duration_ms: 812 },
  },
];
