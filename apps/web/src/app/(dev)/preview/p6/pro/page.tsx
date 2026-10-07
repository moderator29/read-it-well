import { ProSurface } from "@/app/(app)/pro/ProSurface";
import type { ProPlanState } from "@/app/(app)/pro/pro-state";

/**
 * /pro with each of its four honest states (P6). The route reads the plan
 * tables under RLS; there is no signed-in test account, so this mounts the
 * same surface with the state the read would produce. `?s=free` is what every
 * member sees on 7 October (the database holds only the default plan, "Free").
 * `held` is the code path for a plan granted by staff, which no member has yet.
 */
const STATES: Record<string, ProPlanState> = {
  free: { kind: "free", planName: "Free" },
  "signed-out": { kind: "signed-out" },
  unknown: { kind: "unknown" },
  held: { kind: "held", planName: "Agent Pro", until: null },
};

export default async function PreviewPro({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s = "free" } = await searchParams;
  return (
    <div className="px-gutter pt-md">
      <ProSurface state={STATES[s] ?? STATES.free!} offered={[]} locale="en" signInHref="/sign-in?next=%2Fpro" />
    </div>
  );
}
