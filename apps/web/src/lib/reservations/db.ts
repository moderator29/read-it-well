import "server-only";

import type { Database } from "../supabase/database.types";

/**
 * The reservation shapes this module reads, taken straight from the generated
 * `Database` type.
 *
 * This file used to carry a hand-written twin of the reservations table and a
 * cast that narrowed the caller's client to it, because `database.types.ts`
 * did not know `reservations.conversation_id` until the b3 migration was
 * applied and the types regenerated. Both have happened, so the cast is
 * retired: every read and write in lib/reservations now goes through the
 * caller's own RLS-bound `SupabaseClient<Database>` with no narrowing at all,
 * and a column the schema loses is a compile error here rather than a runtime
 * surprise.
 */

export type ReservationStatus = Database["public"]["Enums"]["booking_status"];

export type ReservationRow = Database["public"]["Tables"]["reservations"]["Row"];
