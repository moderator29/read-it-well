import "server-only";

/**
 * What a person agreed to, and when.
 *
 * ONE ROW ON THE CONSOLE, AND IT IS THE ONE AN OPERATOR CANNOT GET ANY OTHER
 * WAY. When somebody disputes a charge, or asks to be forgotten, or a
 * regulator writes, the first question is always which version of the terms
 * that person accepted and on what date. Until `public.terms_acceptances`
 * existed there was no answer at all: the sign-up form carried a version
 * string, the auth metadata carried it onward, and nothing ever wrote it down.
 *
 * READ THROUGH THE OPERATOR'S OWN CLIENT. `terms_acceptances` carries an admin
 * select policy, so Postgres re-checks the role on the read rather than
 * trusting a page that already checked, and a revoked role is a refusal rather
 * than a stale render. That is the same discipline `business-actions.ts` uses
 * for a decision, applied to a read.
 */

import { requireAdmin } from "./guard";
import type { AdminRead } from "./queries";

export type AcceptedDocument = {
  document: string;
  version: string;
  acceptedAt: string;
  /** How the yes was given, as the writer recorded it. Evidence, not a label. */
  source: string;
};

export type TermsStanding = {
  /** Every acceptance on file, newest first. */
  accepted: AcceptedDocument[];
  /**
   * True when this account predates the receipt entirely.
   *
   * It is stated rather than drawn as an empty list, because the two are very
   * different facts: "this person has not accepted the current terms" is a
   * thing to act on, and "nobody's acceptance was being recorded when this
   * account was made" is a thing to explain. Every account created before 22
   * September 2026 is the second one, and saying so is the honest answer.
   */
  nothingOnFile: boolean;
};

const UNAVAILABLE = { state: "unavailable" } as const;

type AcceptanceRow = {
  document: string;
  version: string;
  accepted_at: string;
  source: string;
};

type AcceptanceReader = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        order: (
          column: string,
          options: { ascending: boolean },
        ) => {
          limit: (
            count: number,
          ) => Promise<{ data: AcceptanceRow[] | null; error: { code?: string } | null }>;
        };
      };
    };
  };
};

export async function getTermsStanding(userId: string): Promise<AdminRead<TermsStanding>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;
  if (!userId) return UNAVAILABLE;

  try {
    /* Structurally typed rather than regenerated. `database.types.ts` is a
       generated file, and regenerating all of it to add one table pulls every
       other unrelated schema change into this diff. `lib/wallet/pots.ts` reads `wallet_pots` the same way
       and for the same reason; the shape asserted here is the shape the
       migration creates, and the read is still the operator's own client, so
       RLS is unaffected by how the call is typed. */
    const reader = access.supabase as unknown as AcceptanceReader;
    const { data, error } = await reader
      .from("terms_acceptances")
      .select("document, version, accepted_at, source")
      .eq("user_id", userId)
      .order("accepted_at", { ascending: false })
      .limit(20);
    if (error) return UNAVAILABLE;

    const accepted: AcceptedDocument[] = (data ?? []).map((row) => ({
      document: row.document,
      version: row.version,
      acceptedAt: row.accepted_at,
      source: row.source,
    }));

    return { state: "ok", data: { accepted, nothingOnFile: accepted.length === 0 } };
  } catch {
    return UNAVAILABLE;
  }
}
