/**
 * THE CONSOLE KEY ROSTER'S RULES (C14), pure and tested.
 *
 * Every person who can act in the console proves a platform key every twelve
 * hours (`ConsoleStepUp.tsx`). A person with ONE key is one lost phone away
 * from being locked out; a super admin must hold two, because the break-glass
 * path (docs/SUPPORT_STAFF.md, "A lost console key") needs a second super
 * admin to act, and there may not be one.
 */
export type RosterKey = { label: string | null; createdAt: string; lastUsedAt: string | null };

export type RosterWarning = "no-key" | "one-key" | "super-admin-needs-two";

export function rosterWarning(kind: "super_admin" | "admin" | "staff", keys: readonly RosterKey[]): RosterWarning | null {
  if (keys.length === 0) return "no-key";
  if (kind === "super_admin" && keys.length < 2) return "super-admin-needs-two";
  if (keys.length === 1) return "one-key";
  return null;
}

export const ROSTER_WARNING_TEXT: Record<RosterWarning, string> = {
  "no-key": "No key yet: the console asks for one at the next sign-in",
  "one-key": "One key: a lost phone locks them out; ask them to add a second",
  "super-admin-needs-two": "Super admin with one key: add a second before anything else",
};

/** The newest proof across a person's keys, or null. */
export function lastProved(keys: readonly RosterKey[]): string | null {
  let best: string | null = null;
  for (const k of keys) {
    if (k.lastUsedAt && (!best || Date.parse(k.lastUsedAt) > Date.parse(best))) best = k.lastUsedAt;
  }
  return best;
}
