import "server-only";

import { recordAlert } from "../alerts/record";

/**
 * OPS-04: a catalogue read that FAILED is not a catalogue that is EMPTY.
 *
 * The listing reads return `[]` or `null` on an error so a broken database
 * never becomes a crashed page, and that stays true. What changes is that the
 * failure is no longer silent: the 11.5-hour outage (`42501 permission denied
 * for function owns_listing`) rendered as "0 properties" on every surface and
 * logged nothing, so the first person to know was the founder.
 *
 * Every error branch in the catalogue reads calls this. It writes one line to
 * the function log (code and surface, never a row or a parameter) and opens a
 * critical `catalogue.read_failed` alert, which `recordAlert` folds into one
 * open row per surface for ten minutes and which pages a human
 * (`lib/ops/page.ts`). A read that succeeds with zero rows does NOT come here:
 * that is the honest empty state.
 *
 * Never throws: the caller is already handling a failure.
 */
export async function catalogueReadFailed(surface: string, error: unknown): Promise<void> {
  const code = errorCode(error);
  console.error(`[catalogue] read failed surface=${surface} code=${code}`);
  try {
    await recordAlert({
      kind: "catalogue.read_failed",
      severity: "critical",
      detail: { surface, code },
      subjectId: surface,
      subjectKind: "catalogue",
    });
  } catch {
    /* recordAlert does not throw; this is the belt to its braces. */
  }
}

/** A short machine code for an error: PostgREST's `code`, else the class name. */
export function errorCode(error: unknown): string {
  if (error && typeof error === "object") {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && code.length > 0) return code.slice(0, 40);
    const name = (error as { name?: unknown }).name;
    if (typeof name === "string" && name.length > 0) return name.slice(0, 40);
  }
  return "unknown";
}
