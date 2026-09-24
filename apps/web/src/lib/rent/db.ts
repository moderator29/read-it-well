import "server-only";

import type { Database } from "../supabase/database.types";

/**
 * The rent shapes this module reads, taken from the generated `Database`
 * type, and the one reader that interprets `open_rent_charge`'s answer.
 *
 * This file used to carry a hand-written `rent_payments` table and an
 * `open_rent_charge` signature behind a cast, because the generated types did
 * not know either until the b3 migration was applied and the types
 * regenerated. Both have happened, so the cast is retired: `rent_payments`
 * is read through the caller's own RLS-bound `SupabaseClient<Database>` and
 * the door is called on the service-role client by name, exactly as
 * `pay_booking_from_wallet` is. What stays is the defensive reader below,
 * because the door answers `Json` and a jsonb the database shaped is still
 * somebody else's payload until it has been read.
 */

export type RentPaymentRow = Database["public"]["Tables"]["rent_payments"]["Row"];

/** SUP-09. What a tenant reads when another tenant has already paid for the home. */
export const ALREADY_LET_MESSAGE =
  "This home has already been let to another tenant, so it can no longer be paid for. Nothing was taken from you.";

/** What `public.open_rent_charge` answers. */
export type OpenRentChargeOutcome = {
  status:
    | "ok"
    | "exists"
    | "bad_request"
    | "move_in_past"
    | "not_found"
    | "not_accepted"
    | "not_published"
    | "not_a_rental"
    | "no_lister"
    | "own_listing"
    | "no_amount"
    /* ESC-03: a stay already holds the move-in date. */
    | "date_taken"
    /* SUP-09: another tenant has already paid the move-in total on this home. */
    | "already_let";
  rent_payment_id?: string;
  booking_id?: string;
  total_minor?: number;
  state?: string;
};

/** Reads `open_rent_charge`'s answer defensively: anything else is a service fault. */
export function readOpenOutcome(data: unknown): OpenRentChargeOutcome | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const status = (data as Record<string, unknown>).status;
  if (typeof status !== "string") return null;
  const out: OpenRentChargeOutcome = { status: status as OpenRentChargeOutcome["status"] };
  const record = data as Record<string, unknown>;
  if (typeof record.rent_payment_id === "string") out.rent_payment_id = record.rent_payment_id;
  if (typeof record.booking_id === "string") out.booking_id = record.booking_id;
  if (typeof record.total_minor === "number") out.total_minor = record.total_minor;
  if (typeof record.state === "string") out.state = record.state;
  return out;
}
