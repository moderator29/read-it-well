import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * TAKING A DEVICE BACK, WRITTEN ONCE FOR THE TWO DOORS THAT DO IT.
 *
 * ===========================================================================
 * WHY THE SERVICE ROLE AND NOT THE PERSON'S OWN CLIENT.
 *
 * `push_tokens` has a SELECT policy and NO insert, update or delete policy,
 * and `20260923092729` records that as the design rather than an omission:
 * with row level security on and no policy, every write is refused. A person
 * can read their devices and cannot write to the table at all, which is what
 * makes the read safe to hand straight to a browser.
 *
 * So the retirement is a service-role write, and the ownership filter is
 * therefore this code's responsibility rather than the database's. It is in
 * ONE place for exactly that reason. Two call sites that each wrote their own
 * `.eq("user_id", ...)` would be two chances to leave it out, and leaving it
 * out on a service-role client retires the whole platform's devices.
 *
 * ===========================================================================
 * RETIRED, NOT DELETED.
 *
 * `revoked_at` and a reason are set. A delete would lose the fact that it was
 * the PERSON who turned it off, which matters: re-registering from that
 * handset afterwards is then a deliberate act rather than a bug, and the
 * difference is visible in the row.
 */

export type RevokeTarget = { deviceId: string } | { all: true };

export type RevokeOutcome =
  /** How many live rows were retired. Zero is a legitimate answer. */
  | { ok: true; revoked: number }
  | { ok: false; reason: "not_saved" };

/**
 * Retire one device, or every device, for one person.
 *
 * `userId` comes from a verified session at both call sites and never from a
 * request body. A person naming somebody else's device id changes nothing and
 * is answered with `revoked: 0`, which is the same answer as naming a device
 * that was already off. THE TWO MUST NOT BE DISTINGUISHABLE: an endpoint that
 * answered differently would be a way to ask whether a given device id exists.
 */
export async function revokeTokens(
  userId: string,
  target: RevokeTarget,
): Promise<RevokeOutcome> {
  const admin = createAdminClient();

  const query = admin
    .from("push_tokens")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_reason: "by_person" as const,
    })
    /* THE OWNERSHIP FILTER. Not optional, on either branch. */
    .eq("user_id", userId)
    /* Already retired rows are left alone, so `revoked_at` keeps saying when
       it actually happened rather than when somebody last pressed the
       button. */
    .is("revoked_at", null);

  const { data, error } =
    "all" in target ? await query.select("id") : await query.eq("id", target.deviceId).select("id");

  if (error) return { ok: false, reason: "not_saved" };
  /* The COUNT, never the ids, and never the rows. A row of this table carries
     a token. */
  return { ok: true, revoked: (data ?? []).length };
}
