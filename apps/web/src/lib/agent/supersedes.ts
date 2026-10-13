/**
 * WHICH EARLIER DOCUMENT A NEW ONE REPLACES.
 *
 * A filed document is never edited or deleted. A resubmission is a new
 * `agent_documents` row whose `supersedes_id` names the row it replaces, so a
 * reviewer sees every attempt and what was wrong with each, and the ladder
 * counts only the current one (the draft in
 * supabase/migrations/pending/20261012103000_*).
 *
 * The rejected document is the one a resubmission answers, so it is preferred.
 * "The newest of that kind" alone picked the wrong row whenever a person held
 * two documents of one kind, which the professional application files for
 * every applicant (both sides of an ID card are two `identity` rows): the
 * approved back could be superseded while the rejected front stayed current.
 *
 * Pure, so the two server actions that file documents and their tests read
 * one rule.
 */

export type FiledDocument = {
  id: string;
  kind: string;
  review_status: string | null;
  supersedes_id: string | null;
};

/**
 * The id of the row a new document of `kind` should supersede, or null.
 *
 * `rows` are this uploader's own documents, NEWEST FIRST. A row some other row
 * already supersedes is history and is never chosen. The newest current
 * rejected row of the kind wins; failing that, `fallbackToLatest` picks the
 * newest current row of the kind, which is what a full resubmission of the
 * verification flow means. Without it, nothing that was not refused is
 * replaced, so a document sent in answer to a reviewer adds to the file
 * rather than quietly retiring one a reviewer already approved.
 */
export function documentToSupersede(
  rows: readonly FiledDocument[],
  kind: string,
  { fallbackToLatest }: { fallbackToLatest: boolean },
): string | null {
  const replaced = new Set(rows.map((row) => row.supersedes_id).filter((id): id is string => Boolean(id)));
  const current = rows.filter((row) => row.kind === kind && !replaced.has(row.id));
  const rejected = current.find((row) => row.review_status === "rejected");
  if (rejected) return rejected.id;
  return fallbackToLatest ? (current[0]?.id ?? null) : null;
}
