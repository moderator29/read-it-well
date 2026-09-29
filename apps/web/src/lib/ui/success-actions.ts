"use server";

import { takeSuccess } from "./success-cookie";
import type { GlobalDoneFlag } from "./success-moments";

/**
 * The account moment waiting for this browser, if any, taken once
 * (lib/ui/success-cookie.ts). Called by `SuccessFlagHost` only when the
 * readable hint cookie says there is one.
 */
export async function consumeSuccess(): Promise<GlobalDoneFlag | null> {
  return takeSuccess();
}
