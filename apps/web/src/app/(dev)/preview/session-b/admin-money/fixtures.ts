/*
 * FIXTURES FOR THE MONEY DESKS' PROOF HARNESS (lead ruling R-G: proofs are
 * reproducible). Two states: "live" mirrors the rows the production database
 * held when read on 22 and 23 September (one wallet, a completed 1,000 naira
 * top-up on 9 August and a failed withdrawal on 10 August, no escrows, no
 * bookings, every supply row an example). "full" is invented to exercise the
 * layout against the renders and is never shown anywhere but this harness,
 * which the preview gate keeps off production.
 */
import type { EscrowView, MoneyConsole, WalletEntryView } from "@/lib/admin/money-queries";
import { flowFromWhole, ledgerFromWhole, pipelineFromWhole, pulseFromWhole } from "@/lib/admin/reads/money-derive";
import type { ReconciliationHealth } from "@/lib/admin/reads/money-types";
import { buildSupply } from "@/lib/admin/reads/supply";
import { buildBookings, type BookingRaw } from "@/lib/admin/reads/bookings";
import { buildPayments, type PaymentAttempt } from "@/lib/admin/reads/payments";

export const NOW = Date.parse("2026-09-22T19:30:00Z");
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();
const who = ["Tunde A.", "Amaka J.", "Chinedu R.", "Fatima B.", "Bola T.", "Daniel K.", "Grace E."];

function entries(full: boolean): WalletEntryView[] {
  if (!full)
    return [
      { id: "e2", walletId: "w1", ownerName: "Tunde A.", kind: "withdrawal", direction: "debit", amountMinor: 100000, reference: "wd_2Kx9Qm", status: "FAILED", note: null, createdAt: "2026-08-10T12:26:42Z" },
      { id: "e1", walletId: "w1", ownerName: "Tunde A.", kind: "deposit", direction: "credit", amountMinor: 100000, reference: "ps_8HfL2a", status: "COMPLETED", note: null, createdAt: "2026-08-09T18:10:06Z" },
    ];
  const kinds: [string, "credit" | "debit", string][] = [["payment", "credit", "Listing payment"], ["withdrawal", "debit", "Payout to lister"], ["payment", "debit", "Agency fee"], ["deposit", "credit", "Booking payment"], ["refund", "debit", "Refund, failed charge"], ["withdrawal", "debit", "Payout to lister"]];
  return Array.from({ length: 56 }, (_, i) => {
    const [kind, direction, note] = kinds[i % 6]!;
    const month = Math.floor(i / 5);
    return { id: `f${i}`, walletId: `w${i % 7}`, ownerName: who[i % 7]!, kind, direction, amountMinor: direction === "credit" ? 900_000_000 - month * 55_000_000 + (i % 3) * 20_000_000 : 300_000_000 - month * 18_000_000 + (i % 2) * 15_000_000, reference: `ref_${(100000 + i * 3571).toString(36)}`, status: i === 3 ? "PENDING" : "COMPLETED", note, createdAt: iso(NOW - i * 6.4 * DAY - 3_600_000) };
  });
}
export function moneyRead(full: boolean): MoneyConsole {
  const recent = entries(full);
  return { wallets: full ? [] : [{ id: "w1", userId: "5b1c3f7e-0000-4000-8000-000000000001", ownerName: "Tunde A.", currency: "NGN", balanceMinor: 100000, heldMinor: 0, entryCount: 2, createdAt: iso(NOW - 5 * DAY) }], recent, stuck: [], totals: { balanceMinor: full ? 0 : 100000, heldMinor: 0, walletCount: full ? 0 : 1 } };
}
export function moneyDesk(full: boolean, page: number) {
  const recent = entries(full);
  const p = pulseFromWhole(recent, NOW);
  return {
    pulse: { asOf: iso(NOW), floatMinor: p.floatMinor, floatWeekAgoMinor: p.floatWeekAgoMinor, inEscrowMinor: full ? 1_495_000_000 : 0, inEscrowWeekAgoMinor: full ? 1_050_000_000 : 0, settledMinor: p.settledMinor, failedCharges: full ? { thisWeek: { count: 3, amountMinor: 12_500_000 }, lastWeek: { count: 4, amountMinor: 13_600_000 } } : { thisWeek: { count: 0, amountMinor: 0 }, lastWeek: { count: 0, amountMinor: 0 } } },
    flow: flowFromWhole(recent, NOW),
    ledger: ledgerFromWhole(recent, page, 10),
    complete: true,
  };
}
export function health(live: boolean): ReconciliationHealth {
  return { windowDays: 7, runs: live ? 6 : 40, clean: live ? 6 : 39, needsAttention: live ? 0 : 1, expectedRuns: null, lastRunAt: iso(NOW - 20 * 60_000), lastCleanAt: iso(NOW - 20 * 60_000), lastReply: null, pageOnly: false };
}
const names = [["Lekki", "Adeola"], ["Ikoyi", "Chinedu"], ["Maitama", "Grace"], ["Surulere", "Tunde"], ["Yaba", "Funke"]] as const;
export function escrowDesk(full: boolean) {
  if (!full) return { pipeline: pipelineFromWhole([]), heldMinor: 0, openCount: 0, disputes: [], table: { rows: [], total: 0, page: 1, pageSize: 10 }, complete: true };
  const open: EscrowView[] = names.map(([from, to], i) => ({ id: `7k4m${i}2a0-1111-4000-8000-00000000000${i}`, state: i === 1 ? "RELEASE_REQUESTED" : "HELD", purpose: i === 4 ? "purchase_deposit" : "rent_deposit", amountMinor: [85_000_000, 520_000_000, 120_000_000, 560_000_000, 90_000_000][i]!, commissionMinor: null, payerName: `${from} tenant`, payeeName: to, listingTitle: `3 bedroom flat, ${from}`, payerConfirmed: i % 2 === 0, payeeConfirmed: false, fromInspection: i === 0, disputeReason: null, resolutionNote: null, autoReleaseAt: iso(NOW + [4.5, 2.25, 5.75, 1.125, 3.375][i]! * DAY), createdAt: iso(NOW - (i + 4) * DAY), heldAt: iso(NOW - [3, 5, 2, 7, 4][i]! * DAY), settledAt: null }));
  const dispute: EscrowView = { ...open[2]!, id: "3j9p8812-3333-4000-8000-000000000009", state: "DISPUTED", disputeReason: "The flat did not match the listing: no borehole, and the generator does not work.", autoReleaseAt: null };
  const x = (e: EscrowView) => ({ ...e, fundedAt: e.createdAt, releaseRequestedAt: e.state === "RELEASE_REQUESTED" ? e.heldAt : null, disputedAt: e.state === "DISPUTED" ? iso(NOW - 5_400_000) : null });
  const rows = [dispute, ...open].map(x);
  return { pipeline: pipelineFromWhole(rows.map((r) => ({ ...r, releasedAt: null, refundedAt: null, resolvedAt: null }))), heldMinor: 1_495_000_000, openCount: 5, disputes: [x(dispute)], table: { rows, total: 62, page: 1, pageSize: 10 }, complete: true };
}
export function supplyDesk(full: boolean) {
  const demoBiz = (id: string, kind: string) => ({ id, owner_id: null, agent_id: null, kind, name: id, verified: false, is_demo: !full, created_at: "2026-06-01T00:00:00Z" });
  const agents = full
    ? Array.from({ length: 40 }, (_, i) => ({ id: `a${i}`, user_id: `u${i}`, display_name: who[i % 7]!, type: (i % 3 === 0 ? "business" : "individual") as "business" | "individual", verified: i % 5 !== 0, is_demo: false, created_at: iso(NOW - (i * 4 + 1) * DAY), application_id: null }))
    : [{ id: "a", user_id: "u", display_name: "Example lister", type: "business" as const, verified: false, is_demo: true, created_at: "2026-08-01T00:00:00Z", application_id: null }];
  const areas = ["Lekki", "Ikoyi", "Maitama", "Wuse", "Yaba", "Gbagada"];
  const types = ["home", "apartment", "land", "hotel", "shortlet", "restaurant"];
  const listings = Array.from({ length: 64 }, (_, i) => ({ id: `l${i}`, agent_id: full ? `a${i % 40}` : "a", property_type: types[Math.min(5, Math.floor(Math.sqrt(i * 0.55)))]!, status: "PUBLISHED", area: areas[Math.floor(Math.sqrt(i * 0.5)) % 6]!, city: "Lagos", is_demo: !full }));
  return buildSupply({ agents, supplyRoleByApplication: new Map(), businesses: ["agency", "hotel", "restaurant", "agency", "guest_house", "hotel", "resort"].map((k, i) => demoBiz(`Business ${i}`, k)), listings, stays: [], releasedTo: new Map([["u1", 3_270_000_000], ["u2", 2_450_000_000]]), bookedOn: new Map() }, { examples: false, page: 1, pageSize: 8 }, NOW);
}
export function bookingsDesk(full: boolean) {
  const statuses: BookingRaw["status"][] = ["PENDING", "CONFIRMED", "CONFIRMED", "COMPLETED", "CANCELLED", "COMPLETED", "NO_SHOW", "CONFIRMED"];
  const rows: BookingRaw[] = full
    ? Array.from({ length: 46 }, (_, i) => ({ id: `b${i}0000-0000-4000-8000-000000000000`, status: statuses[i % 8]!, guest_id: `g${i}`, guest_name: who[i % 7]!, check_in: new Date(NOW + ((i % 9) - 3) * DAY).toISOString().slice(0, 10), check_out: new Date(NOW + ((i % 9) - 1) * DAY).toISOString().slice(0, 10), nights: 2, total_minor: 9_500_000 + (i % 5) * 2_000_000, created_at: iso(NOW - Math.floor(i * 0.63) * DAY - 3_600_000), listings: { title: ["Ocean view shortlet", "Studio in Wuse", "Two bed in Lekki Phase 1", "Garden suite, Ikoyi"][i % 4]!, area: areas2[i % 3]!, city: "Lagos" } }))
    : [];
  return { ...buildBookings(rows, new Map(rows.filter((_, i) => i % 3 !== 0).map((r) => [r.id, r.total_minor])), new Map([[rows[4]?.id ?? "", 4_000_000]]), new Map(), { page: 1, pageSize: 12 }, NOW), complete: true };
}
const areas2 = ["Lekki", "Wuse", "Ikoyi"];
export function paymentsDesk(full: boolean, outcome?: string, kind?: string) {
  const outs: PaymentAttempt["outcome"][] = ["succeeded", "succeeded", "failed", "succeeded", "abandoned", "succeeded", "initialised", "refunded", "succeeded"];
  const channels = ["card", "bank", "card", "ussd", "card", null];
  const attempts: PaymentAttempt[] = full
    ? Array.from({ length: 70 }, (_, i) => ({ id: `p${i}`, kind: i % 3 === 0 ? "checkout" : "topup", reference: `ps_${(900000 + i * 7919).toString(36)}`, channel: i % 3 === 0 ? null : channels[i % 6]!, provider: i % 3 === 0 ? "paystack" : null, outcome: outs[i % 9]!, amountMinor: 2_000_000 + (i % 7) * 1_500_000, bookingId: null, createdAt: iso(NOW - i * 0.42 * DAY - 7_200_000) }))
    : [{ id: "e1", kind: "topup", reference: "ps_8HfL2a", channel: "bank", provider: null, outcome: "succeeded", amountMinor: 100000, bookingId: null, createdAt: "2026-08-09T18:10:06Z" }];
  return { ...buildPayments(attempts, { ...(outcome ? { outcome } : {}), ...(kind ? { kind } : {}), page: 1, pageSize: 12 }, NOW), complete: true };
}
/** Tenancy charges. Live mirrors the database (0 rows in rent_payments, read with SQL on 23 September); full is invented layout data. */
export function rentCharges(full: boolean) {
  const titles = ["2 bedroom flat, Yaba", "Mini flat, Gbagada", "3 bedroom flat, Lekki", "Self-contained, Wuse", "2 bedroom flat, Ikoyi", "Studio, Maitama"];
  const who = ["Amaka J.", "Chinedu R.", "Fatima B.", "Bola T.", "Daniel K.", "Grace E."];
  const states = ["paid", "awaiting", "paid", "cancelled", "check", "paid"] as const;
  const periods = ["year", "year", "quarter", "year", "month", "year"];
  const rows = full
    ? titles.map((t, i) => ({ id: `rc${i}`, bookingId: `7c1e${i}a2b-4d10-4c7e-9b1f-0a6d3e${i}f81c2`, listingTitle: t, tenantName: who[i]!, moveIn: iso(NOW + (10 + i * 6) * DAY).slice(0, 10), rentPeriod: periods[i]!, totalMinor: [320_000_000, 185_000_000, 540_000_000, 90_000_000, 260_000_000, 410_000_000][i]!, currency: "NGN", state: states[i]!, createdAt: iso(NOW - i * 1.7 * DAY - 7_200_000) }))
    : [];
  return full
    ? { total: 23, byState: { awaiting: 5, paid: 13, cancelled: 3, no_show: 1, check: 1 }, paidMinor: 4_120_000_000, awaitingMinor: 1_060_000_000, latest: rows, complete: true }
    : { total: 0, byState: { awaiting: 0, paid: 0, cancelled: 0, no_show: 0, check: 0 }, paidMinor: 0, awaitingMinor: 0, latest: rows, complete: true };
}
