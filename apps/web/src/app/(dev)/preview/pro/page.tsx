/* Preview harness for /pro: the real ProSurface for a signed-in member, one
   plan state per link. The signed-in page reads the plan tables; here the
   state is given, so the surface can be reviewed without an account.

     /preview/pro                  free: the plan picker, the terms, the trial and subscribe
     ?state=held                   a plan held (granted by staff)
     ?state=signed-out             the signed-out offer
     ?plans=none                   the plan rows could not be read
     ?sub=trial                    in the free trial
     ?sub=active|past_due|non_renewing   a paid plan in that state
     ?sub=used                     the trial already used, nothing live
     ?open=closed                  subscriptions switched off

   Closed outside development by the preview layout. */
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ProSurface } from "@/app/(app)/pro/ProSurface";
import type { ProPlanState } from "@/app/(app)/pro/pro-state";
import type { SubscriptionView } from "@/lib/subscriptions/state";
import { PREVIEW_PLANS, PREVIEW_TRIAL_DAYS } from "./plans-fixture";

const FREE: ProPlanState = { kind: "free", planName: "Free" };
const STATES: Record<string, ProPlanState> = {
  free: FREE,
  held: { kind: "held", planName: "Vallo Pro", until: null },
  "signed-out": { kind: "signed-out" },
};

/* Fixed instants, so the preview reads the same on every render. */
const SUBS: Record<string, SubscriptionView> = {
  none: { trialUsed: false, live: null },
  used: { trialUsed: true, live: null },
  trial: { trialUsed: true, live: { kind: "trial", id: "00000000-0000-4000-8000-000000000001", planKey: "pro", planName: "Vallo Pro", trialEndsAt: "2026-10-12T09:00:00Z" } },
  active: {
    trialUsed: true,
    live: { kind: "paid", id: "00000000-0000-4000-8000-000000000002", planKey: "pro", planName: "Vallo Pro", status: "active", periodEnd: "2026-11-08T09:00:00Z", amountMinor: 950000 },
  },
  past_due: {
    trialUsed: true,
    live: { kind: "paid", id: "00000000-0000-4000-8000-000000000003", planKey: "business", planName: "Vallo Business", status: "past_due", periodEnd: "2026-11-08T09:00:00Z", amountMinor: 3500000 },
  },
  non_renewing: {
    trialUsed: true,
    live: { kind: "paid", id: "00000000-0000-4000-8000-000000000004", planKey: "pro", planName: "Vallo Pro", status: "non_renewing", periodEnd: "2026-11-08T09:00:00Z", amountMinor: 950000 },
  },
};

export default async function PreviewProPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; plans?: string; sub?: string; open?: string }>;
}) {
  const [{ state, plans, sub, open }, locale] = await Promise.all([searchParams, getLocale()]);
  const none = plans === "none";
  const closed = open === "closed";
  return (
    <ProSurface
      state={STATES[state ?? "free"] ?? FREE}
      plans={none ? [] : PREVIEW_PLANS}
      trialDays={none ? null : PREVIEW_TRIAL_DAYS}
      locale={locale}
      signInHref="/sign-in?next=/pro"
      subscriptions={SUBS[sub ?? "none"] ?? SUBS.none!}
      trialOpen={!closed}
      payOpen={!closed}
      copy={getDictionary(locale).subscriptions}
    />
  );
}
