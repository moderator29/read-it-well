import type { MoneyRail } from "./copy";

/**
 * WHICH RAIL A MEMBER IS ACTUALLY ON TODAY.
 *
 * The DIRECT rail (the processor splits each charge in the same transaction;
 * nobody holds anything) is the only live rail. The PROTECTED rail (a licensed
 * partner holds the payment until the payer confirms) ships only when all four
 * of D50's conditions hold, and condition 3 is a fact about the world this
 * code cannot read: ADR-0003 ACCEPTED, not proposed, and the merchant account
 * live. So it is a constant, changed in the same reviewed commit that wires
 * the rail (Session 2, R-3 to R-6 and the D50 adapter), never a flag a
 * dashboard can flip.
 *
 * While it is false: no balance, no Protected figure and no withdrawal is
 * linked from member navigation, and every live surface speaks the direct
 * rail's sentences. The dev previews draw the protected surfaces with fixture
 * data, labelled as fixtures.
 */
export const PROTECTED_RAIL_LIVE = false as const;

/** The rail a live payment opens on today. */
export const LIVE_RAIL: MoneyRail = "direct";

/** Whether a surface for this rail may be reached from member navigation. */
export function railIsLive(rail: MoneyRail): boolean {
  return rail === "direct" ? true : PROTECTED_RAIL_LIVE;
}
