import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * THE PUSH ENUMS, AND THE CAST THAT USED TO BE HERE AND IS NOW GONE.
 *
 * ===========================================================================
 * WHAT THIS FILE USED TO BE, AND WHY IT IS NOT THAT ANY MORE.
 *
 * `push_tokens`, `push_queue` and `push_deliveries` landed on 23 September
 * and `lib/supabase/database.types.ts` did not know about them, so this file
 * described the three tables by hand and cast the Supabase client to a
 * private view of them in one named function. Its own header said that cast
 * would delete itself the day somebody regenerated the shared file. R-P2 in
 * `docs/BUILD_07_LEDGER.md` was the request to do that.
 *
 * The push half of that regeneration has landed: the three tables, the
 * `push_queue_health` view and the five push enums are now in the generated
 * file, taken verbatim from `mcp__Supabase__generate_typescript_types` on the
 * live project. **The hand-written table descriptions are gone and the cast
 * is gone with them.** Every push query is now checked against the schema the
 * database actually has, and a column renamed in a migration is a compile
 * error here rather than a PostgREST error at three in the morning.
 *
 * ===========================================================================
 * WHY THE REGENERATION WAS PARTIAL, MEASURED RATHER THAN GUESSED.
 *
 * A FULL regeneration was produced and run against `origin/main` in an
 * isolated worktree, and it does not compile: the live database is ahead of
 * four hand-written unions in the application, and widening them to match
 * fires three exhaustiveness guards that were built to fire. Ten compile
 * errors in total. Five of them are in `components/app/wallet/**`, which is
 * Session B's, plus the four locale dictionaries. **Landing the full file
 * today would have taken main red in somebody else's files and left it there
 * until they acted**, so the push half landed and the rest is a request with
 * the exact list beside it. That list is in the ledger and in section 49.
 *
 * ===========================================================================
 * WHAT IS RE-EXPORTED HERE AND WHY ANY OF IT IS.
 *
 * Only names. Every type below is an alias onto the generated enums, so there
 * is no second source of truth: if a value is added to `push_revoked_reason`
 * in a migration, it appears here the moment the file is regenerated and
 * every `switch` over it stops compiling. The aliases exist because
 * `Database["public"]["Enums"]["push_revoked_reason"]` at forty call sites is
 * noise, not because they add anything.
 */

export type PushPlatform = Database["public"]["Enums"]["push_platform"];
export type PushRevokedReason = Database["public"]["Enums"]["push_revoked_reason"];
export type PushQueueState = Database["public"]["Enums"]["push_queue_state"];
export type PushQueueOutcome = Database["public"]["Enums"]["push_queue_outcome"];
export type PushDeliveryState = Database["public"]["Enums"]["push_delivery_state"];

/**
 * The client every push write uses.
 *
 * NO LONGER A PRIVATE VIEW OF ANYTHING. It is the ordinary generated client,
 * and it is named here only so the drain's twelve helper signatures read as
 * one thing rather than as `SupabaseClient<Database>` repeated. Nothing is
 * cast to reach it and nothing here grants a privilege: whether a given
 * client bypasses row level security is decided by the key it was built with,
 * in `lib/supabase/admin.ts` and `lib/supabase/server.ts`, and never here.
 */
export type PushClient = SupabaseClient<Database>;
