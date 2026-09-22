import "server-only";

import type { AdminClient } from "./rpc";

/**
 * IS THE OBJECTIONABLE CONTENT FILTER ACTUALLY FILTERING ANYTHING.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS, AND IT IS THE DAY'S LESSON IN ITS PUREST FORM.
 *
 * `private.scan_post()` and `private.scan_social_profile()` hold a post or a
 * bio for human review when it matches `private.objectionable_pattern()`. That
 * function builds its regular expression from `public.blocked_terms`:
 *
 *     select case when count(*) = 0 then null
 *                 else '\m(' || string_agg(term, '|') || ')\M' end
 *       from public.blocked_terms;
 *
 * **On an empty table it returns null, and both scanners skip the abuse branch
 * entirely.** No error, no warning, no row anywhere. The filter is installed,
 * wired, covered by its migration, and holding nothing at all, and every
 * surface that reports on it says the same thing it would say if it were
 * working perfectly.
 *
 * That is a green light that cannot see what it is reporting on, built out of
 * a `case when count(*) = 0 then null`. It is the seventh of its shape found
 * on this build in a day and the only one that was designed in rather than
 * introduced by mistake: the table ships empty ON PURPOSE, because the term
 * list is the founder's decision and not an engineer's. The emptiness is
 * correct. **The silence about it is not.**
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS CHANGES, AND WHAT IT DELIBERATELY DOES NOT.
 *
 * It does not seed the list. Writing a list of slurs into a repository is its
 * own problem, and a content policy is a decision with real consequences for
 * real people: a careless list holds legitimate posts and teaches the desk to
 * wave things through. The boundary the migration drew stands.
 *
 * It makes the state VISIBLE. While the list is empty, every run of the
 * scheduled watch says so, at a severity that matches what is actually true:
 * the platform is accepting user-generated content with no objectionable
 * content filter in force. **Apple guideline 1.2 asks for that filter.** An
 * empty list is not a configuration detail, it is a submission blocker, and it
 * should read as one on the desk rather than being discovered by a reviewer.
 *
 * The reverse case matters as much. Once the list is seeded, this reports the
 * count on every run, so "the filter is on" stops being a thing anybody has to
 * take on trust.
 */

export type ContentFilterState = {
  /** null when the table could not be read at all, which is its own fault. */
  terms: number | null;
  /** Why the desk is being told, or null when there is nothing to say. */
  reason: "unreadable" | "empty" | null;
};

/**
 * Read the term count with the service client.
 *
 * `public.blocked_terms` has RLS on and is revoked from `anon` and
 * `authenticated`, so only the service role and the definer functions can see
 * it. That is correct: the list of things we watch for is not something to
 * hand to the people we are watching for them.
 *
 * A read failure is NOT reported as an empty list. Those are different facts
 * and collapsing them is how a broken connection starts reading as a policy
 * decision.
 */
export async function readContentFilter(admin: AdminClient): Promise<ContentFilterState> {
  /*
   * A NARROW CAST, AND IT COMES OUT ON THE NEXT REGENERATION.
   *
   * `public.blocked_terms` was created on the evening of 22 September and
   * `database.types.ts` is generated from the live schema and has not been
   * regenerated since. Hand-editing that file would make the type system
   * assert a schema that may not exist, which is the invisible kind of claim
   * that caused a shipping defect on this build already. So the cast is here,
   * it is one line, it is commented, and it disappears the moment somebody
   * regenerates against an estate where the migration has run.
   */
  const { count, error } = await (admin as unknown as {
    from: (table: string) => {
      select: (
        columns: string,
        options: { count: "exact"; head: true },
      ) => PromiseLike<{ count: number | null; error: unknown }>;
    };
  })
    .from("blocked_terms")
    .select("term", { count: "exact", head: true });

  if (error) return { terms: null, reason: "unreadable" };
  const terms = count ?? 0;
  return { terms, reason: terms === 0 ? "empty" : null };
}

/**
 * What the desk is told. Null when the filter is genuinely in force, because a
 * working filter does not need to announce itself every hour.
 */
export function contentFilterAlert(state: ContentFilterState) {
  if (state.reason === null) return null;

  if (state.reason === "unreadable") {
    return {
      kind: "content.filter.unreadable",
      severity: "critical" as const,
      detail: {
        filtering: false,
        terms: null,
        why: "public.blocked_terms could not be read by the service client, so it is not known whether the objectionable content filter is in force. This is not the same as the list being empty.",
        fix: "Check the table exists and the service role can read it. The scanners are private.scan_post and private.scan_social_profile.",
      },
      subjectId: "blocked_terms",
      subjectKind: "content_filter",
    };
  }

  return {
    kind: "content.filter.empty",
    severity: "critical" as const,
    detail: {
      filtering: false,
      terms: 0,
      why: "public.blocked_terms holds no rows, so private.objectionable_pattern() returns null and BOTH scanners skip the abuse branch. Posts and bios are being accepted with no objectionable content filter in force. The fraud checks (account numbers, payment language) are unaffected and still run.",
      store_risk: "Apple guideline 1.2 asks for a filter for objectionable material. This is a submission blocker, not a configuration detail.",
      fix: "The term list is the founder's decision and is deliberately not seeded by an engineer. Insert the agreed terms into public.blocked_terms; the scanners pick them up on the next write with no deploy.",
    },
    subjectId: "blocked_terms",
    subjectKind: "content_filter",
  };
}
