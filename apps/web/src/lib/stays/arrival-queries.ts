import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { readArrivalCharges, type ArrivalCharges } from "./arrival-charges";

/**
 * V-57. The current declaration for a listing or an accommodation: the latest
 * row, since every change is kept as a new one. Undefined when the read
 * failed; null when nothing is declared. Public for a published stay,
 * owner-only before.
 */
export async function readDeclaration(target: { listingId?: string; accommodationId?: string }): Promise<ArrivalCharges | null | undefined> {
  if (!isSupabaseConfigured()) return undefined;
  const column = target.listingId ? "listing_id" : "accommodation_id";
  const id = target.listingId ?? target.accommodationId;
  if (!id) return null;
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;
    const { data, error } = await supabase.from("arrival_charge_declarations").select("charges")
      .eq(column, id)
      .order("declared_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return undefined;
    return data ? readArrivalCharges((data as { charges: unknown }).charges) : null;
  } catch {
    return undefined;
  }
}

/**
 * V-57. What was declared when this booking was paid, frozen then and never
 * moved by a later edit. Readable by the guest even if the listing is later
 * taken down. Undefined when the read failed; null when the booking has no
 * snapshot (not paid yet); `charges: null` when nothing was declared at
 * payment.
 */
export async function readBookingSnapshot(bookingId: string): Promise<{ charges: ArrivalCharges | null } | null | undefined> {
  if (!isSupabaseConfigured()) return undefined;
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;
    const { data, error } = await supabase.from("arrival_charge_snapshots").select("charges").eq("booking_id", bookingId).maybeSingle();
    if (error) return undefined;
    if (!data) return null;
    const raw = (data as { charges: unknown }).charges;
    return { charges: raw === null ? null : readArrivalCharges(raw) };
  } catch {
    return undefined;
  }
}
