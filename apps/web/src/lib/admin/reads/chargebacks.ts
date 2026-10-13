import "server-only";

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../supabase/database.types";
import { createAdminClient } from "../../supabase/admin";
import { requireAdmin } from "../guard";
import { UNAVAILABLE, type Read } from "./shared";
import {
  baseFromRpc,
  countChargebacks,
  entryFromAudit,
  entryFromEvent,
  isMissingFunction,
  isUndecided,
  type ChargebackBase,
  type ChargebackCounts,
  type ChargebackRow,
  type TimelineEntry,
} from "./chargebacks-model";

export * from "./chargebacks-model";

/**
 * THE CHARGEBACKS DESK'S READS (`/admin/chargebacks`).
 *
 * WHO MAY READ IS THE DATABASE'S ANSWER, NOT OURS. `public.staff_chargebacks`
 * checks `private.staff_can(auth.uid(), 'finance')`: an admin or super admin,
 * or a staff member holding the finance scope with the current handbook
 * acknowledged, on a session that proved its security key. So the list is
 * read on the caller's OWN client (`userClient`), never the service role:
 * the service role has no auth.uid() and would be refused, and must never be
 * the way round the check. `requireAdmin("finance")` decides the screen first
 * (the same people), and the function decides the rows.
 *
 * ONLY AFTER THE FUNCTION ANSWERED does the desk read, on the service client,
 * the facts around each charge a finance desk needs: the stay or agreement it
 * paid for, the payer, the listing title and the two display names. The
 * chargeback tables themselves are closed to every app role; nothing here
 * touches them.
 *
 * THE TIMELINE comes from the draft `public.staff_chargeback_events` (cb01).
 * Until that is applied, the audit rows the chargeback functions already write
 * are the timeline (states and totals, no notes), and the page says so.
 */

type Db = SupabaseClient<Database>;
type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }> };

type Door = { user: Db; service: Db };

async function financeDoor(): Promise<Door | null> {
  const access = await requireAdmin("finance");
  if (access.state !== "admin") return null;
  try {
    return { user: access.userClient, service: createAdminClient() };
  } catch {
    return null;
  }
}

async function readBase(user: Db): Promise<ChargebackBase[] | null> {
  const { data, error } = await (user as unknown as Rpc).rpc("staff_chargebacks");
  if (error || !Array.isArray(data)) return null;
  return data.map(baseFromRpc).filter((row): row is ChargebackBase => row !== null);
}

async function namesFor(db: Db, ids: (string | null)[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const wanted = [...new Set(ids.filter((id): id is string => !!id))];
  if (wanted.length === 0) return names;
  const { data } = await db.from("profiles").select("id, display_name").in("id", wanted);
  for (const row of data ?? []) {
    const name = (row.display_name ?? "").trim();
    if (name.length > 0) names.set(row.id, name);
  }
  return names;
}

/** The charge facts around each row: stay or agreement, payer, listing, names. */
async function decorate(db: Db, rows: ChargebackBase[]): Promise<ChargebackRow[]> {
  if (rows.length === 0) return [];
  const txIds = [...new Set(rows.map((row) => row.transactionId).filter(Boolean))];
  const { data: txs } = await db
    .from("transactions")
    .select("id, booking_id, agreement_id, share_payer_id")
    .in("id", txIds);
  const tx = new Map((txs ?? []).map((t) => [t.id, t]));
  const bookingIds = [...new Set((txs ?? []).map((t) => t.booking_id).filter((id): id is string => !!id))];
  const agreementIds = [...new Set((txs ?? []).map((t) => t.agreement_id).filter((id): id is string => !!id))];
  const [bookings, agreements] = await Promise.all([
    bookingIds.length > 0
      ? db.from("bookings").select("id, guest_id, listing_id").in("id", bookingIds)
      : Promise.resolve({ data: [] as { id: string; guest_id: string; listing_id: string | null }[] }),
    agreementIds.length > 0
      ? db.from("deal_agreements").select("id, renter_id, listing_id").in("id", agreementIds)
      : Promise.resolve({ data: [] as { id: string; renter_id: string; listing_id: string | null }[] }),
  ]);
  const booking = new Map((bookings.data ?? []).map((b) => [b.id, b]));
  const agreement = new Map((agreements.data ?? []).map((a) => [a.id, a]));
  const listingIds = [
    ...new Set(
      [...(bookings.data ?? []).map((b) => b.listing_id), ...(agreements.data ?? []).map((a) => a.listing_id)].filter(
        (id): id is string => !!id,
      ),
    ),
  ];
  const { data: listings } = listingIds.length > 0 ? await db.from("listings").select("id, title").in("id", listingIds) : { data: [] };
  const title = new Map((listings ?? []).map((l) => [l.id, l.title]));

  const payerOf = (row: ChargebackBase): { payerId: string | null; bookingId: string | null; agreementId: string | null; listingId: string | null } => {
    const t = tx.get(row.transactionId);
    const b = t?.booking_id ? booking.get(t.booking_id) : undefined;
    const a = t?.agreement_id ? agreement.get(t.agreement_id) : undefined;
    return {
      payerId: t?.share_payer_id ?? b?.guest_id ?? a?.renter_id ?? null,
      bookingId: t?.booking_id ?? null,
      agreementId: t?.agreement_id ?? null,
      listingId: b?.listing_id ?? a?.listing_id ?? null,
    };
  };
  const facts = rows.map(payerOf);
  const names = await namesFor(db, [...rows.map((row) => row.listerId), ...facts.map((f) => f.payerId)]);
  return rows.map((row, i) => {
    const f = facts[i]!;
    return {
      ...row,
      bookingId: f.bookingId,
      agreementId: f.agreementId,
      payerId: f.payerId,
      payerName: f.payerId ? (names.get(f.payerId) ?? null) : null,
      listerName: row.listerId ? (names.get(row.listerId) ?? null) : null,
      listingTitle: f.listingId ? (title.get(f.listingId) ?? null) : null,
    };
  });
}

export type ChargebackDesk = { rows: ChargebackRow[]; counts: ChargebackCounts };

/** Every chargeback, decorated, with the counts per state. */
export async function getChargebackDesk(): Promise<Read<ChargebackDesk>> {
  const door = await financeDoor();
  if (!door) return UNAVAILABLE;
  try {
    const base = await readBase(door.user);
    if (!base) return UNAVAILABLE;
    const rows = await decorate(door.service, base);
    return { state: "ok", data: { rows, counts: countChargebacks(rows) } };
  } catch {
    return UNAVAILABLE;
  }
}

export type ChargebackDetail = {
  row: ChargebackRow;
  timeline: TimelineEntry[];
  /** "events" when read from the draft timeline (notes included), "audit" from the audit log. */
  timelineSource: "events" | "audit";
  /** The draft note function exists (it lands with the timeline read). */
  notesOpen: boolean;
};

async function readTimeline(door: Door, row: ChargebackBase): Promise<{ entries: TimelineEntry[]; source: "events" | "audit" }> {
  const { data, error } = await (door.user as unknown as Rpc).rpc("staff_chargeback_events", { p_chargeback: row.id });
  if (!error && Array.isArray(data)) {
    return { entries: data.map(entryFromEvent).filter((e): e is TimelineEntry => e !== null), source: "events" };
  }
  if (error && !isMissingFunction(error)) throw new Error("timeline unreadable");
  const { data: audit } = await door.service
    .from("audit_log")
    .select("id, actor_id, action, metadata, created_at")
    .eq("entity_type", "chargeback")
    .eq("entity_id", row.id)
    .order("created_at", { ascending: true });
  return {
    entries: (audit ?? []).map((a) => entryFromAudit(a, row.state)).filter((e): e is TimelineEntry => e !== null),
    source: "audit",
  };
}

/** One chargeback with its timeline, or null when there is none by that id. */
export async function getChargebackDetail(id: string): Promise<Read<ChargebackDetail | null>> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { state: "ok", data: null };
  const door = await financeDoor();
  if (!door) return UNAVAILABLE;
  try {
    const base = await readBase(door.user);
    if (!base) return UNAVAILABLE;
    const found = base.find((row) => row.id === id);
    if (!found) return { state: "ok", data: null };
    const [[row], timeline] = await Promise.all([decorate(door.service, [found]), readTimeline(door, found)]);
    const names = await namesFor(door.service, timeline.entries.map((e) => e.actorId));
    const entries = timeline.entries.map((e) => ({ ...e, actorName: e.actorId ? (names.get(e.actorId) ?? null) : null }));
    return {
      state: "ok",
      data: { row: row!, timeline: entries, timelineSource: timeline.source, notesOpen: timeline.source === "events" },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/** The chargebacks on one stay's payments, for the stay's console page. Null when the caller is not finance. */
export async function getBookingChargebacks(bookingId: string): Promise<Read<ChargebackRow[]> | null> {
  const door = await financeDoor();
  if (!door) return null;
  try {
    const base = await readBase(door.user);
    if (!base) return UNAVAILABLE;
    const rows = await decorate(door.service, base);
    return { state: "ok", data: rows.filter((row) => row.bookingId === bookingId) };
  } catch {
    return UNAVAILABLE;
  }
}

/**
 * The rail's badge: chargebacks not yet decided. Read once per request, on
 * the caller's own client, so a person without finance reads nothing (the
 * function refuses them) and the badge is simply absent.
 */
export const getOpenChargebackCount = cache(async (user: Db | null): Promise<number> => {
  if (!user) return 0;
  try {
    const base = await readBase(user);
    return base ? base.filter((row) => isUndecided(row.state)).length : 0;
  } catch {
    return 0;
  }
});
