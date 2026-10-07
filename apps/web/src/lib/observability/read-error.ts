import "server-only";

import { reportError } from "./report";

/**
 * A SERVER READ THAT SUPABASE REFUSED, SAID TO US AS WELL AS TO THE SCREEN
 * (D49.3, the half the catch blocks did not cover).
 *
 * Supabase does not throw when a query fails: it RETURNS `{ data: null, error }`.
 * A read that answers that with its honest empty or unavailable state is right
 * for the member, and was silent for us, so schema drift or a row level
 * security policy refusing the read looked like "nothing here" in production
 * for ever. Each such read now hands its returned error(s) here first, with a
 * `read.<area>.<read>` token naming it, and then answers exactly as before.
 *
 * Call it unconditionally just before the branch that tests the error: a null
 * or undefined error is the ordinary case and sends nothing, so a genuinely
 * empty answer is never reported.
 *
 * What is sent is the error's `code` and `message` only. A Postgrest error's
 * `details` and `hint` are where row values turn up ("Key (handle)=(ada)
 * already exists"), so they are left behind rather than trusted to the
 * scrubber. Like `reportError` it never throws: the caller is already
 * answering a failure.
 */
export class SupabaseReadError extends Error {
  readonly code: string | null;
  constructor(code: string | null, message: string) {
    super(code ? `${code}: ${message}` : message);
    this.name = "SupabaseReadError";
    this.code = code;
  }
}

/** The returned error, reduced to what may leave the process. */
export function toReadError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (error && typeof error === "object") {
    const { code, message } = error as { code?: unknown; message?: unknown };
    return new SupabaseReadError(
      typeof code === "string" && code.length > 0 ? code : null,
      typeof message === "string" && message.length > 0 ? message : "supabase read returned an error",
    );
  }
  return new SupabaseReadError(null, typeof error === "string" ? error : "supabase read returned an error");
}

/**
 * Report each error a read was handed back, under the read's own token.
 * Nullish errors are skipped, so `reportReadError("read.x", a.error, b.error)`
 * says only what failed.
 */
export async function reportReadError(kind: `read.${string}`, ...errors: unknown[]): Promise<void> {
  for (const error of errors) {
    if (error === null || error === undefined || error === false) continue;
    try {
      await reportError({ error: toReadError(error), context: { kind } });
    } catch {
      /* reportError does not throw; this is the belt to its braces. */
    }
  }
}

/**
 * PostgREST's "no function matches" (PGRST202) and Postgres's "undefined
 * function" (42883): the read is NOT DEPLOYED YET, by code only, the same rule
 * `lib/money/rpc.ts` (MON-12) uses to tell an absent rail from a broken one.
 */
const NOT_DEPLOYED_CODES = new Set(["PGRST202", "42883"]);

/** Whether a returned error means the function is not deployed yet, rather than that it failed. */
export function isNotDeployed(error: unknown): boolean {
  const code = error && typeof error === "object" ? (error as { code?: unknown }).code : null;
  return typeof code === "string" && NOT_DEPLOYED_CODES.has(code);
}

/**
 * For a read whose absence is intended until its function lands (the money
 * reads while the rail is off): the not-deployed answer stays silent, because
 * it is the expected state and reporting it would bury real faults under one
 * report a minute; every other returned error is reported like any read.
 */
export async function reportReadFault(kind: `read.${string}`, ...errors: unknown[]): Promise<void> {
  await reportReadError(kind, ...errors.filter((error) => !isNotDeployed(error)));
}
