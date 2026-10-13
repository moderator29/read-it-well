import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "../actions/session";
import { flagIsOn } from "../flags/read";
import { getAdminClient } from "@/lib/supabase/service";
import { RESTAURANT_DEPOSITS_FLAG } from "./deposits";

/**
 * THE GUEST'S DEPOSIT PAGE, READ (`/pay/deposit/[reservationId]`,
 * track/restaurant-deposits).
 *
 * The reservation and the deposit are read under the guest's OWN session
 * (`reservations` select own, `reservation_deposits_guest_read`), so a
 * reservation that is not theirs is simply missing. The charge reference is
 * not a column the guest may select, so it alone is read with the service
 * role, for this guest and this reservation, for the receipt.
 *
 * Not gated on the switch for what already happened: a deposit taken stays
 * visible, with its receipt, even if deposits are switched off later. Only a
 * deposit not yet asked for (the quote) needs the switch, and the quote
 * function checks it itself; paying needs it too (`payable`).
 */

export type GuestDepositView = {
  reservationId: string;
  /** Null when the venue cannot be read; the page says its own word. */
  venueName: string | null;
  location: string;
  reservedFor: string;
  partySize: number;
  reservationStatus: string;
  deposit: {
    /** "due" when none is open yet and the rule asks one; otherwise the row's own status. */
    status: string;
    amountMinor: number;
    refundUntil: string | null;
    /** The hours of free cancellation the rule gave, from the frozen refund time. */
    refundUntilHours: number;
    /** Known for a quote; null for a row already opened (the rule is not on it). */
    perGuest: boolean | null;
    paidAt: string | null;
    decidedAt: string | null;
    /** The charge's reference, for the receipt; read for this guest only. */
    reference: string | null;
  };
  /** True when the guest can pay it now: the switch is on and the table is still open. */
  payable: boolean;
};

export type GuestDepositRead = { state: "signed-out" } | { state: "missing" } | { state: "ok"; view: GuestDepositView };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whole hours of free cancellation: the table's time less the frozen refund time. */
export function refundHoursBefore(reservedFor: string, refundUntil: string | null): number {
  if (!refundUntil) return 0;
  const gap = Date.parse(reservedFor) - Date.parse(refundUntil);
  return Number.isFinite(gap) ? Math.max(0, Math.round(gap / 3_600_000)) : 0;
}

export async function readGuestDeposit(reservationId: string, now: Date = new Date()): Promise<GuestDepositRead> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "signed-out" };
  if (!UUID.test(reservationId)) return { state: "missing" };
  const db = session.supabase as unknown as SupabaseClient;
  const { data: res } = await db
    .from("reservations")
    .select("id, business_id, party_size, reserved_for, status")
    .eq("id", reservationId)
    .eq("guest_id", session.user.id)
    .maybeSingle();
  const r = res as { id: string; business_id: string | null; party_size: number; reserved_for: string; status: string } | null;
  if (!r || !r.business_id) return { state: "missing" };

  const [venueRead, depositRead, on] = await Promise.all([
    db.from("businesses").select("name, area, city").eq("id", r.business_id).maybeSingle(),
    db
      .from("reservation_deposits")
      .select("status, amount_minor, refund_until, paid_at, decided_at, created_at")
      .eq("reservation_id", r.id)
      .order("created_at", { ascending: false }),
    flagIsOn(RESTAURANT_DEPOSITS_FLAG),
  ]);
  const venue = venueRead.data as { name?: string; area?: string | null; city?: string | null } | null;
  const rows = ((depositRead.error ? [] : (depositRead.data ?? [])) as {
    status: string;
    amount_minor: number;
    refund_until: string | null;
    paid_at: string | null;
    decided_at: string | null;
  }[]).filter((d) => d.status !== "failed" && d.status !== "abandoned");
  const open = (r.status === "PENDING" || r.status === "CONFIRMED") && Date.parse(r.reserved_for) > now.getTime();

  let deposit: GuestDepositView["deposit"] | null = null;
  const row = rows[0];
  if (row) {
    deposit = {
      status: row.status,
      amountMinor: Number(row.amount_minor),
      refundUntil: row.refund_until,
      refundUntilHours: refundHoursBefore(r.reserved_for, row.refund_until),
      perGuest: null,
      paidAt: row.paid_at,
      decidedAt: row.decided_at,
      reference: null,
    };
  } else if (open && on) {
    const { data: q } = await db.rpc("reservation_deposit_quote_for", { p_reservation: r.id });
    const quote = (q ?? {}) as {
      status?: string;
      amount_minor?: number;
      refund_until?: string;
      refund_until_hours?: number;
      per_guest?: boolean;
    };
    if (quote.status === "ok") {
      deposit = {
        status: "due",
        amountMinor: Number(quote.amount_minor),
        refundUntil: quote.refund_until ?? null,
        refundUntilHours: Number(quote.refund_until_hours ?? 0),
        perGuest: quote.per_guest === true,
        paidAt: null,
        decidedAt: null,
        reference: null,
      };
    }
  }
  if (!deposit) return { state: "missing" };

  if (deposit.paidAt) {
    const admin = getAdminClient() as unknown as SupabaseClient | null;
    if (admin) {
      try {
        const { data: ref } = await admin
          .from("reservation_deposits")
          .select("provider_ref")
          .eq("reservation_id", r.id)
          .eq("guest_id", session.user.id)
          .not("paid_at", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        deposit.reference = (ref as { provider_ref?: string } | null)?.provider_ref ?? null;
      } catch {
        // The receipt is drawn without a reference rather than not at all.
      }
    }
  }

  return {
    state: "ok",
    view: {
      reservationId: r.id,
      venueName: venue?.name ?? null,
      location: [venue?.area ?? "", venue?.city ?? ""].filter((part) => part.length > 0).join(", "),
      reservedFor: r.reserved_for,
      partySize: r.party_size,
      reservationStatus: r.status,
      deposit,
      payable: on && open && (deposit.status === "due" || deposit.status === "pending"),
    },
  };
}
