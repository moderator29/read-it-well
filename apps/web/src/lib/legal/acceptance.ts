import "server-only";

/**
 * Writing down that somebody accepted the terms.
 *
 * NOT A SERVER ACTION, DELIBERATELY, and for the same reason
 * `lib/payments/charge-saved-card.ts` is not one: a `"use server"` export is an
 * endpoint a browser can call with any arguments it likes, and a function that
 * writes evidence about who agreed to what must never be one. The user id is
 * always one the server has just resolved, never one a form supplied.
 *
 * IT USES THE SERVICE ROLE BECAUSE THE TABLE HAS NO INSERT POLICY AT ALL. That
 * is the design: a row a party can write is a row a party can forge, and a row
 * a party can delete is a record that disappears exactly when it matters. The
 * migration explains it at length.
 *
 * BEST EFFORT, BUT NEVER SILENT. A failure here must not stop somebody opening
 * an account: refusing a sign-up because a bookkeeping row would not write is
 * a worse outcome than the missing row. But the missing row is a compliance
 * gap, so it raises a risk alert rather than disappearing into a catch. The
 * alert carries the user id, which the console already handles, and never the
 * address or anything else about them.
 */

import { recordAlert } from "@/lib/alerts";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACCEPTED_AT_SIGNUP } from "./versions";

/** Where the yes was given. Evidence, so it is recorded rather than inferred. */
export type AcceptanceSource = "signup_email" | "signup_oauth" | "reacceptance";

type AcceptanceWriter = {
  from: (table: string) => {
    upsert: (
      rows: { user_id: string; document: string; version: string; source: string }[],
      options: { onConflict: string; ignoreDuplicates: boolean },
    ) => Promise<{ error: { message?: string } | null }>;
  };
};

/**
 * Record that this person accepted the current terms and privacy notice.
 *
 * Idempotent by the unique index on (user_id, document, version): a person who
 * signs up, is interrupted and comes back writes one row per document, not
 * two. Anything already there is left exactly as it was, so the original
 * `accepted_at` is never overwritten by a later visit.
 */
export async function recordTermsAcceptance(
  userId: string,
  source: AcceptanceSource,
  options: { ageConfirmed?: boolean } = {},
): Promise<void> {
  if (!userId) return;
  if (options.ageConfirmed) await recordAgeConfirmation(userId, source);

  try {
    /* Structurally typed rather than regenerated, for the reason written out
       in `lib/admin/legal-queries.ts`: `database.types.ts` is a generated file,
       and one table is not worth regenerating all of it. The shape below is the shape the migration creates. */
    const admin = createAdminClient() as unknown as AcceptanceWriter;
    const { error } = await admin.from("terms_acceptances").upsert(
      ACCEPTED_AT_SIGNUP.map((accepted) => ({
        user_id: userId,
        document: accepted.document,
        version: accepted.version,
        source,
      })),
      { onConflict: "user_id,document,version", ignoreDuplicates: true },
    );
    if (error) throw new Error(error.message);
  } catch {
    /* The account exists and the person is inside the product. What is missing
       is the receipt, and that is a compliance gap rather than a user problem,
       so it goes on the desk instead of into the void. */
    await recordAlert({
      kind: "legal.acceptance.unrecorded",
      severity: "warning",
      detail: {
        source,
        documents: ACCEPTED_AT_SIGNUP.map((accepted) => `${accepted.document}@${accepted.version}`),
      },
      subjectId: userId,
      subjectKind: "user",
    }).catch(() => {
      // Nothing further to do: the alert writer is itself best effort.
    });
  }
}

/**
 * STORE-19: the person's own statement that they are 18 or over, kept beside
 * the terms receipt as document `age_18_or_over`, version `18+`.
 *
 * Its own write, so that a failure here can never cost the terms receipt, and
 * its own alert, so a missing row is seen rather than assumed.
 */
async function recordAgeConfirmation(userId: string, source: AcceptanceSource): Promise<void> {
  try {
    const admin = createAdminClient() as unknown as AcceptanceWriter;
    const { error } = await admin.from("terms_acceptances").upsert(
      [{ user_id: userId, document: AGE_DOCUMENT, version: AGE_VERSION, source }],
      { onConflict: "user_id,document,version", ignoreDuplicates: true },
    );
    if (error) throw new Error(error.message);
  } catch {
    await recordAlert({
      kind: "legal.acceptance.unrecorded",
      severity: "warning",
      detail: { source, documents: [`${AGE_DOCUMENT}@${AGE_VERSION}`] },
      subjectId: userId,
      subjectKind: "user",
    }).catch(() => {
      // Nothing further to do: the alert writer is itself best effort.
    });
  }
}

/** The age statement's document name and version in `terms_acceptances`. */
export const AGE_DOCUMENT = "age_18_or_over";
export const AGE_VERSION = "18+";
