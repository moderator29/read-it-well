import { getDictionary } from "@vallo/i18n";
import { ProSurface } from "@/app/(app)/pro/ProSurface";
import type { ProPlanState } from "@/app/(app)/pro/pro-state";
import { PREVIEW_PLANS, PREVIEW_TRIAL_DAYS } from "../../pro/plans-fixture";

/**
 * /pro with each of its four honest states (P6). The route reads the plan
 * tables under RLS; there is no signed-in test account, so this mounts the
 * same surface with the state the read would produce, and the two plans as
 * migration d84 seeds them. `held` is the code path for a plan granted by
 * staff, which no member has yet.
 */
const STATES: Record<string, ProPlanState> = {
  free: { kind: "free", planName: "Free" },
  "signed-out": { kind: "signed-out" },
  unknown: { kind: "unknown" },
  held: { kind: "held", planName: "Vallo Pro", until: null },
};

export default async function PreviewPro({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s = "free" } = await searchParams;
  return (
    <div className="px-gutter pt-md">
      <ProSurface
        state={STATES[s] ?? STATES.free!}
        plans={PREVIEW_PLANS}
        trialDays={PREVIEW_TRIAL_DAYS}
        locale="en"
        signInHref="/sign-in?next=%2Fpro"
        subscriptions={{ trialUsed: false, live: null }}
        trialOpen
        payOpen
        copy={getDictionary("en").subscriptions}
      />
    </div>
  );
}
