import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "../actions/session";
import { lagosToday } from "../bookings/schema";
import { tenancyReviewOpen } from "./review-model";

/**
 * The tenancy a review is about, as its tenant sees it (V-59). Under the
 * tenant's own RLS: `rent_payments_select_tenant` answers only for the tenant,
 * so another account's charge id reads as missing.
 */
export type TenancyReviewTarget =
  | { state: "signed-out" }
  | { state: "missing" }
  | { state: "not-open"; title: string; moveIn: string }
  | { state: "already"; title: string }
  | { state: "open"; paymentId: string; title: string; moveIn: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function readTenancyReviewTarget(paymentId: string): Promise<TenancyReviewTarget> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "signed-out" };
  if (!UUID_RE.test(paymentId)) return { state: "missing" };
  const db = session.supabase as unknown as SupabaseClient;
  try {
    const { data: charge } = await db
      .from("rent_payments")
      .select("id, listing_id, booking_id, move_in, tenant_id")
      .eq("id", paymentId)
      .maybeSingle();
    if (!charge || charge.tenant_id !== session.user.id) return { state: "missing" };
    const [{ data: booking }, { data: listing }, { data: existing }] = await Promise.all([
      db.from("bookings").select("status").eq("id", charge.booking_id).maybeSingle(),
      db.from("listings").select("title").eq("id", charge.listing_id).maybeSingle(),
      db.from("tenancy_reviews").select("rent_payment_id").eq("rent_payment_id", paymentId).maybeSingle(),
    ]);
    const title = (listing?.title as string | undefined)?.trim() || "This home";
    if (existing) return { state: "already", title };
    const open = tenancyReviewOpen({
      bookingStatus: (booking?.status as string | undefined) ?? null,
      moveIn: charge.move_in as string,
      today: lagosToday(),
    });
    return open
      ? { state: "open", paymentId, title, moveIn: charge.move_in as string }
      : { state: "not-open", title, moveIn: charge.move_in as string };
  } catch {
    return { state: "missing" };
  }
}

/** For the inspections list: which of my inspections have a tenancy review waiting. */
export async function readTenancyReviewsDue(inspectionIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (inspectionIds.length === 0) return out;
  const session = await resolveSession();
  if (session.state !== "signed-in") return out;
  const db = session.supabase as unknown as SupabaseClient;
  try {
    const { data: charges } = await db
      .from("rent_payments")
      .select("id, inspection_id, booking_id, move_in")
      .in("inspection_id", inspectionIds)
      .eq("tenant_id", session.user.id);
    const rows = (charges ?? []) as { id: string; inspection_id: string; booking_id: string; move_in: string }[];
    if (rows.length === 0) return out;
    const [{ data: bookings }, { data: done }] = await Promise.all([
      db.from("bookings").select("id, status").in("id", rows.map((r) => r.booking_id)),
      db.from("tenancy_reviews").select("rent_payment_id").in("rent_payment_id", rows.map((r) => r.id)),
    ]);
    const status = new Map(((bookings ?? []) as { id: string; status: string }[]).map((b) => [b.id, b.status]));
    const reviewed = new Set(((done ?? []) as { rent_payment_id: string }[]).map((d) => d.rent_payment_id));
    const today = lagosToday();
    for (const r of rows) {
      if (reviewed.has(r.id)) continue;
      if (tenancyReviewOpen({ bookingStatus: status.get(r.booking_id) ?? null, moveIn: r.move_in, today })) {
        out.set(r.inspection_id, `/rent/review/${r.id}`);
      }
    }
  } catch {
    return new Map();
  }
  return out;
}
