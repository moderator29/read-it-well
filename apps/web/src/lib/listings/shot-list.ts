/**
 * V-70. THE SHOT LIST. What each listing photo shows, from a closed list,
 * and which of the slots a listing may use. Pure; the twin of the check in
 * `set_listing_photo_slot` (migration 20260924141100).
 */
export const SHOT_SLOTS = ["front", "road", "living", "kitchen", "bedroom", "bathroom", "meter", "water", "power"] as const;
export type ShotSlot = (typeof SHOT_SLOTS)[number];

/** The four a listing should cover: front, living room, kitchen, a bedroom. */
export const REQUIRED_SLOTS: readonly ShotSlot[] = ["front", "living", "kitchen", "bedroom"];

export type UtilityClaims = { prepaidMeter: boolean | null; waterSupply: string | null; powerBackup: string | null };

export function isShotSlot(value: unknown): value is ShotSlot {
  return typeof value === "string" && (SHOT_SLOTS as readonly string[]).includes(value);
}

/** The slots offered for this listing: a utility slot only when that utility is claimed. */
export function offeredSlots(claims: UtilityClaims): ShotSlot[] {
  return SHOT_SLOTS.filter((slot) => {
    if (slot === "meter") return claims.prepaidMeter === true;
    if (slot === "water") return Boolean(claims.waterSupply) && claims.waterSupply !== "NONE";
    if (slot === "power") return Boolean(claims.powerBackup) && claims.powerBackup !== "NONE";
    return true;
  });
}

/** Required slots no photo covers yet, in the order they are asked for. */
export function missingRequired(labelled: (ShotSlot | null | undefined)[]): ShotSlot[] {
  const have = new Set(labelled.filter(isShotSlot));
  return REQUIRED_SLOTS.filter((slot) => !have.has(slot));
}

/** The distinct slots photographed, in shot-list order, for "Photographed: ...". */
export function photographed(labelled: (ShotSlot | null | undefined)[]): ShotSlot[] {
  const have = new Set(labelled.filter(isShotSlot));
  return SHOT_SLOTS.filter((slot) => have.has(slot));
}

/** A listing row's utility claims, as the shot list reads them. */
export function claimsOf(row: { prepaid_meter?: unknown; water_supply?: unknown; power_backup?: unknown }): UtilityClaims {
  return {
    prepaidMeter: typeof row.prepaid_meter === "boolean" ? row.prepaid_meter : null,
    waterSupply: typeof row.water_supply === "string" ? row.water_supply : null,
    powerBackup: typeof row.power_backup === "string" ? row.power_backup : null,
  };
}

/**
 * The slots photographed that the listing still claims: a meter, water or
 * power label outlives the claim it was set under, so a caption drops it once
 * the claim is withdrawn rather than show a photo of something not offered.
 */
export function photographedClaimed(labelled: (ShotSlot | null | undefined)[], claims: UtilityClaims): ShotSlot[] {
  const offered = new Set(offeredSlots(claims));
  return photographed(labelled).filter((slot) => offered.has(slot));
}
