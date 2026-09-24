/**
 * V-86. Flatmates' shares of a move-in, as arithmetic. Pure and integer kobo.
 *
 * The database keeps co-tenant shares only; the lead tenant's share is the
 * remainder, so every share sums to the move-in total exactly. The caution is
 * attributed pro rata to each share, rounded down for each co-tenant, with
 * whatever kobo that leaves on the lead, so the parts always sum to the
 * caution and a flatmate who leaves can be repaid their part.
 */
export type CoShare = { id: string; shareMinor: number };

export function leadShare(totalMinor: number, shares: CoShare[]): number {
  return totalMinor - shares.reduce((sum, share) => sum + share.shareMinor, 0);
}

/** Each co-tenant's part of the caution by id, and the lead's as `lead`. */
export function attributeCaution(
  cautionMinor: number,
  totalMinor: number,
  shares: CoShare[],
): { lead: number; byId: Record<string, number> } {
  const byId: Record<string, number> = {};
  if (!(cautionMinor > 0) || !(totalMinor > 0)) return { lead: Math.max(0, cautionMinor), byId };
  let given = 0;
  for (const share of shares) {
    // BigInt so a ₦36m move-in times a ₦5m caution cannot lose precision.
    const part = Number((BigInt(cautionMinor) * BigInt(share.shareMinor)) / BigInt(totalMinor));
    byId[share.id] = part;
    given += part;
  }
  return { lead: cautionMinor - given, byId };
}
