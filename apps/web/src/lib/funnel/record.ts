import "server-only";

import { cookies } from "next/headers";
import { getLocale } from "@/lib/locale";
import { requestSurface } from "@/lib/auth/surface";
import { createClient } from "@/lib/supabase/server";
import { isVisitId, VISIT_COOKIE, type FunnelDoor, type FunnelStep } from "./steps";

/**
 * A6. Record one funnel step for this request's visit, first party.
 *
 * Through `public.record_funnel_event` with the caller's own client, so the
 * database stamps an account only on the post-verification steps and only
 * from `auth.uid()`. Never throws and never waits on anything a page needs:
 * until the pending migration is applied the function does not exist, the
 * call fails, and nothing happens.
 */
export async function recordFunnelStep(step: FunnelStep, door: FunnelDoor | null = null): Promise<void> {
  try {
    const visit = (await cookies()).get(VISIT_COOKIE)?.value;
    /* Post-verification steps are keyed by the account, so a visit id is
       made up for them when the browser sent none. */
    const visitId = isVisitId(visit) ? visit : crypto.randomUUID();
    if (!isVisitId(visit) && !["first_search", "first_result", "verified"].includes(step)) return;
    const [locale, surface, supabase] = await Promise.all([getLocale(), requestSurface(), createClient()]);
    await supabase.rpc("record_funnel_event" as never, {
      p_step: step,
      p_visit: visitId,
      p_locale: locale,
      p_surface: surface === "ios-native" ? "ios" : surface === "android-native" ? "android" : "web",
      p_door: door,
    } as never);
  } catch {
    /* A funnel row is never worth an error on a page. */
  }
}
