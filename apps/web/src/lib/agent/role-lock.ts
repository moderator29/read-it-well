/**
 * ONE ACCOUNT, ONE SUPPLY ROLE.
 *
 * The founder's ruling (13 October 2026): an owner (landlord) account and an
 * agent account are separate accounts, because the two workspaces differ. So
 * an account that is an owner, or is waiting to become one, cannot file to be
 * an agent, and the other way round. Before this, an approved owner who filed
 * as an agent was told "approved" while `agents.role` stayed owner, because
 * approval never overwrites a live agents row.
 *
 * The professional (six step) application and the firm door both become an
 * agent (`personRoleFrom`), so they count as agent here.
 *
 * Pure, so the setup pages, both filing actions and the tests read one rule.
 * The database holds the same rule in the pending migration
 * 20261013120000.
 */

export type SupplySide = "owner" | "agent";

/** Which side an application row or an agents row stands on. */
export function sideOf(role: string | null | undefined): SupplySide {
  return role === "owner" ? "owner" : "agent";
}

/** The application states that hold an account to its side. */
export const HOLDING_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "MORE_INFO_REQUIRED", "APPROVED"] as const;

/**
 * The side this account already holds that refuses `wanted`, or null.
 *
 * `agentRole` is `agents.role` when the account has an agents row (it is the
 * truth once approved). `applications` are the account's applications with
 * their status and `supply_role`; a refused, suspended or draft one holds
 * nothing.
 */
export function heldOtherSide(
  wanted: SupplySide,
  agentRole: string | null,
  applications: readonly { status: string; supply_role: string | null }[],
): SupplySide | null {
  if (agentRole !== null && sideOf(agentRole) !== wanted) return sideOf(agentRole);
  for (const row of applications) {
    if (!(HOLDING_STATUSES as readonly string[]).includes(row.status)) continue;
    const side = sideOf(row.supply_role);
    if (side !== wanted) return side;
  }
  return null;
}

/** What a filing action answers when the account holds the other side. */
export function otherSideMessage(held: SupplySide): string {
  return held === "owner"
    ? "This account is an owner's account, and an agent works from a separate one because the two workspaces differ. To work as an agent, sign up again with a different email address and register as an agent there."
    : "This account is an agent's account, and an owner lists from a separate one because the two workspaces differ. To list your own property, sign up again with a different email address and register as an owner there.";
}
