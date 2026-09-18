import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";

/**
 * public.saved_places (M13), typed here until `database.types.ts` is
 * regenerated. Same shape and same reason as lib/messages/db.ts.
 */

/** Mirrors the CHECK on saved_places.entity_kind: the catalogue's three shelves. */
export type SavedPlaceKind = "listing" | "accommodation" | "restaurant";

export const SAVED_PLACE_KINDS: readonly SavedPlaceKind[] = [
  "listing",
  "accommodation",
  "restaurant",
] as const;

export type SavedPlaceRow = {
  user_id: string;
  entity_kind: SavedPlaceKind;
  entity_id: string;
  created_at: string;
};

export type SavedPlacesTable = {
  Row: SavedPlaceRow;
  Insert: Omit<SavedPlaceRow, "created_at"> & { created_at?: string };
  Update: Partial<SavedPlaceRow>;
  Relationships: [];
};

export type SavedDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & { saved_places: SavedPlacesTable };
  };
};

/** The same request-scoped client, aware of saved_places. */
export function withSavedPlaces(client: SupabaseClient<Database>): SupabaseClient<SavedDatabase> {
  return client as unknown as SupabaseClient<SavedDatabase>;
}
