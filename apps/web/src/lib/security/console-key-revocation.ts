/**
 * WHICH KEYS MAY OPEN THE CONSOLE (C14, 30 September 2026).
 *
 * One platform key is at once a person's money lock, their passcode unlock
 * and their console proof (`money_credentials` has no purpose column). The
 * break-glass for a lost console key therefore does not delete the key: a
 * super admin revokes its CONSOLE use (`public.console_key_revocations`, with
 * a trigger on `console_step_ups` refusing a proof made with it). The money
 * lock and the passcode unlock keep the key.
 *
 * So the console asks for, and counts, only the keys not revoked for it. A
 * staff member whose every key was revoked is treated as holding no console
 * key: offered enrolment of a new one in the console, on the first-key proof
 * (the emailed code, and the password for an account with one).
 *
 * Until the migration is applied the table does not exist; that reads as
 * "nothing is revoked", never as a failure.
 */

/** The ids that may still prove the console, in their original order. */
export function usableForConsole(ids: readonly string[], revoked: readonly string[]): string[] {
  const gone = new Set(revoked);
  return ids.filter((id) => !gone.has(id));
}

/** A missing revocations table (the migration not applied yet) means nothing is revoked. */
export function revocationsNotInstalled(error: { code?: string | null } | null | undefined): boolean {
  return Boolean(error && (error.code === "PGRST205" || error.code === "42P01"));
}
