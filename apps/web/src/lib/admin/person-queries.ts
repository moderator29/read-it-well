import "server-only";

import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { readPersonFile, type PersonFile } from "./person-file";

/** V-90: one person's file. Opening it writes an audit row inside the database. */
export async function readPerson(userId: string): Promise<PersonFile> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return { state: "unknown" };
  if (!isSupabaseConfigured()) return { state: "failed" };
  try {
    const db = await createClient();
    const { data, error } = await (db as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
    }).rpc("admin_person_file", { p_user: userId });
    return error ? { state: "failed" } : readPersonFile(data);
  } catch {
    return { state: "failed" };
  }
}
