import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";

/**
 * The thread-context columns M10 added to public.conversations, typed here
 * until `database.types.ts` is regenerated.
 *
 * The generated types are produced by a tool, not edited by hand, and nothing
 * regenerates them automatically (the note in admin/kyc-actions.ts is the scar
 * from assuming otherwise). Rather than cast every query to `any`, this module
 * describes exactly the three columns the migration added, on top of the
 * generated table shape, and hands back the same client with that knowledge.
 * When the types are regenerated this file becomes a one-line re-export and
 * every call site keeps compiling.
 *
 * Nothing here reaches the browser: it is a type and a cast.
 */

/** Mirrors `public.thread_context`. Every row before M10 is a listing thread. */
export type ThreadContextKind = "listing" | "reservation" | "booking";

type Generated = Database["public"]["Tables"]["conversations"];

type ContextColumns = {
  context_kind: ThreadContextKind;
  reservation_id: string | null;
  booking_id: string | null;
};

export type ConversationsTable = {
  Row: Generated["Row"] & ContextColumns;
  Insert: Generated["Insert"] & Partial<ContextColumns>;
  Update: Generated["Update"] & Partial<ContextColumns>;
  Relationships: [
    ...Generated["Relationships"],
    {
      foreignKeyName: "conversations_reservation_id_fkey";
      columns: ["reservation_id"];
      isOneToOne: true;
      referencedRelation: "reservations";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "conversations_booking_id_fkey";
      columns: ["booking_id"];
      isOneToOne: true;
      referencedRelation: "bookings";
      referencedColumns: ["id"];
    },
  ];
};

export type MessagesDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Omit<Database["public"]["Tables"], "conversations"> & {
      conversations: ConversationsTable;
    };
  };
};

/** The same request-scoped client, aware of the thread-context columns. */
export function withThreadContext(
  client: SupabaseClient<Database>,
): SupabaseClient<MessagesDatabase> {
  return client as unknown as SupabaseClient<MessagesDatabase>;
}
