import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDate, formatMoney, type Locale } from "@vallo/i18n";
import type { Database } from "../supabase/database.types";
import type { RelatedKind, RelatedRecord } from "./new-query";

/**
 * The member's own records a support query can point at.
 *
 * Read on the member's own Row Level Security client, and filtered to records
 * they are a party to rather than merely able to see: a published listing is
 * readable by everyone, but only the lister's own listing belongs in their
 * picker. The database checks the same thing again on insert
 * (`private.support_related_is_mine` in `support_tickets_insert_own`), so a
 * hand-made request linking somebody else's booking is refused there too.
 *
 * Every read fails soft into an empty group: the picker is optional, and a
 * booking list that did not load must never stop somebody reaching a person.
 */

type Client = SupabaseClient<Database>;

const PER_KIND = 15;

function day(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00+01:00` : iso);
  if (Number.isNaN(date.getTime())) return "";
  return formatDate(date, locale, { day: "numeric", month: "short", timeZone: "Africa/Lagos" });
}

/** Status words from the database, made readable without inventing meaning. */
function words(status: string | null | undefined): string {
  if (!status) return "";
  const flat = status.replace(/_/g, " ").toLowerCase();
  return flat.charAt(0).toUpperCase() + flat.slice(1);
}

async function titles(client: Client, ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const { data } = await client.from("listings").select("id, title").in("id", unique);
  return new Map((data ?? []).map((row) => [row.id, row.title?.trim() || "A property"]));
}

type Only = { kind: RelatedKind; id: string } | undefined;

async function bookings(client: Client, userId: string, locale: Locale, only: Only): Promise<RelatedRecord[]> {
  if (only && only.kind !== "booking") return [];
  let query = client
    .from("bookings")
    .select("id, listing_id, check_in, check_out, status")
    .eq("guest_id", userId)
    .order("created_at", { ascending: false })
    .limit(PER_KIND);
  if (only) query = query.eq("id", only.id);
  const { data, error } = await query;
  if (error || !data) return [];
  /* A hotel-room booking or agreement has no listing (ROOM BOOKINGS 1). */
  const names = await titles(client, data.map((row) => row.listing_id).filter((id): id is string => Boolean(id)));
  return data.map((row) => ({
    kind: "booking",
    id: row.id,
    label: `${(row.listing_id && names.get(row.listing_id)) || "A property"}, ${day(row.check_in, locale)} to ${day(row.check_out, locale)}`,
    sub: words(row.status),
  }));
}

async function agreements(client: Client, userId: string, only: Only): Promise<RelatedRecord[]> {
  if (only && only.kind !== "agreement") return [];
  let query = client
    .from("deal_agreements")
    .select("id, kind, status, listing_id, renter_id, owner_id")
    .or(`renter_id.eq.${userId},owner_id.eq.${userId}`)
    .order("updated_at", { ascending: false })
    .limit(PER_KIND);
  if (only) query = query.eq("id", only.id);
  const { data, error } = await query;
  if (error || !data) return [];
  /* A hotel-room booking or agreement has no listing (ROOM BOOKINGS 1). */
  const names = await titles(client, data.map((row) => row.listing_id).filter((id): id is string => Boolean(id)));
  return data.map((row) => ({
    kind: "agreement",
    id: row.id,
    label: `${row.kind === "stay" ? "Stay" : "Rent"} agreement, ${(row.listing_id && names.get(row.listing_id)) || "A property"}`,
    sub: words(row.status),
  }));
}

async function listings(client: Client, userId: string, only: Only): Promise<RelatedRecord[]> {
  if (only && only.kind !== "listing") return [];
  const { data: agents, error: agentError } = await client.from("agents").select("id").eq("user_id", userId);
  if (agentError || !agents || agents.length === 0) return [];
  let query = client
    .from("listings")
    .select("id, title, status, reference, area")
    .in(
      "agent_id",
      agents.map((agent) => agent.id),
    )
    .order("updated_at", { ascending: false })
    .limit(PER_KIND);
  if (only) query = query.eq("id", only.id);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => ({
    kind: "listing",
    id: row.id,
    label: row.title?.trim() || "Untitled listing",
    sub: [row.reference, row.area, words(row.status)].filter(Boolean).join(" · "),
  }));
}

async function payments(client: Client, userId: string, locale: Locale, only: Only): Promise<RelatedRecord[]> {
  if (only && only.kind !== "payment") return [];
  /* `transactions_guest_select` already limits this to payments on the
     member's own bookings; the join below keeps it that way on its face. */
  let query = client
    .from("transactions")
    .select("id, provider_ref, amount_minor, currency, status, created_at, bookings!inner(guest_id)")
    .eq("bookings.guest_id", userId)
    .order("created_at", { ascending: false })
    .limit(PER_KIND);
  if (only) query = query.eq("id", only.id);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => ({
    kind: "payment",
    id: row.id,
    label: `Payment of ${formatMoney(row.amount_minor, locale, row.currency || "NGN")}, ${day(row.created_at, locale)}`,
    sub: [row.provider_ref ? `Ref ${row.provider_ref}` : "", words(row.status)].filter(Boolean).join(" · "),
  }));
}

async function inspections(client: Client, userId: string, locale: Locale, only: Only): Promise<RelatedRecord[]> {
  if (only && only.kind !== "inspection") return [];
  let query = client
    .from("inspection_requests")
    .select("id, listing_id, state, slot_at, requested_at")
    .or(`requester_id.eq.${userId},lister_id.eq.${userId}`)
    .order("requested_at", { ascending: false })
    .limit(PER_KIND);
  if (only) query = query.eq("id", only.id);
  const { data, error } = await query;
  if (error || !data) return [];
  /* A hotel-room booking or agreement has no listing (ROOM BOOKINGS 1). */
  const names = await titles(client, data.map((row) => row.listing_id).filter((id): id is string => Boolean(id)));
  return data.map((row) => ({
    kind: "inspection",
    id: row.id,
    label: `Inspection, ${(row.listing_id && names.get(row.listing_id)) || "A property"}`,
    sub: [day(row.slot_at ?? row.requested_at, locale), words(row.state)].filter(Boolean).join(" · "),
  }));
}

async function settle(work: Promise<RelatedRecord[]>): Promise<RelatedRecord[]> {
  try {
    return await work;
  } catch {
    return [];
  }
}

/** Every record the member could link, grouped by kind in `RELATED_KINDS` order. */
export async function loadMyRelatedRecords(client: Client, userId: string, locale: Locale): Promise<RelatedRecord[]> {
  const groups = await Promise.all([
    settle(bookings(client, userId, locale, undefined)),
    settle(agreements(client, userId, undefined)),
    settle(listings(client, userId, undefined)),
    settle(payments(client, userId, locale, undefined)),
    settle(inspections(client, userId, locale, undefined)),
  ]);
  return groups.flat();
}

/** One record by kind and id, or null when it is not the member's. The label is rebuilt here, never trusted from the client. */
export async function readMyRelatedRecord(
  client: Client,
  userId: string,
  locale: Locale,
  kind: RelatedKind,
  id: string,
): Promise<RelatedRecord | null> {
  const only = { kind, id };
  const found = await settle(
    kind === "booking"
      ? bookings(client, userId, locale, only)
      : kind === "agreement"
        ? agreements(client, userId, only)
        : kind === "listing"
          ? listings(client, userId, only)
          : kind === "payment"
            ? payments(client, userId, locale, only)
            : inspections(client, userId, locale, only),
  );
  return found[0] ?? null;
}
