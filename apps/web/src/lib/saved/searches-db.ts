import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * `public.saved_searches` as this build types it, and why the generated type
 * is not used.
 *
 * The table has existed since the engagement migration with five columns and
 * an owner-only RLS policy. This build adds five more, additively, in
 * `supabase/migrations/20260919183000_o2_a_saved_search_can_be_named_watched_and_told_about.sql`:
 * a canonical key, an updated stamp and the three alert stamps. The lead
 * applies that migration and regenerates `lib/supabase/database.types.ts`
 * afterwards, so between those two moments the generated type describes five
 * columns and the database has ten.
 *
 * `lib/stays/db.ts` met the same gap and answered it the same way: carry the
 * small schema the module needs, cast the client to it ONCE, and keep every
 * query below the cast typed. The alternative, hand-editing the generated
 * file, is somebody else's scope and would be overwritten by the next
 * generation run.
 *
 * WHEN THE TYPES ARE REGENERATED this file becomes a re-export of the
 * generated row and the cast goes. Nothing else has to move.
 */

/** One row, with every column the alert loop and the list screen read. */
export type SavedSearchRow = {
  id: string;
  user_id: string;
  /** What the person called it. Null means nobody named it. */
  label: string | null;
  /** The canonical parameters. `lib/saved/searches.ts` reads it defensively. */
  query: unknown;
  /** The canonical query string, unique per account. */
  query_key: string | null;
  alert_enabled: boolean;
  /**
   * The watermark: matches are listings published STRICTLY AFTER this. Set
   * when alerts are switched on, so switching on never posts the back
   * catalogue, and moved forward by the job as it reads.
   */
  alert_cursor_at: string | null;
  /** When the job last looked at this row, whether or not it matched. */
  alert_checked_at: string | null;
  /** When this row last produced a notification. */
  alert_notified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SavedSearchInsert = {
  user_id: string;
  label?: string | null;
  query?: unknown;
  query_key?: string | null;
  alert_enabled?: boolean;
  alert_cursor_at?: string | null;
};

export type SavedSearchUpdate = {
  label?: string | null;
  alert_enabled?: boolean;
  alert_cursor_at?: string | null;
  alert_checked_at?: string | null;
  alert_notified_at?: string | null;
};

/** Every column, in one string, so two readers cannot select different sets. */
export const SAVED_SEARCH_COLUMNS =
  "id, user_id, label, query, query_key, alert_enabled, alert_cursor_at, alert_checked_at, alert_notified_at, created_at, updated_at";

export type SavedSearchesDatabase = {
  public: {
    Tables: {
      saved_searches: {
        Row: SavedSearchRow;
        Insert: SavedSearchInsert;
        Update: SavedSearchUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type SavedSearchesClient = SupabaseClient<SavedSearchesDatabase>;

/**
 * The caller's OWN client, typed for this table.
 *
 * It is the request-scoped anon-key client, so every read and write below it
 * runs as the signed-in person and `saved_searches_own` decides what they may
 * touch. Nothing in the action layer decides whose row it is; the policy does,
 * and an id belonging to somebody else comes back as zero rows rather than as
 * a refusal this code wrote.
 */
export function asSavedSearches(client: unknown): SavedSearchesClient {
  return client as SavedSearchesClient;
}
