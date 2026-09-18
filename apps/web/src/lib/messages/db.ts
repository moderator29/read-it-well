import type { Database } from "../supabase/database.types";

/**
 * The thread-context vocabulary, read from the generated types so the union
 * and the enum can never disagree. Every row before M10 is a listing thread.
 */
export type ThreadContextKind = Database["public"]["Enums"]["thread_context"];
