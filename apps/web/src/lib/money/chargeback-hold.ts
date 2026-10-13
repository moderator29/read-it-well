import "server-only";

import { cache } from "react";
import { resolveSession } from "../actions/session";
import { createAdminClient } from "../supabase/admin";
import { isMissingFunction } from "../admin/reads/chargebacks-model";
import { NO_HOLD, holdFromPredicate, holdFromSummary, type ChargebackHold } from "./chargeback-hold-model";

export type { ChargebackHold } from "./chargeback-hold-model";

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }> };

/**
 * Does the payout rule hold the signed-in person, and for how much?
 *
 * The draft `my_chargeback_hold()` answers for the caller's own session and
 * nobody else. Until it is applied, the live predicate
 * `lister_chargeback_hold(uuid)` is asked on the service client, which is
 * the only role that may call it, and ONLY ever with the session's own user
 * id, so it answers exactly the question the person could ask about
 * themselves. Any failure reads as no hold: a money screen never shows an
 * alarm it could not confirm.
 */
export const readMyChargebackHold = cache(async (): Promise<ChargebackHold> => {
  const session = await resolveSession();
  if (session.state !== "signed-in") return NO_HOLD;
  try {
    const own = await (session.supabase as unknown as Rpc).rpc("my_chargeback_hold");
    if (!own.error) return holdFromSummary(own.data);
    if (!isMissingFunction(own.error)) return NO_HOLD;
    const service = createAdminClient() as unknown as Rpc;
    const predicate = await service.rpc("lister_chargeback_hold", { p_lister: session.user.id });
    return predicate.error ? NO_HOLD : holdFromPredicate(predicate.data);
  } catch {
    return NO_HOLD;
  }
});
