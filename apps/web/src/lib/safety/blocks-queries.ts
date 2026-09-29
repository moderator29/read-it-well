import "server-only";

/**
 * The people I blocked, for Settings, Privacy & Security, Blocked accounts.
 *
 * The list itself is read through the caller's own RLS client:
 * `blocks_select_own` returns only rows the caller wrote, so this can never
 * show who blocked the caller (that would tell a blocked person they were
 * blocked, which the block is designed never to do). Unblocking is
 * `unblockUserSafely` in `./blocks-actions.ts`, also through RLS
 * (`blocks_delete_own`).
 *
 * The names are the one thing RLS cannot give: `profiles` is select-own. They
 * are read with the service role, for exactly the ids on the caller's own
 * list and only the display name, which the caller saw when they blocked the
 * person. Without a service key the list still renders, with a neutral label.
 */
import { resolveSession } from "../actions/session";
import { createAdminClient } from "../supabase/admin";

export type BlockedPerson = {
  userId: string;
  /** The display name, or null when it could not be read. */
  name: string | null;
  blockedAt: string;
};

export type BlockedList =
  | { state: "signed-out" }
  | { state: "unreadable" }
  /** `total` is every block the caller holds; `people` is at most BLOCKED_PAGE of them. */
  | { state: "ok"; people: BlockedPerson[]; total: number };

/** The most rows the screen lists; past it the screen says "showing N of M". */
export const BLOCKED_PAGE = 500;

/** Pure: newest block first, one row per person. */
export function orderBlocked(
  rows: readonly { other_id: string; created_at: string }[],
  names: ReadonlyMap<string, string>,
): BlockedPerson[] {
  const seen = new Set<string>();
  return [...rows]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
    .filter((r) => (seen.has(r.other_id) ? false : (seen.add(r.other_id), true)))
    .map((r) => ({ userId: r.other_id, name: names.get(r.other_id) ?? null, blockedAt: r.created_at }));
}

/** How many people the caller blocked, for the row on Privacy & Security. Null when unknown. */
export async function countMyBlocks(): Promise<number | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const { count, error } = await session.supabase
    .from("blocks")
    .select("other_id", { count: "exact", head: true })
    .eq("user_id", session.user.id);
  return error ? null : (count ?? 0);
}

export async function loadMyBlocks(): Promise<BlockedList> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "signed-out" };

  const { data, error, count } = await session.supabase
    .from("blocks")
    .select("other_id, created_at", { count: "exact" })
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(BLOCKED_PAGE);
  if (error) return { state: "unreadable" };
  const rows = data ?? [];

  const names = new Map<string, string>();
  if (rows.length > 0) {
    try {
      const admin = createAdminClient();
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, display_name")
        .in(
          "id",
          rows.map((r) => r.other_id),
        );
      for (const p of profiles ?? []) if (p.display_name) names.set(p.id, p.display_name);
    } catch {
      /* No service key: the neutral label carries the row. */
    }
  }
  const people = orderBlocked(rows, names);
  return { state: "ok", people, total: Math.max(count ?? people.length, people.length) };
}
