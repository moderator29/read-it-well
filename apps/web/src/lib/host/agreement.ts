/**
 * The host's recorded agreement to the Terms, the Privacy policy and the Host
 * Agreement (founder decision B), read out of `businesses.consents.agreements`
 * (`[{document, version, at}]`, appended by `saveHostDraft`).
 *
 * Pure: the wizard's draft read, the review desk and the publish gates all
 * read it the same way. Anything malformed is skipped rather than thrown on.
 */

/** The newest Host Agreement version recorded, or null when none is. */
export function readHostAgreementVersion(value: unknown): string | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const list = (value as Record<string, unknown>).agreements;
  if (!Array.isArray(list)) return null;
  let latest: { version: string; at: string } | null = null;
  for (const entry of list) {
    const row = (entry ?? {}) as Record<string, unknown>;
    if (row.document !== "host_agreement" || typeof row.version !== "string" || typeof row.at !== "string") continue;
    if (!latest || row.at > latest.at) latest = { version: row.version, at: row.at };
  }
  return latest?.version ?? null;
}
