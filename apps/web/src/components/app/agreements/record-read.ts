import "server-only";

import { resolveSession } from "@/lib/actions/session";
import { reportError } from "@/lib/observability/report";
import type { RecordEvent, StoredVersion } from "./version-register";

/**
 * M2: THE READS BEHIND AN AGREEMENT'S VERSIONS, under the reader's own RLS.
 *
 * No new data and no new rule: these select tables the agreement pages
 * already read, through the same session, the way B9's
 * `lib/agreements/changes-read.ts` does.
 *
 *   deal_agreement_versions   B9's kept snapshots, readable by the two
 *                             parties only (`deal_agreement_versions_parties_read`)
 *   deal_agreement_events     the actor, the action and the version
 *   deal_agreements           the two party ids, to name the actor's side
 *
 * Each read DEGRADES rather than throws. A failed read returns null and the
 * page draws exactly what it drew before this file: the current version and
 * the plain history. Staff read the agreement but are no party to it, so
 * their versions read comes back empty and the register shows the current
 * version alone, which is honest: it is what they may see.
 *
 * The client is cast loose for the one table the generated types may not
 * know yet, as `changes-read.ts` does; every row is checked field by field
 * before it is trusted.
 */

type Result = { data: unknown; error: unknown };
type Query = PromiseLike<Result> & {
  eq(column: string, value: unknown): Query;
  in(column: string, values: readonly unknown[]): Query;
  order(column: string, options?: { ascending?: boolean }): Query;
  maybeSingle(): PromiseLike<Result>;
};
type Loose = { from(table: string): { select(columns: string): Query } };

const UUID = /^[0-9a-f-]{36}$/i;

export type AgreementRecord = {
  /** Kept snapshots in version order; null when the read failed. */
  versions: StoredVersion[] | null;
  /** The events with their actor's side; null when the read failed. */
  events: RecordEvent[] | null;
};

function rows(data: unknown): Record<string, unknown>[] {
  return Array.isArray(data) ? (data.filter((r) => r !== null && typeof r === "object") as Record<string, unknown>[]) : [];
}

function int(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) ? n : null;
}

/** The versions and the sided events of one agreement. */
export async function readAgreementRecord(agreementId: string): Promise<AgreementRecord | null> {
  if (!UUID.test(agreementId)) return null;
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const db = session.supabase as unknown as Loose;
  try {
    const [parties, versions, events] = await Promise.all([
      db.from("deal_agreements").select("renter_id, owner_id").eq("id", agreementId).maybeSingle(),
      db
        .from("deal_agreement_versions")
        .select("terms_version, terms, amount_minor")
        .eq("agreement_id", agreementId)
        .order("terms_version", { ascending: true }),
      db
        .from("deal_agreement_events")
        .select("created_at, action, note, actor_id, terms_version")
        .eq("agreement_id", agreementId)
        .order("created_at", { ascending: true }),
    ]);
    const party = (parties.error ? null : parties.data) as { renter_id?: unknown; owner_id?: unknown } | null;
    const renterId = typeof party?.renter_id === "string" ? party.renter_id : null;
    const ownerId = typeof party?.owner_id === "string" ? party.owner_id : null;

    const kept: StoredVersion[] | null = versions.error
      ? null
      : rows(versions.data).flatMap((r) => {
          const version = int(r.terms_version);
          const amount = int(r.amount_minor);
          if (version === null || version < 1 || amount === null) return [];
          const terms = r.terms && typeof r.terms === "object" && !Array.isArray(r.terms) ? (r.terms as Record<string, unknown>) : {};
          return [{ version, terms, amountMinor: amount }];
        });

    const sided: RecordEvent[] | null =
      events.error || party === null
        ? null
        : rows(events.data).flatMap((r) => {
            if (typeof r.created_at !== "string" || typeof r.action !== "string") return [];
            const actor = typeof r.actor_id === "string" ? r.actor_id : null;
            /* A review decision is Vallo's whoever pressed it; otherwise the
               actor is named only when they are one of the two parties. */
            const side: RecordEvent["side"] =
              r.action === "approved" || r.action === "rejected"
                ? "vallo"
                : actor !== null && actor === renterId
                  ? "renter"
                  : actor !== null && actor === ownerId
                    ? "owner"
                    : null;
            return [
              {
                at: r.created_at,
                action: r.action,
                note: typeof r.note === "string" && r.note.length > 0 ? r.note : null,
                side,
                version: int(r.terms_version),
              },
            ];
          });

    return { versions: kept, events: sided };
  } catch (error) {
    await reportError({ error, context: { kind: "read.agreement_record" } });
    return null;
  }
}

/**
 * The kept version numbers of each agreement in the register, in one read.
 * Null when the read failed, so the register draws its rows without a
 * version line rather than with a wrong one.
 */
export async function readKeptVersions(agreementIds: readonly string[]): Promise<Map<string, number[]> | null> {
  const ids = agreementIds.filter((id) => UUID.test(id));
  if (ids.length === 0) return new Map();
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const db = session.supabase as unknown as Loose;
  try {
    const read = await db.from("deal_agreement_versions").select("agreement_id, terms_version").in("agreement_id", ids);
    if (read.error) return null;
    const out = new Map<string, number[]>();
    for (const r of rows(read.data)) {
      const version = int(r.terms_version);
      if (typeof r.agreement_id !== "string" || version === null) continue;
      out.set(r.agreement_id, [...(out.get(r.agreement_id) ?? []), version]);
    }
    return out;
  } catch (error) {
    await reportError({ error, context: { kind: "read.agreement_versions" } });
    return null;
  }
}
