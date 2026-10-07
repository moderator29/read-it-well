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
 * Called by every path that opens a card payment (`split-attempt.ts`
 * quoteSplit, which the hosted checkout and the saved-card charge share), and
 * the answer is written into `transactions.rail` and `rail_policy_id` at
 * insert, fixed by trigger thereafter.
 *
 * THE ESCROW GATE (`railGate`). The escrow rail is not built: there is no
 * Payluk adapter and `payments_payluk_on` is off. A payment the policy sends
 * to escrow is therefore REFUSED, never opened on the direct rail instead,
 * because a direct Paystack split settles the lister at the moment of charge
 * and the hold the policy promised would silently not exist. Only when a
 * Payluk adapter that can hold is registered AND its switch is on does an
 * escrow answer pass, and even then only to a caller that opens on Payluk.
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

export async function resolveRail(
  input: {
    propertyType: PropertyType;
    listingIntent: ListingIntent;
    listerKind: ListerKind | null;
  },
  client?: unknown,
): Promise<RailAnswer> {
  try {
    const { data, error } = await ((client ?? createAdminClient()) as unknown as Rpc).rpc("resolve_payment_rail", {
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

/* ------------------------------------------------------------ bookings */

export type RailInputs = {
  propertyType: PropertyType;
  listingIntent: ListingIntent;
  listerKind: ListerKind | null;
};

/**
 * A business's kind, as the property type the policy is written in. Only the
 * kinds the founder's policy names are mapped; anything else (guest house,
 * resort, shortlet operator, agency) is NOT guessed and resolves to no rail,
 * so it fails closed until a policy row or a mapping names it.
 */
export function propertyTypeForBusinessKind(kind: unknown): PropertyType | null {
  switch (kind) {
    case "hotel":
      return "hotel";
    case "restaurant":
      return "restaurant";
    case "serviced_apartments":
      return "apartment";
    default:
      return null;
  }
}

type Loose = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (k: string, v: unknown) => { maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }> };
    };
  };
};

type Row = Record<string, unknown>;

/** A fixed-price stay is placed by the policy's hotel row (D73, D75). */
export const FIXED_PRICE_STAY: RailInputs = { propertyType: "hotel", listingIntent: "rent", listerKind: "business" };

async function one(db: Loose, table: string, columns: string, id: unknown): Promise<Row | null | "error"> {
  if (typeof id !== "string" || id.length === 0) return null;
  const { data, error } = await db.from(table).select(columns).eq("id", id).maybeSingle();
  if (error) return "error";
  return (data as Row | null) ?? null;
}

/**
 * What the policy needs to know about a booking: from its listing (property
 * type, intent, and the lister kind from `agents.type`), or for a room booking
 * from the accommodation's business, which is a registered business by
 * definition. `null` means it cannot be said, which is no rail.
 */
export async function railInputsForBooking(client: unknown, bookingId: string): Promise<RailInputs | null | "error"> {
  const db = client as Loose;
  try {
    const booking = await one(db, "bookings", "id, listing_id, accommodation_id, room_type_id", bookingId);
    if (booking === "error") return "error";
    if (!booking) return null;
    /* D73/D75, twin of private.rail_for_booking (migration d68d): a fixed-price
       stay (a room, or a listing at a published nightly rate) that is not a
       rent charge settles as a hotel room does. */
    const rentCharge = await db.from("rent_payments").select("id").eq("booking_id", bookingId).maybeSingle();
    if (rentCharge.error) return "error";
    const isRentCharge = rentCharge.data !== null;
    if (!isRentCharge && typeof booking.listing_id !== "string" && typeof booking.room_type_id === "string") {
      return FIXED_PRICE_STAY;
    }
    if (typeof booking.listing_id === "string") {
      const listing = await one(db, "listings", "id, property_type, listing_intent, agent_id, rate_period", booking.listing_id);
      if (listing === "error") return "error";
      if (!isRentCharge && listing && listing.rate_period === "night") return FIXED_PRICE_STAY;
      if (!listing || typeof listing.property_type !== "string" || typeof listing.listing_intent !== "string") return null;
      let listerKind: ListerKind | null = null;
      if (typeof listing.agent_id === "string") {
        const agent = await one(db, "agents", "id, type", listing.agent_id);
        if (agent === "error") return "error";
        if (agent && (agent.type === "individual" || agent.type === "business")) listerKind = agent.type;
      }
      return {
        propertyType: listing.property_type as PropertyType,
        listingIntent: listing.listing_intent as ListingIntent,
        listerKind,
      };
    }
    if (typeof booking.accommodation_id === "string") {
      const acc = await one(db, "accommodations", "id, business_id", booking.accommodation_id);
      if (acc === "error") return "error";
      if (!acc) return null;
      const biz = await one(db, "businesses", "id, kind", acc.business_id);
      if (biz === "error") return "error";
      const propertyType = biz ? propertyTypeForBusinessKind(biz.kind) : null;
      if (!propertyType) return null;
      return { propertyType, listingIntent: "rent", listerKind: "business" };
    }
    return null;
  } catch {
    return "error";
  }
}

/** The rail a booking's payment opens on, as the policy says today. */
export async function railForBooking(client: unknown, bookingId: string): Promise<RailAnswer> {
  const inputs = await railInputsForBooking(client, bookingId);
  if (inputs === "error") return { state: "unavailable" };
  if (!inputs) return { state: "unresolved" };
  return resolveRail(inputs, client);
}

/** The sentences a member reads when the rail stops a payment. Exported for tests. */
export const RAIL_REFUSAL = {
  unresolved:
    "Payment is not open for this listing yet. Nothing has been charged, and Vallo has been told so it can be put right.",
  unavailable: "Payment is temporarily unavailable. Nothing has been charged. Please try again in a few minutes.",
  escrow_not_live:
    "Payment for this kind of listing is not open on Vallo yet. Nothing has been charged, and your booking is kept as it is.",
} as const;

export type RailRefusalReason = keyof typeof RAIL_REFUSAL;

export type RailDecision =
  | { open: true; rail: "escrow" | "direct"; policyId: string; milestones: boolean }
  | { open: false; reason: RailRefusalReason; message: string };

/**
 * Pure. Whether a payment may open on what the router answered, for a caller
 * that opens on `opensOn`. Today every caller opens on the direct (Paystack
 * split) rail, so an escrow answer is refused whatever the switch says: a
 * direct charge cannot hold, and opening one would release money the policy
 * says must be held. `escrowLive` is the Payluk adapter-and-switch check.
 */
export function railGate(answer: RailAnswer, opensOn: "direct" | "escrow", escrowLive: boolean): RailDecision {
  if (answer.state === "unavailable") return { open: false, reason: "unavailable", message: RAIL_REFUSAL.unavailable };
  if (answer.state === "unresolved") return { open: false, reason: "unresolved", message: RAIL_REFUSAL.unresolved };
  if (answer.rail === "escrow" && (!escrowLive || opensOn !== "escrow")) {
    return { open: false, reason: "escrow_not_live", message: RAIL_REFUSAL.escrow_not_live };
  }
  if (answer.rail !== opensOn) {
    return { open: false, reason: "unresolved", message: RAIL_REFUSAL.unresolved };
  }
  return { open: true, rail: answer.rail, policyId: answer.policyId, milestones: answer.milestones };
}
