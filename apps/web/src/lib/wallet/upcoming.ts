import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "../actions/session";
import { lagosToday } from "../rent/schema";
import { cautionState, tenancyEnd, type RentPeriod } from "../tenancy/model";
import { mergeUpcoming, type UpcomingItem } from "./upcoming-model";

/**
 * V-84. The "Coming up" read for the wallet: rent renewals and cautions from
 * the tenancy records, live held payments, and paid stays still ahead, for
 * the signed-in reader only, through their own RLS-bound client.
 *
 * Null means a read failed, which the strip says in words; an empty list
 * means nothing is coming up, and the strip then renders nothing at all.
 */
const RENEWAL_HORIZON_DAYS = 120;

type Row = Record<string, unknown>;

function rows(data: unknown): Row[] {
  return Array.isArray(data) ? (data.filter((row) => typeof row === "object" && row !== null) as Row[]) : [];
}

function int(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isSafeInteger(n) && n >= 0 ? n : null;
}

function dayOf(value: unknown): string | null {
  return typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : null;
}

export async function readUpcoming(now: Date = new Date()): Promise<UpcomingItem[] | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return [];
  const me = session.user.id;
  const today = lagosToday(now);
  const horizon = new Date(Date.parse(`${today}T00:00:00Z`) + RENEWAL_HORIZON_DAYS * 86_400_000).toISOString().slice(0, 10);
  const loose = session.supabase as unknown as SupabaseClient;
  try {
    const [tenancies, obligations, escrows, stays] = await Promise.all([
      loose.from("rent_payments").select("id, booking_id, move_in, rent_period, rent_minor").eq("tenant_id", me),
      loose.from("caution_obligations").select("id, rent_payment_id, tenant_id, lister_id, amount_minor, due_on"),
      loose.from("escrows").select("id, state, amount_minor, payer_id, auto_release_at").in("state", ["HELD", "RELEASE_REQUESTED", "DISPUTED"]),
      loose
        .from("bookings")
        .select("id, check_in, total_minor, status")
        .eq("guest_id", me)
        .eq("status", "CONFIRMED")
        .gte("check_in", today),
    ]);
    if (tenancies.error || stays.error) return null;
    const items: UpcomingItem[] = [];

    // Paid charges only: a charge that lapsed unpaid renews nothing.
    const tenancyRows = rows(tenancies.data);
    const stayRows = rows(stays.data);
    const bookingIds = [...tenancyRows.map((row) => String(row.booking_id)), ...stayRows.map((row) => String(row.id))];
    const paid = new Set<string>();
    if (bookingIds.length > 0) {
      const tx = await loose.from("transactions").select("booking_id").in("booking_id", bookingIds).eq("status", "SUCCESSFUL");
      if (tx.error) return null;
      for (const row of rows(tx.data)) paid.add(String(row.booking_id));
    }
    const rentBookings = new Set(tenancyRows.map((row) => String(row.booking_id)));

    for (const row of tenancyRows) {
      const rent = int(row.rent_minor);
      const moveIn = dayOf(row.move_in);
      if (!paid.has(String(row.booking_id)) || rent === null || !moveIn) continue;
      const period = (row.rent_period ?? "year") as RentPeriod;
      const ends = tenancyEnd(moveIn, period);
      if (ends > horizon) continue;
      const voidRead = await loose.rpc("tenancy_is_void", { p_rent_payment: String(row.id) });
      if (!voidRead.error && voidRead.data === true) continue;
      items.push({ kind: "renewal", on: ends, amountMinor: rent, href: `/tenancy/${row.id}`, id: `renewal-${row.id}` });
    }

    // Cautions: what is still owed, derived from the rows beside each one.
    const obligationRows = obligations.error ? [] : rows(obligations.data);
    if (obligationRows.length > 0) {
      const ids = obligationRows.map((row) => String(row.id));
      const [returns, deductions] = await Promise.all([
        loose.from("caution_returns").select("obligation_id, amount_minor").in("obligation_id", ids),
        loose.from("caution_deductions").select("id, obligation_id, amount_minor").in("obligation_id", ids),
      ]);
      const deductionRows = rows(deductions.data);
      const answers = deductionRows.length
        ? await loose.from("caution_deduction_answers").select("deduction_id, answer").in("deduction_id", deductionRows.map((row) => String(row.id)))
        : { data: [], error: null };
      if (!returns.error && !deductions.error && !answers.error) {
        const answerOf = new Map(rows(answers.data).map((row) => [String(row.deduction_id), row.answer]));
        for (const row of obligationRows) {
          const amount = int(row.amount_minor);
          const due = dayOf(row.due_on);
          if (amount === null || !due) continue;
          const reading = cautionState({
            amountMinor: amount,
            returns: rows(returns.data)
              .filter((r) => r.obligation_id === row.id)
              .flatMap((r) => (int(r.amount_minor) === null ? [] : [{ amountMinor: int(r.amount_minor) as number }])),
            deductions: deductionRows
              .filter((d) => d.obligation_id === row.id)
              .flatMap((d) => {
                const value = int(d.amount_minor);
                const answer = answerOf.get(String(d.id));
                return value === null ? [] : [{ amountMinor: value, answer: answer === "accepted" || answer === "disputed" ? answer : null }];
              }),
          });
          if (reading.outstandingMinor <= 0) continue;
          const voidRead = await loose.rpc("tenancy_is_void", { p_rent_payment: String(row.rent_payment_id) });
          if (!voidRead.error && voidRead.data === true) continue;
          items.push({
            kind: row.tenant_id === me ? "caution_owed_to_you" : "caution_you_owe",
            on: due,
            amountMinor: reading.outstandingMinor,
            href: `/tenancy/${row.rent_payment_id}`,
            id: `caution-${row.id}`,
          });
        }
      }
    }

    // V-86: a flatmate's unpaid share of a move-in, due by the move-in day.
    const mine = await loose.from("rent_payment_contributors").select("id").eq("user_id", me);
    if (!mine.error) {
      for (const row of rows(mine.data)) {
        const read = await loose.rpc("my_rent_share", { p_contributor: String(row.id) });
        const share = !read.error && read.data && typeof read.data === "object" ? (read.data as Row) : null;
        const amount = share ? int(share.share_minor) : null;
        const due = share ? dayOf(share.move_in) : null;
        if (!share || share.paid_at || share.void === true || amount === null || !due) continue;
        items.push({ kind: "share", on: due, amountMinor: amount, href: `/rent/share/${row.id}`, id: `share-${row.id}` });
      }
    }

    // Held payments the reader paid into, until they release.
    if (!escrows.error) {
      for (const row of rows(escrows.data)) {
        const amount = int(row.amount_minor);
        const until = dayOf(row.auto_release_at);
        if (row.payer_id !== me || amount === null || !until) continue;
        items.push({ kind: "held", on: until, amountMinor: amount, href: `/escrow/${row.id}`, id: `held-${row.id}` });
      }
    }

    // Paid stays still ahead. A rent charge's booking is not a stay.
    for (const row of stayRows) {
      const total = int(row.total_minor);
      const on = dayOf(row.check_in);
      if (!paid.has(String(row.id)) || rentBookings.has(String(row.id)) || total === null || !on) continue;
      items.push({ kind: "stay", on, amountMinor: total, href: `/bookings/${row.id}`, id: `stay-${row.id}` });
    }

    return mergeUpcoming(items, today);
  } catch {
    return null;
  }
}
