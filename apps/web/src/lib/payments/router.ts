import "server-only";

import { createAdminClient } from "../supabase/admin";

/**
 * THE RAIL ROUTER, server side (Session 2, 7.4; architecture 3A.3).
 *
 * The routing lives in `public.payment_rail_policy` as dated data and is
 * resolved by `public.resolve_payment_rail` (migration 20261006030027):
 * highest precedence, then most specific, wins; no match or a disagreeing tie
 * is NO RAIL. This module never decides a rail itself and never falls back:
 * anything but `resolved` means no payment opens.
 *
 * Not yet called by the payment open path, by design: every payment today is
 * Paystack direct, and the open path adopts the router in the same change
 * that switches the escrow rail on (ADR-0003). The rail written then into
 * `transactions.rail` is fixed by trigger and never altered.
 */

export type PropertyType =
  | "apartment" | "hotel" | "home" | "villa" | "shortlet" | "rental" | "shop" | "office" | "land" | "restaurant";
export type ListingIntent = "rent" | "sale";
/** `agents.type`: the accountability of the counterparty. */
export type ListerKind = "individual" | "business";

export type RailAnswer =
  | { state: "resolved"; rail: "escrow" | "direct"; milestones: boolean; policyId: string }
  | { state: "unresolved" }
  | { state: "unavailable" };

type Rpc = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

export async function resolveRail(input: {
  propertyType: PropertyType;
  listingIntent: ListingIntent;
  listerKind: ListerKind | null;
}): Promise<RailAnswer> {
  try {
    const { data, error } = await (createAdminClient() as unknown as Rpc).rpc("resolve_payment_rail", {
      p_property_type: input.propertyType,
      p_listing_intent: input.listingIntent,
      p_lister_kind: input.listerKind,
    });
    if (error) return { state: "unavailable" };
    return readRailAnswer(data);
  } catch {
    return { state: "unavailable" };
  }
}

/** Pure, so the fail-closed reading is tested without a database. */
export function readRailAnswer(data: unknown): RailAnswer {
  const row = (Array.isArray(data) ? data[0] : data) as
    | { rail?: unknown; milestones?: unknown; policy_id?: unknown }
    | null
    | undefined;
  if (!row) return { state: "unresolved" };
  if ((row.rail !== "escrow" && row.rail !== "direct") || typeof row.policy_id !== "string") {
    return { state: "unresolved" };
  }
  return { state: "resolved", rail: row.rail, milestones: row.milestones === true, policyId: row.policy_id };
}
