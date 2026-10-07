import type { Metadata } from "next";
import { resolveSession } from "@/lib/actions/session";
import { getLocale } from "@/lib/locale";
import { withNext } from "@/lib/auth/next-link";
import { presentEntitlement } from "@/components/app/pro/pro-entitlement";
import { PRO_COPY } from "./pro-copy";
import { ProSurface } from "./ProSurface";
import { offeredPlans, planClock, planStateFrom, type MemberPlanRow, type PlanRow, type ProPlanState } from "./pro-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: PRO_COPY.metaTitle,
  robots: { index: false, follow: false },
};

/**
 * /pro: WHAT PRO IS, WHAT IT WILL UNLOCK, AND WHERE THE MEMBER STANDS (P6,
 * 7 October 2026; handoff A.11; the founder's reference 9).
 *
 * THE HONEST STATE. The plan tables are live and hold one plan, the default
 * "Free", with no price anywhere in the schema. So the page reads the member's
 * own plan and the plans on offer, shows "Free" (the database's own word) or
 * whatever plan they hold, and draws every Pro plan as "Not on sale yet". No
 * price, no checkout, no waitlist (none exists to join): one calm line, "When
 * it opens, we will tell you."
 *
 * THE SWITCH IS NOT HERE. A.11: the Pro switch exists only for somebody who
 * has paid, and it lives in the workspace it deepens (`ProSwitch` in the agent
 * and host shells). This page is the surface for everybody else: what Pro
 * does, shown beautifully. A member who holds a plan is told where the switch
 * is, never shown a second one.
 *
 * A held plan points at its switch only when `presentEntitlement` (fail
 * closed) agrees for one of the two scopes; until W7-R4 it never does, and the
 * held card says the tools arrive in the workspace as they open.
 */
export default async function ProPage() {
  const [session, locale] = await Promise.all([resolveSession(), getLocale()]);
  const now = planClock();

  let state: ProPlanState = { kind: "signed-out" };
  let offered: string[] = [];
  let switchReady = false;

  if (session.state === "signed-in") {
    /* The plan tables are newer than the generated types, so the reads are
       typed here by hand (`pro-state.ts`) rather than by `Database`. */
    const db = session.supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => PromiseLike<{ data: unknown; error: unknown }>;
      };
    };
    const [mine, plans] = await Promise.all([
      db.from("member_entitlement_plans").select("effective_from, effective_to, plan:entitlement_plans(plan_key, name, is_default)"),
      db.from("entitlement_plans").select("plan_key, name, is_default, effective_from, effective_to"),
    ]);
    const mineRows = mine.error ? null : ((mine.data as MemberPlanRow[] | null) ?? []);
    const planRows = plans.error ? null : ((plans.data as PlanRow[] | null) ?? []);
    state = planStateFrom(mineRows, planRows, now);
    offered = offeredPlans(planRows, now);

    /* A plan row is the database's word that a plan is held. Whether its
       switch is drawn yet is the entitlement check's word (fail closed, null
       for everybody until W7-R4 lands), so the page only points at the
       switch when the check agrees. */
    if (state.kind === "held") {
      const [host, agent] = await Promise.all([presentEntitlement("host"), presentEntitlement("agent")]);
      switchReady = Boolean(host ?? agent);
    }
  } else if (session.state === "unconfigured") {
    state = { kind: "unknown" };
  }

  return (
    <ProSurface
      state={state}
      offered={offered}
      switchReady={switchReady}
      locale={locale}
      signInHref={withNext("/sign-in", "/pro")}
    />
  );
}
