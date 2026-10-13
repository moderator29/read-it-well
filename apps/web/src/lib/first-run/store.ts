import "server-only";

import { resolveSession } from "../actions/session";
import { markFirstRun, readFirstRun, type FirstRunAnswer, type FirstRunDb } from "./core";

/**
 * W7-R1 (read) and W7-R2 (write), for Session 3's first-run gate.
 *
 * Replace the two stub bodies in
 * Session 3's first-run store module (on the experience branch) with:
 *
 *   async read(feature) { return readFirstRunSeen(feature); },
 *   async mark(feature) { await markFirstRunSeen(feature); },
 *
 * Both run as the signed-in member under RLS on `public.first_runs_seen`
 * (`supabase/migrations/pending/b4_first_run_store.sql`). Until that migration
 * is applied every read answers "unknown" and the device cookie decides, which
 * is exactly how the stub behaves today.
 */

type Loose = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (k: string, v: string) => {
        eq: (k: string, v: string) => { maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }> };
      };
    };
  };
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

async function sessionDb(): Promise<FirstRunDb> {
  const session = await resolveSession();
  const signedIn = session.state === "signed-in" ? session : null;
  const db = signedIn ? (signedIn.supabase as unknown as Loose) : null;
  return {
    async userId() {
      return signedIn ? signedIn.user.id : null;
    },
    async hasRow(userId, feature) {
      if (!db) throw new Error("signed out");
      const { data, error } = await db
        .from("first_runs_seen")
        .select("feature")
        .eq("user_id", userId)
        .eq("feature", feature)
        .maybeSingle();
      if (error) throw new Error("read failed");
      return Boolean(data);
    },
    async mark(feature) {
      if (!db) throw new Error("signed out");
      const { error } = await db.rpc("mark_first_run_seen", { p_feature: feature });
      if (error) throw new Error("write failed");
    },
  };
}

export async function readFirstRunSeen(feature: string): Promise<FirstRunAnswer> {
  try {
    return await readFirstRun(await sessionDb(), feature);
  } catch {
    return "unknown";
  }
}

/** Server action body: record that the signed-in member was shown this first run. Never throws. */
export async function markFirstRunSeen(feature: string): Promise<void> {
  try {
    await markFirstRun(await sessionDb(), feature);
  } catch {
    /* never throws */
  }
}
