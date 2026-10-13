import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "./guard";
import { seatingMissing } from "../reservations/seating-missing";
import { SEATED_FEE_MINOR_DEFAULT } from "../reservations/seating";

/**
 * WHAT EACH RESTAURANT OWES (founder decision D).
 *
 * Restaurants list for free and pay a flat fee per seated guest, billed at
 * the end of the month. `public.restaurant_seated_fees` (pending migration
 * 20261013100000) counts the seated tables and guests per restaurant per
 * Lagos month, the fee owed, and the bills paid through Vallo with their
 * commission. It answers admins only, so it is called with the admin's own
 * client. The disputes are the seatings a restaurant and a diner disagree
 * on; they are left out of the count until a person decides them.
 */

export type FeeRow = {
  businessId: string;
  businessName: string;
  month: string;
  seatedTables: number;
  seatedGuests: number;
  feeMinor: number;
  billsPaid: number;
  billCommissionMinor: number;
};

export type SeatingDispute = {
  reservationId: string;
  restaurantAnswer: string | null;
  dinerAnswer: string | null;
  disputedAt: string;
  businessName: string;
  reservedFor: string | null;
  partySize: number | null;
};

export type RestaurantFeesRead =
  | { state: "ok"; rows: FeeRow[]; disputes: SeatingDispute[]; feeMinor: number; commissionBps: number | null }
  | { state: "not-ready" }
  | { state: "unavailable" };

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export async function getRestaurantFees(months = 6): Promise<RestaurantFeesRead> {
  const access = await requireAdmin("operations");
  if (access.state !== "admin") return { state: "unavailable" };
  const db = access.userClient as unknown as SupabaseClient;
  try {
    const [fees, settings, disputes] = await Promise.all([
      db.rpc("restaurant_seated_fees", { p_months: months }),
      db.from("restaurant_money_settings").select("seated_fee_minor, bill_commission_bps").maybeSingle(),
      db
        .from("reservation_seatings")
        .select("reservation_id, business_id, restaurant_answer, diner_answer, disputed_at")
        .not("disputed_at", "is", null)
        .is("dispute_resolved_at", null)
        .order("disputed_at", { ascending: true })
        .limit(100),
    ]);
    if (seatingMissing(fees.error) || seatingMissing(settings.error)) return { state: "not-ready" };
    if (fees.error || settings.error || disputes.error) return { state: "unavailable" };

    const rows: FeeRow[] = ((fees.data ?? []) as Record<string, unknown>[]).map((r) => ({
      businessId: String(r.business_id ?? ""),
      businessName: typeof r.business_name === "string" && r.business_name ? r.business_name : "A restaurant",
      month: String(r.month ?? ""),
      seatedTables: num(r.seated_tables),
      seatedGuests: num(r.seated_guests),
      feeMinor: num(r.fee_minor),
      billsPaid: num(r.bills_paid),
      billCommissionMinor: num(r.bill_commission_minor),
    }));

    const raw = (disputes.data ?? []) as {
      reservation_id: string;
      business_id: string | null;
      restaurant_answer: string | null;
      diner_answer: string | null;
      disputed_at: string;
    }[];
    const ids = raw.map((d) => d.reservation_id);
    const businessIds = [...new Set(raw.map((d) => d.business_id).filter((id): id is string => Boolean(id)))];
    const [tables, places] = await Promise.all([
      ids.length > 0
        ? db.from("reservations").select("id, reserved_for, party_size").in("id", ids)
        : Promise.resolve({ data: [], error: null }),
      businessIds.length > 0
        ? db.from("businesses").select("id, name").in("id", businessIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const tableOf = new Map(
      ((tables.data ?? []) as { id: string; reserved_for: string; party_size: number }[]).map((t) => [t.id, t]),
    );
    const nameOf = new Map(((places.data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));

    const setting = (settings.data ?? {}) as { seated_fee_minor?: unknown; bill_commission_bps?: unknown };
    return {
      state: "ok",
      rows,
      disputes: raw.map((d) => ({
        reservationId: d.reservation_id,
        restaurantAnswer: d.restaurant_answer,
        dinerAnswer: d.diner_answer,
        disputedAt: d.disputed_at,
        businessName: (d.business_id && nameOf.get(d.business_id)) || "A restaurant",
        reservedFor: tableOf.get(d.reservation_id)?.reserved_for ?? null,
        partySize: tableOf.get(d.reservation_id)?.party_size ?? null,
      })),
      feeMinor: setting.seated_fee_minor === undefined ? SEATED_FEE_MINOR_DEFAULT : num(setting.seated_fee_minor),
      commissionBps:
        setting.bill_commission_bps === null || setting.bill_commission_bps === undefined
          ? null
          : num(setting.bill_commission_bps),
    };
  } catch {
    return { state: "unavailable" };
  }
}

/** "October 2026", from the first day of a month. */
export function monthWords(isoDate: string): string {
  const at = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(at.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(at);
}
