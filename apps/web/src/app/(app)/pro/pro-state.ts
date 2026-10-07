/**
 * WHAT /pro KNOWS ABOUT THE PERSON LOOKING AT IT, AND NOTHING IT DOES NOT.
 *
 * The plan tables exist (`b3_tax_entitlements_promotion`, applied 6 October):
 * `entitlement_plans` (readable by anyone), `member_entitlement_plans` (each
 * member reads only their own rows under RLS). On 7 October the only plan in
 * the database is the default, "Free", whose note reads "everything free
 * today stays free. No price exists." There is no price column anywhere, and
 * no Pro product. So this page never shows a price, never offers a checkout,
 * and says plainly that Pro is coming.
 *
 * The answer is one of four, and the page draws each one differently:
 *   signed-out  nobody to ask about
 *   unknown     the read failed; the page says it could not check, it never
 *               guesses "Free" for somebody who might hold a plan
 *   free        no plan of their own in force; the default plan's own name
 *   held        a plan of their own in force, with its end date if it has one
 *
 * Pure: `planStateFrom` takes rows, so the four answers are tested without a
 * database. The read itself lives in `page.tsx`.
 */

export type ProPlanState =
  | { kind: "signed-out" }
  | { kind: "unknown" }
  | { kind: "free"; planName: string }
  | { kind: "held"; planName: string; until: string | null };

/** One of the member's own plan rows, as the page selects it. */
export type MemberPlanRow = {
  effective_from: string;
  effective_to: string | null;
  plan: { plan_key: string; name: string; is_default: boolean } | null;
};

/** A plan row from `entitlement_plans`. */
export type PlanRow = {
  plan_key: string;
  name: string;
  is_default: boolean;
  effective_from: string;
  effective_to: string | null;
};

function inForce(from: string, to: string | null, now: number): boolean {
  const start = Date.parse(from);
  if (!Number.isFinite(start) || start > now) return false;
  if (to == null) return true;
  const end = Date.parse(to);
  return Number.isFinite(end) && end > now;
}

/**
 * The person's state from the two reads. `mine` is null when that read
 * failed, and so is `plans`: either failing is "unknown", because a member
 * who holds a plan must never be told they are on Free by a page that could
 * not check.
 */
export function planStateFrom(
  mine: readonly MemberPlanRow[] | null,
  plans: readonly PlanRow[] | null,
  now: number,
): ProPlanState {
  if (mine == null || plans == null) return { kind: "unknown" };
  const own = mine
    .filter((r) => r.plan && !r.plan.is_default && inForce(r.effective_from, r.effective_to, now))
    .sort((a, b) => Date.parse(b.effective_from) - Date.parse(a.effective_from))[0];
  if (own?.plan) return { kind: "held", planName: own.plan.name, until: own.effective_to };
  const fallback = plans.find((p) => p.is_default && inForce(p.effective_from, p.effective_to, now));
  if (!fallback) return { kind: "unknown" };
  return { kind: "free", planName: fallback.name };
}

/**
 * The paid plans the database offers today: every plan in force that is not
 * the default. Empty on 7 October, which is what turns the page's plan cards
 * into "coming". When the founder adds a plan row, its name appears here; a
 * price still does not, because no price column exists to read.
 */
/** The server's clock for one request, read once (kept out of render for the purity rule). */
export function planClock(): number {
  return Date.now();
}

export function offeredPlans(plans: readonly PlanRow[] | null, now: number): string[] {
  if (!plans) return [];
  return plans.filter((p) => !p.is_default && inForce(p.effective_from, p.effective_to, now)).map((p) => p.name);
}
