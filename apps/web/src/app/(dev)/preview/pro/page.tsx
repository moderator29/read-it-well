/* Preview harness for /pro: the real ProSurface for a signed-in member, one
   plan state per link. The signed-in page reads the plan tables; here the
   state is given, so the surface can be reviewed without an account.

     /preview/pro                  free: the plan picker and its stat strip
     ?state=held                   a plan held
     ?state=signed-out             the signed-out offer

   Closed outside development by the preview layout. */
import { getLocale } from "@/lib/locale";
import { ProSurface } from "@/app/(app)/pro/ProSurface";
import type { ProPlanState } from "@/app/(app)/pro/pro-state";

const FREE: ProPlanState = { kind: "free", planName: "Free" };
const STATES: Record<string, ProPlanState> = {
  free: FREE,
  held: { kind: "held", planName: "Agent Pro", until: null },
  "signed-out": { kind: "signed-out" },
};

export default async function PreviewProPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const [{ state }, locale] = await Promise.all([searchParams, getLocale()]);
  return (
    <ProSurface
      state={STATES[state ?? "free"] ?? FREE}
      offered={[]}
      locale={locale}
      signInHref="/sign-in?next=/pro"
    />
  );
}
