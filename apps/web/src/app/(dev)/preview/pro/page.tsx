/* Preview harness for /pro: the real ProSurface for a signed-in member, one
   plan state per link. The signed-in page reads the plan tables; here the
   state is given, so the surface can be reviewed without an account.

     /preview/pro                  free: the plan picker and its stat strip
     ?state=held                   a plan held
     ?state=signed-out             the signed-out offer
     ?plans=none                   the plan rows could not be read

   Closed outside development by the preview layout. */
import { getLocale } from "@/lib/locale";
import { ProSurface } from "@/app/(app)/pro/ProSurface";
import type { ProPlanState } from "@/app/(app)/pro/pro-state";
import { PREVIEW_PLANS, PREVIEW_TRIAL_DAYS } from "./plans-fixture";

const FREE: ProPlanState = { kind: "free", planName: "Free" };
const STATES: Record<string, ProPlanState> = {
  free: FREE,
  held: { kind: "held", planName: "Vallo Pro", until: null },
  "signed-out": { kind: "signed-out" },
};

export default async function PreviewProPage({ searchParams }: { searchParams: Promise<{ state?: string; plans?: string }> }) {
  const [{ state, plans }, locale] = await Promise.all([searchParams, getLocale()]);
  const none = plans === "none";
  return (
    <ProSurface
      state={STATES[state ?? "free"] ?? FREE}
      plans={none ? [] : PREVIEW_PLANS}
      trialDays={none ? null : PREVIEW_TRIAL_DAYS}
      locale={locale}
      signInHref="/sign-in?next=/pro"
    />
  );
}
