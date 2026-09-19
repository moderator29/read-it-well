import { createHash, randomBytes } from "node:crypto";

/**
 * The code that undoes a deletion.
 *
 * WHY IT EXISTS. The account is banned for the whole thirty day window, which
 * is what "deactivated" means here and is enforced by the auth server rather
 * than by a flag the app has to remember to check. A banned account cannot be
 * signed into, so a person who changes their mind on day nine cannot sign in
 * to say so. The code is the route back that needs no session: it arrives in
 * the email that confirms the request, and the only thing it can do is CANCEL
 * a deletion. A leaked code therefore fails in the safe direction: an account
 * survives that would otherwise have gone.
 *
 * WHAT IS STORED. A SHA-256 hash, and never the code. The code exists in one
 * email and in the reader's hands. It is not a personal identifier and it is
 * never logged, which keeps rule 16 whole.
 *
 * THE ALPHABET. Crockford's, minus the letters a reader confuses with digits,
 * because this is a string somebody copies off a phone screen into a form.
 * Twenty bits of entropy per group, two groups, so a guesser needs on the
 * order of a trillion attempts and the cancel path is not a place anybody
 * profits from guessing anyway.
 */

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const GROUP = 5;

/** A fresh code, formatted as two groups for a human to read aloud. */
export function newRestoreCode(): string {
  const bytes = randomBytes(GROUP * 2);
  let out = "";
  let index = 0;
  for (const byte of bytes) {
    if (index === GROUP) out += "-";
    out += ALPHABET.charAt(byte % ALPHABET.length);
    index += 1;
  }
  return out;
}

/**
 * The stored form. Case and the separating dash are both forgiven, because a
 * person retyping a code from an email will get one of them wrong and being
 * strict about punctuation is a way of losing somebody's account.
 */
export function hashRestoreCode(code: string): string {
  const normalised = code.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
  return createHash("sha256").update(normalised).digest("hex");
}

/** True when the string could be a code at all, before the database is asked. */
export function looksLikeRestoreCode(code: string): boolean {
  return /^[0-9a-zA-Z]{10}$/.test(code.replace(/[^0-9a-zA-Z]/g, ""));
}
