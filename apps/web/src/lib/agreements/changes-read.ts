import "server-only";
import { reportReadError } from "@/lib/observability/read-error";

import { resolveSession } from "../actions/session";
import { lastConfirmedVersion, termsDiff, type TermChange } from "./terms-diff";

/**
 * B9: THE READ BEHIND "WHAT CHANGED SINCE YOU CONFIRMED".
 *
 * Under the reader's own RLS: the agreement's events (actor and version, both
 * already readable by a party) and the snapshot of the version they last
 * confirmed from `deal_agreement_versions`.
 *
 * DEGRADES UNTIL THE MIGRATION IS APPLIED. Before
 * `20260930084615_b9_agreement_versions_keep_what_each_side_confirmed.sql` (applied 30 September 2026)
 * the table does not exist, the select errors, and this returns null: the
 * page is exactly today's page. After it, the card appears from the first
 * amendment made once the table is keeping versions (older terms were never
 * kept and cannot be shown).
 */
export type ChangesSinceConfirmed = {
  fromVersion: number;
  toVersion: number;
  changes: TermChange[];
  /** Who made the latest amendment: the reader, the other side, or unknown. */
  by: "you" | "other" | null;
  at: string | null;
};

export async function readChangesSinceConfirmed(input: {
  agreementId: string;
  currentVersion: number;
  currentTerms: Record<string, unknown>;
  currentAmountMinor: number;
}): Promise<ChangesSinceConfirmed | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const me = session.user.id;
  try {
    const loose = session.supabase as unknown as {
      from(table: string): {
        select(cols: string): {
          eq(col: string, v: unknown): PromiseLike<{ data: unknown; error: unknown }> & {
            eq(col: string, v: unknown): { maybeSingle(): PromiseLike<{ data: unknown; error: unknown }> };
          };
        };
      };
    };
    const events = await loose
      .from("deal_agreement_events")
      .select("action, actor_id, terms_version, created_at")
      .eq("agreement_id", input.agreementId);
    await reportReadError("read.changes.readChangesSinceConfirmed", events.error);
    if (events.error || !Array.isArray(events.data)) return null;
    const rows = events.data as { action: string; actor_id: string | null; terms_version: number | null; created_at: string }[];
    const from = lastConfirmedVersion(
      rows.map((r) => ({ action: r.action, actorId: r.actor_id, termsVersion: r.terms_version })),
      me,
      input.currentVersion,
    );
    if (from === null) return null;

    const snap = await loose
      .from("deal_agreement_versions")
      .select("terms, amount_minor")
      .eq("agreement_id", input.agreementId)
      .eq("terms_version", from)
      .maybeSingle();
    await reportReadError("read.changes.readChangesSinceConfirmed", snap.error);
    if (snap.error || !snap.data) return null;
    const before = snap.data as { terms: Record<string, unknown> | null; amount_minor: number };

    const amended = rows
      .filter((r) => r.action === "amended" && (r.terms_version ?? 0) > from)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];

    return {
      fromVersion: from,
      toVersion: input.currentVersion,
      changes: termsDiff(
        { terms: before.terms ?? {}, amountMinor: Number(before.amount_minor) },
        { terms: input.currentTerms, amountMinor: input.currentAmountMinor },
      ),
      by: amended ? (amended.actor_id === me ? "you" : amended.actor_id ? "other" : null) : null,
      at: amended?.created_at ?? null,
    };
  } catch {
    return null;
  }
}
