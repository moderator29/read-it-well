/**
 * "FINISH SETTING UP": THE TERMS AND 18+ STEP FOR A GOOGLE OR APPLE ACCOUNT
 * (B-2, STORE-19, NEW-A4-04).
 *
 * An account made with Google or Apple never passes the sign-up form, so it
 * arrives with no terms receipt and no 18-or-over statement. This module is
 * the pure half of the step that asks for both: which sessions owe it, which
 * requests the gate holds, and when the record on file is complete. Pure and
 * framework free, so `proxy.ts` (edge) and the server pages read ONE rule and
 * every branch is tested without a network.
 *
 * THE RECORD IS `public.terms_acceptances`, the same table and the same writer
 * (`recordTermsAcceptance`) the email sign-up uses, with the source
 * `signup_oauth`. Nothing new is stored about the person. The one extra fact
 * is a flag in the account's `app_metadata` (writable by the service role
 * only, so a person cannot set it on themselves) that lets the edge gate skip
 * the database read once the step is done. The flag is a shortcut, never the
 * authority: without it the gate reads the table, and the table decides.
 */

/** Where the step lives. Inside `(auth)`, so no app shell or passcode lock. */
export const FINISH_SETUP_PATH = "/sign-up/finish";

/**
 * The `app_metadata` key set, with the service role, once the receipt is on
 * file. A person cannot write `app_metadata` (only `user_metadata`), so a
 * forged flag is not possible from a browser.
 */
export const SETUP_DONE_CLAIM = "vallo_setup_done";

/** The two documents whose rows mean the step is done. */
export const REQUIRED_DOCUMENTS = ["terms", "age_18_or_over"] as const;

/** Every sign-in method that goes through a form that already asks. */
const FORM_PROVIDERS = new Set(["email", "phone"]);

type Claims = {
  app_metadata?: { provider?: unknown; providers?: unknown; [key: string]: unknown } | null;
} | null | undefined;

/** The sign-in methods the account holds, read off the verified token. */
export function accountProviders(claims: Claims): string[] {
  const meta = claims?.app_metadata;
  if (!meta || typeof meta !== "object") return [];
  const listed = Array.isArray(meta.providers)
    ? meta.providers.filter((p): p is string => typeof p === "string" && p.length > 0)
    : [];
  if (listed.length > 0) return listed;
  return typeof meta.provider === "string" && meta.provider.length > 0 ? [meta.provider] : [];
}

/**
 * Whether this session MAY owe the step, from the token alone.
 *
 * True for an account that holds only social methods (Google, Apple, any
 * other OAuth) and carries no done flag. An account with an email identity
 * made it through the sign-up form, which refuses without both ticks, so it
 * is never held here. A token with no provider information at all is not
 * held either: the gate only ever stops what it can name.
 */
export function mayOweSetup(claims: Claims): boolean {
  if (claims?.app_metadata?.[SETUP_DONE_CLAIM] === true) return false;
  const providers = accountProviders(claims);
  if (providers.length === 0) return false;
  return providers.every((provider) => !FORM_PROVIDERS.has(provider));
}

/** True when the rows on file hold both the terms and the age statement. */
export function setupRecordComplete(
  rows: ReadonlyArray<{ document?: string | null }> | null | undefined,
): boolean {
  const held = new Set((rows ?? []).map((row) => row.document));
  return REQUIRED_DOCUMENTS.every((document) => held.has(document));
}

/**
 * Which requests the gate may hold, by address and kind.
 *
 * NEVER HELD, and each for a reason:
 *   - the step itself and every auth door (they are public segments), so it
 *     can never loop;
 *   - the legal pages, public (`/terms`, `/privacy`, `/eula`, `/disclaimer`)
 *     and in-app (`/legal/...`): a person asked to agree to a document must be
 *     able to read it;
 *   - `/api/...`: answered by the route, never redirected;
 *   - a server action POST, which is how signing out works from any screen:
 *     a 307 to a page would break the action and could trap somebody who only
 *     wanted to leave;
 *   - anything that is not a GET or HEAD.
 *
 * `isPublic` is the proxy's own answer for the address, so the gate holds
 * exactly the addresses the signed-out wall holds, and no others.
 */
export function finishSetupGateApplies(input: {
  path: string;
  method: string;
  isPublic: boolean;
  isServerAction: boolean;
}): boolean {
  if (input.method !== "GET" && input.method !== "HEAD") return false;
  if (input.isServerAction) return false;
  if (input.isPublic) return false;
  const path = input.path.replace(/\/+$/, "") || "/";
  if (path === "/api" || path.startsWith("/api/")) return false;
  if (path === "/legal" || path.startsWith("/legal/")) return false;
  if (path === FINISH_SETUP_PATH || path.startsWith("/sign-out")) return false;
  return true;
}

/**
 * The step's address, carrying where the person was going. `next` must
 * already be a safe path (the proxy passes `safeReturnPath`'s answer); a step
 * address is never carried, so the step cannot point back at itself.
 */
export function finishSetupHref(next: string | null | undefined): string {
  if (!next || next === FINISH_SETUP_PATH || next.startsWith(`${FINISH_SETUP_PATH}?`)) {
    return FINISH_SETUP_PATH;
  }
  return `${FINISH_SETUP_PATH}?next=${encodeURIComponent(next)}`;
}

/**
 * The name to put in the fields, from what the provider sent.
 *
 * The profile row is preferred (the sign-up trigger already split the
 * provider's name into it); the provider's own metadata is the fallback
 * (Google's `given_name` / `family_name`, or a `full_name` / `name` split at
 * the last space). Apple sends a name only on the very first sign-in and
 * sometimes not at all, so empty fields are a normal answer.
 */
export function prefillName(input: {
  profile?: { first_name?: string | null; surname?: string | null } | null;
  metadata?: Record<string, unknown> | null;
}): { firstName: string; surname: string } {
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const first = text(input.profile?.first_name);
  const last = text(input.profile?.surname);
  if (first || last) return { firstName: first, surname: last };
  const meta = input.metadata ?? {};
  const given = text(meta.given_name) || text(meta.first_name);
  const family = text(meta.family_name) || text(meta.surname);
  if (given || family) return { firstName: given, surname: family };
  const full = text(meta.full_name) || text(meta.name);
  if (!full) return { firstName: "", surname: "" };
  const cut = full.lastIndexOf(" ");
  return cut > 0
    ? { firstName: full.slice(0, cut).trim(), surname: full.slice(cut + 1).trim() }
    : { firstName: full, surname: "" };
}
