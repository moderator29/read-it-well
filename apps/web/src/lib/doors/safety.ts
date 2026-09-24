/**
 * V-62. A RENTER GOING TO AN INSPECTION ALONE TELLS SOMEONE, AND THE PAGE THAT
 * PERSON OPENS SAYS ONLY WHAT IS SAFE TO FORWARD.
 *
 * `public.safety_share_read` returns the renter's first name, the listing's
 * AREA (never the address or a landmark), the agent's public name and the
 * date Vallo checked their identity (the agent's name is no longer returned:
 * it is text a lister typed), the slot, when the renter expects to be
 * back, and whether they have tapped "I'm done". This file reads that JSON
 * into a view without trusting any field, and decides which of a renter's
 * inspections can be shared at all. Pure: the page and the tests both use it.
 */

export type SafetyShareView =
  | { state: "unknown" }
  | { state: "expired" }
  /* A cancelled or moved inspection still says whether the renter has checked
     in, so closing or moving it can never quieten the page while nobody has
     heard from them. */
  | { state: "cancelled"; checkedIn: boolean; overdue: boolean }
  | { state: "moved"; checkedIn: boolean; overdue: boolean }
  | { state: "stopped" }
  | { state: "failed" }
  | {
      state: "live";
      firstName: string | null;
      area: string | null;
      agentName: string | null;
      identityCheckedAt: string | null;
      slotAt: string | null;
      expectedBackAt: string | null;
      checkedInAt: string | null;
      overdue: boolean;
    };

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** The database's answer, read without trusting it. Anything unreadable is "failed". */
export function readSafetyShare(data: unknown): SafetyShareView {
  if (!data || typeof data !== "object") return { state: "failed" };
  const row = data as Record<string, unknown>;
  if (row.state === "unknown") return { state: "unknown" };
  if (row.state === "expired") return { state: "expired" };
  if (row.state === "cancelled" || row.state === "moved") {
    return { state: row.state, checkedIn: text(row.checked_in_at) !== null, overdue: row.overdue === true };
  }
  if (row.state === "stopped") return { state: "stopped" };
  if (row.state !== "live") return { state: "failed" };
  return {
    state: "live",
    firstName: text(row.first_name),
    /* The place from the closed list, else the state, built in the database.
       Never a city: that is free text a lister types. */
    area: text(row.area),
    agentName: text(row.agent_name),
    identityCheckedAt: text(row.identity_checked_at),
    slotAt: text(row.slot_at),
    expectedBackAt: text(row.expected_back_at),
    checkedInAt: text(row.checked_in_at),
    overdue: row.overdue === true,
  };
}

/** The token as it may appear in a path; anything else is never sent to the database. */
export function isShareToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{20,64}$/.test(token);
}

type Shareable = { id: string; state: string; slotAt: string | null; side: "requester" | "lister" };

/**
 * Which of a person's inspections can be shared: their own confirmed ones,
 * with a time, from 24 hours before the slot until four hours after it (when
 * the page itself closes). The database refuses anything else; this only
 * decides what to draw.
 */
export function shareableInspections<T extends Shareable>(rows: readonly T[], nowMs: number = Date.now()): T[] {
  return rows.filter((row) => {
    if (row.side !== "requester" || row.state !== "CONFIRMED" || !row.slotAt) return false;
    const slot = Date.parse(row.slotAt);
    if (Number.isNaN(slot)) return false;
    return slot + 4 * 3600_000 > nowMs && slot - 24 * 3600_000 <= nowMs;
  });
}
