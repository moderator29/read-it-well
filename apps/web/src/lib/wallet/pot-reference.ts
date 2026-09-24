import { createHash, randomUUID } from "node:crypto";

/** The prefix every pot move reference carries. */
export const POT_PREFIX = "rm-pot-";

/**
 * MON-18. The ledger reference for a pot move, derived from the sheet's key,
 * the direction, the pot and the amount, so a second submit of the same move
 * is a database duplicate instead of a second move. Without a key (an older
 * client) it is random, as before.
 */
export function potMoveReference(
  userId: string,
  move: { key?: string; direction: "in" | "out"; potId: string; amountMinor: number },
): string {
  if (!move.key) return `${POT_PREFIX}${randomUUID()}`;
  const hex = createHash("sha256")
    .update(`wallet.pot:${userId}:${move.key}:${move.direction}:${move.potId}:${move.amountMinor}`)
    .digest("hex");
  const variant = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, "0");
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
  return `${POT_PREFIX}${uuid}`;
}
