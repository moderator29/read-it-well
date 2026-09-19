import "server-only";

import { resolveSession } from "../actions/session";
import { asRecord, callDeletionRpc } from "../account-deletion/rpc";

/**
 * What the handover screen reads, in one place.
 *
 * EVERY READ GOES THROUGH THE CALLER'S OWN RLS-BOUND CLIENT. `businesses`
 * scopes rows by `owner_id` under `businesses_owner_all`, `accommodations` and
 * `reservations` scope through the business they hang off, and
 * `public.business_transfer_board` is SECURITY DEFINER with the same
 * self-only guard `public.account_deletion_blockers` carries. Nothing here
 * uses the service role, so this screen can never become a door onto another
 * host's diary.
 *
 * NEVER THROWS. A host who cannot leave because a business is in the way is
 * standing in front of this screen at the worst possible moment. A failed read
 * comes back as an empty list and an honest flag rather than an error page,
 * for the same reason `lib/account-deletion/queries.ts` never throws: taking a
 * working screen away to protect a control nobody was using yet is the wrong
 * trade.
 *
 * THE TRANSFER TABLE IS READ THROUGH THE UNTYPED POSTGREST DOOR, on the
 * precedent `lib/account-deletion/rpc.ts` sets and for the same reason:
 * `lib/supabase/database.types.ts` does not carry
 * `public.business_transfers` until the LEAD regenerates it after applying the
 * migration, and a worker who edited the generated types by hand would be
 * inventing a schema.
 */

export type TransferableBusiness = {
  id: string;
  name: string;
  kind: string;
  status: string;
  verified: boolean;
  /**
   * True when a stranger can still transact against it: findable, bookable, or
   * expected tonight. These are the ones that stand between the owner and a
   * deletion, and the ones the screen puts first.
   */
  stillTrading: boolean;
  /** Published accommodations under it, which is the "close it" checklist. */
  publishedRooms: number;
  /** Tables still to come, which is the other half of that checklist. */
  futureReservations: number;
};

export type TransferOffer = {
  transferId: string;
  businessId: string;
  businessName: string;
  status: string;
  offeredAt: string;
  expiresAt: string;
  note: string | null;
  /** The other party's public handle, never an address and never a number. */
  counterpartyHandle: string | null;
};

export type TransferScreen = {
  state: "signed-out" | "ready";
  businesses: TransferableBusiness[];
  outgoing: TransferOffer[];
  incoming: TransferOffer[];
  /** True when a read failed, so the screen can say so instead of lying by omission. */
  partial: boolean;
};

const SIGNED_OUT: TransferScreen = {
  state: "signed-out",
  businesses: [],
  outgoing: [],
  incoming: [],
  partial: false,
};

function offersFrom(value: unknown): TransferOffer[] {
  if (!Array.isArray(value)) return [];
  const out: TransferOffer[] = [];
  for (const entry of value) {
    const row = asRecord(entry);
    const transferId = row["transfer_id"];
    const businessId = row["business_id"];
    if (typeof transferId !== "string" || typeof businessId !== "string") continue;
    out.push({
      transferId,
      businessId,
      businessName: typeof row["business_name"] === "string" ? row["business_name"] : "",
      status: typeof row["status"] === "string" ? row["status"] : "PENDING",
      offeredAt: typeof row["offered_at"] === "string" ? row["offered_at"] : "",
      expiresAt: typeof row["expires_at"] === "string" ? row["expires_at"] : "",
      note: typeof row["note"] === "string" ? row["note"] : null,
      counterpartyHandle:
        typeof row["counterparty_handle"] === "string" ? row["counterparty_handle"] : null,
    });
  }
  return out;
}

export async function readTransferScreen(): Promise<TransferScreen> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return SIGNED_OUT;

  const { supabase, user } = session;
  let partial = false;

  const [ownRows, boardAnswer] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, name, kind, status, verified, source")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true }),
    callDeletionRpc(supabase, "business_transfer_board", { p_user: user.id }),
  ]);

  if (ownRows.error) partial = true;
  const owned = (ownRows.data ?? []).filter((row) => row.source === "first_party");
  const ids = owned.map((row) => row.id);

  // The two reads that turn "a business" into "a business a stranger can still
  // transact against". Asked only when there is something to ask about.
  const rooms = new Map<string, number>();
  const tables = new Map<string, number>();
  if (ids.length > 0) {
    const [roomRows, tableRows] = await Promise.all([
      supabase
        .from("accommodations")
        .select("id, business_id, status")
        .in("business_id", ids)
        .eq("status", "PUBLISHED"),
      supabase
        .from("reservations")
        .select("id, business_id, status, reserved_for")
        .in("business_id", ids)
        .in("status", ["PENDING", "CONFIRMED"])
        .gte("reserved_for", new Date().toISOString()),
    ]);
    if (roomRows.error || tableRows.error) partial = true;
    for (const row of roomRows.data ?? []) {
      if (!row.business_id) continue;
      rooms.set(row.business_id, (rooms.get(row.business_id) ?? 0) + 1);
    }
    for (const row of tableRows.data ?? []) {
      if (!row.business_id) continue;
      tables.set(row.business_id, (tables.get(row.business_id) ?? 0) + 1);
    }
  }

  const businesses: TransferableBusiness[] = owned.map((row) => {
    const publishedRooms = rooms.get(row.id) ?? 0;
    const futureReservations = tables.get(row.id) ?? 0;
    return {
      id: row.id,
      name: row.name,
      kind: String(row.kind),
      status: String(row.status),
      verified: Boolean(row.verified),
      stillTrading:
        String(row.status) === "PUBLISHED" || publishedRooms > 0 || futureReservations > 0,
      publishedRooms,
      futureReservations,
    };
  });

  // Still-trading first: those are the ones in the way.
  businesses.sort((a, b) => Number(b.stillTrading) - Number(a.stillTrading));

  if (!boardAnswer.ok) partial = true;
  const board = boardAnswer.ok ? asRecord(boardAnswer.data) : {};

  return {
    state: "ready",
    businesses,
    outgoing: offersFrom(board["outgoing"]),
    incoming: offersFrom(board["incoming"]),
    partial,
  };
}
