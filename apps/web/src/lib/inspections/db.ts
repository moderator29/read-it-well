import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import type { InspectionOutcome } from "./types";

/**
 * The `outcome` column M11 added to public.inspection_requests, typed here
 * until `database.types.ts` is regenerated. Same shape and same reason as
 * lib/messages/db.ts: describe exactly the column the migration added on top
 * of the generated table, hand back the same client, delete this file when
 * the types catch up.
 */

type Generated = Database["public"]["Tables"]["inspection_requests"];

type OutcomeColumn = { outcome: InspectionOutcome | null };

export type InspectionRequestsTable = {
  Row: Generated["Row"] & OutcomeColumn;
  Insert: Generated["Insert"] & Partial<OutcomeColumn>;
  Update: Generated["Update"] & Partial<OutcomeColumn>;
  Relationships: Generated["Relationships"];
};

export type InspectionsDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Omit<Database["public"]["Tables"], "inspection_requests"> & {
      inspection_requests: InspectionRequestsTable;
    };
  };
};

/** The same request-scoped client, aware of the outcome column. */
export function withInspectionOutcome(
  client: SupabaseClient<Database>,
): SupabaseClient<InspectionsDatabase> {
  return client as unknown as SupabaseClient<InspectionsDatabase>;
}
