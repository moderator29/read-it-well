import { existsSync, readFileSync, readdirSync } from "node:fs";

/**
 * TESTS ONLY. The VC1 migration's text, wherever it is: still pending, or
 * recorded under the version the database stamped. The calls tests read the
 * database's own tables (legal moves, timeouts, scopes, rate limits) out of
 * it, so the TypeScript mirrors cannot drift from what the database enforces.
 */
export function vc1Migration(): string {
  const root = new URL("../../../../../../supabase/migrations/", import.meta.url);
  const pending = new URL("pending/vc1_video_calls.sql", root);
  if (existsSync(pending)) return readFileSync(pending, "utf8");
  const applied = readdirSync(root).find((f) => /^\d{14}_vc1_video_calls\.sql$/.test(f));
  if (!applied) throw new Error("the VC1 migration is neither pending nor recorded");
  return readFileSync(new URL(applied, root), "utf8");
}
