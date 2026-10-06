import "server-only";

/**
 * WHETHER THIS MEMBER HOLDS A PLAN, ASKED ON THE SERVER, EVERY RENDER.
 *
 * Who owns what (cross-session contract, section 2, "Entitlements"): Session 2
 * owns the check and the plan table; Session 3 owns the presence rule, which is
 * that a member holding nothing never sees the Pro switch at all (D12, north
 * star 14.2). This file is the seam between the two.
 *
 * ===========================================================================
 * STUB, PENDING SESSION 2 REQUEST W7-R4 (the entitlement check). There is no
 * plan table, no entitlement RPC and no paid feature in this repository or on
 * Session 2's branch (searched 6 October: `entitlement` appears only in push
 * credentials and the iOS signing notes). So `resolveProEntitlement` answers
 * null for everybody, and the switch is therefore absent for everybody, which
 * is exactly the fail-closed state D12 requires. When W7-R4 lands, its body
 * calls Session 2's check and nothing else changes.
 * ===========================================================================
 *
 * FAILS CLOSED, by construction and by test: anything other than a positive,
 * current entitlement from the server is null. It is never inferred in the
 * browser, never read from a cookie, and never cached across members.
 */

/** Where a plan applies. One switch per workspace that a plan deepens. */
export type ProScope = "host" | "agent";

/** A positive, current entitlement, as Session 2 will return it (W7-R4). */
export type ProEntitlement = {
  scope: ProScope;
  /** The plan's own id, for the account page; never shown as a tier name. */
  planId: string;
  /** When the current period ends, ISO 8601. A past date is not an entitlement. */
  currentUntil: string;
};

/**
 * The signed-in member's entitlement for a scope, or null. Null for a member
 * holding nothing, for a signed-out request, for a read that failed, and for
 * every request until W7-R4 lands.
 */
export async function resolveProEntitlement(scope: ProScope): Promise<ProEntitlement | null> {
  void scope;
  return null;
}

/** The only shape this module trusts: a scope match and a period still running. */
export function isCurrentEntitlement(
  value: ProEntitlement | null | undefined,
  scope: ProScope,
  now: number,
): value is ProEntitlement {
  if (!value || value.scope !== scope) return false;
  const until = Date.parse(value.currentUntil);
  return Number.isFinite(until) && until > now;
}

/**
 * The presence decision `ProSwitch` makes before it draws anything: the
 * entitlement if, and only if, it is current for this scope; null for a
 * member holding nothing, another scope, an ended period, and a check that
 * throws. Separate from the component so the absent state is tested without
 * rendering.
 */
export async function presentEntitlement(
  scope: ProScope,
  resolve: (scope: ProScope) => Promise<ProEntitlement | null> = resolveProEntitlement,
  now: number = Date.now(),
): Promise<ProEntitlement | null> {
  let entitlement: ProEntitlement | null = null;
  try {
    entitlement = await resolve(scope);
  } catch {
    return null;
  }
  return isCurrentEntitlement(entitlement, scope, now) ? entitlement : null;
}
