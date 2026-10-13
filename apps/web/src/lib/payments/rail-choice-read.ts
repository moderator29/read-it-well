import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "../actions/session";
import { reportReadError } from "../observability/read-error";
import { isMissingFunction } from "./router";
import { readPayChoice, type PayChoice } from "./rail-choice";

/**
 * The payer's choice for one agreement, read under the viewer's own session
 * (`public.payment_rail_options` answers a party only). Null when it cannot be
 * said: signed out, not a party, or the function not there yet (pending
 * migration pov04), in which case the page draws the payment it already had.
 */
export async function readAgreementPayChoice(agreementId: string): Promise<PayChoice | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const { data, error } = await (session.supabase as unknown as SupabaseClient).rpc("payment_rail_options", {
      p_agreement: agreementId,
    });
    if (error) {
      if (!isMissingFunction(error)) await reportReadError("read.payments.rail_options", error);
      return null;
    }
    return readPayChoice(data);
  } catch {
    return null;
  }
}
