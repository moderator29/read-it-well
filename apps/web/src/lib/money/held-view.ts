import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "../actions/session";
import type { HeldFacts } from "./held-model";

/**
 * STEP 8, FUNDED: the protected payment behind an agreement, read under the
 * viewer's own RLS (`provider_arrangements_parties_read`: the renter and the
 * lister only). Nothing is read with the service role; a stranger gets
 * `missing`, and so does an agreement with no protected payment.
 */
export type HeldRead =
  | { state: "ready"; agreementId: string; arrangementId: string; facts: HeldFacts }
  | { state: "missing" | "signed-out" | "unavailable" };

export async function readHeldPayment(agreementId: string): Promise<HeldRead> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "signed-out" };
  /* The tables arrive with migration d73b; untyped until database.types catches up. */
  const db = session.supabase as unknown as SupabaseClient;
  try {
    const { data: arr, error } = await db
      .from("provider_arrangements")
      .select("id, agreement_id, status, amount_minor, provider_fee_minor, buyer_user_id, seller_user_id, release_paused_at")
      .eq("agreement_id", agreementId)
      .not("status", "in", "(failed,cancelled)")
      .maybeSingle();
    if (error) return { state: "unavailable" };
    if (!arr) return { state: "missing" };
    const a = arr as {
      id: string;
      status: string;
      amount_minor: number;
      provider_fee_minor: number | null;
      buyer_user_id: string;
      seller_user_id: string;
      release_paused_at: string | null;
    };
    const role = a.buyer_user_id === session.user.id ? "renter" : a.seller_user_id === session.user.id ? "lister" : null;
    if (!role) return { state: "missing" };
    const [ag, ms, counterpart] = await Promise.all([
      db.from("deal_agreements").select("listing_id, terms").eq("id", agreementId).maybeSingle(),
      db.from("provider_arrangement_milestones").select("position, title, amount_minor, status").eq("arrangement_id", a.id).order("position"),
      db
        .from("profiles")
        .select("display_name")
        .eq("id", role === "renter" ? a.seller_user_id : a.buyer_user_id)
        .maybeSingle(),
    ]);
    const agreement = ag.data as { listing_id: string | null; terms: Record<string, unknown> | null } | null;
    let placeTitle = "Your home";
    if (agreement?.listing_id) {
      const { data: l } = await db.from("listings").select("title").eq("id", agreement.listing_id).maybeSingle();
      placeTitle = (l as { title?: string } | null)?.title || placeTitle;
    }
    const moveIn = typeof agreement?.terms?.move_in === "string" ? (agreement.terms.move_in as string) : null;
    return {
      state: "ready",
      agreementId,
      arrangementId: a.id,
      facts: {
        role,
        status: a.status,
        amountMinor: Number(a.amount_minor),
        providerFeeMinor: a.provider_fee_minor === null ? null : Number(a.provider_fee_minor),
        paused: a.release_paused_at !== null,
        counterpartName:
          (counterpart.data as { display_name?: string | null } | null)?.display_name || (role === "renter" ? "The lister" : "The renter"),
        placeTitle,
        moveIn,
        milestones: ((ms.data ?? []) as { position: number; title: string; amount_minor: number; status: string }[]).map((m) => ({
          position: m.position,
          title: m.title,
          amountMinor: Number(m.amount_minor),
          status: m.status,
        })),
      },
    };
  } catch {
    return { state: "unavailable" };
  }
}
