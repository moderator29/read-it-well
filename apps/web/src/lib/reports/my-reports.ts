import "server-only";

import { resolveSession } from "../actions/session";

/**
 * THE REPORTER'S SIDE, READ. V-89.
 *
 * `public.my_reports()` returns this person's own reports and, for each, only
 * the line a moderator wrote for them (never the staff notes). Fails into
 * "unreadable", which the screen says in words.
 */
export type MyReport = {
  id: string;
  targetType: string;
  category: string | null;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  note: string | null;
};

export type MyReports = { state: "signed-out" } | { state: "unreadable" } | { state: "ok"; rows: MyReport[] };

export async function loadMyReports(): Promise<MyReports> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "signed-out" };
  try {
    const { data, error } = (await (session.supabase as unknown as {
      rpc: (fn: string) => PromiseLike<{ data: unknown; error: unknown }>;
    }).rpc("my_reports")) as { data: unknown; error: unknown };
    if (error || !Array.isArray(data)) return { state: "unreadable" };
    return {
      state: "ok",
      rows: (data as {
        id: string;
        target_type: string;
        category: string | null;
        status: string;
        created_at: string;
        resolved_at: string | null;
        reporter_note: string | null;
      }[]).map((r) => ({
        id: r.id,
        targetType: r.target_type,
        category: r.category,
        status: r.status,
        createdAt: r.created_at,
        resolvedAt: r.resolved_at,
        note: r.reporter_note,
      })),
    };
  } catch {
    return { state: "unreadable" };
  }
}
