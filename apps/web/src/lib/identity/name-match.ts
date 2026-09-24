/**
 * ARE THESE TWO NIGERIAN NAMES THE SAME PERSON? (V-49, and V-04 reads it.)
 *
 * ---------------------------------------------------------------------------
 * WHY `sameAccountName` IS NOT ENOUGH HERE.
 *
 * `lib/payments/bank-resolve.ts` compares two answers from THE SAME BANK for
 * the same account, and there exact equality after folding case and
 * punctuation is right: order is kept, because "NGOZI ADAOBI" and "ADAOBI
 * NGOZI" can be two people. This module answers a different question: does
 * the holder name a bank returned belong to the person whose identity Vallo
 * checked? Those two strings come from different institutions and are written
 * differently for the same human being, routinely:
 *
 *   OKEKE CHIDI EMMANUEL       the bank, surname first, with a middle name
 *   Chidi Okeke                the application, given name first, no middle
 *   CHIEF (DR) C. E. OKEKE     a title, a bracket, and initials
 *   ADEBAYO-OGUNLESI TOLU      a compound surname, hyphenated at one bank
 *   TOLU ADEBAYO OGUNLESI      and spaced at another
 *
 * Exact matching fails every one of those, and a matcher that fails honest
 * people is a matcher staff learn to override, which is worse than none.
 *
 * ---------------------------------------------------------------------------
 * THE RULE, WHICH IS THE ONE THE ENTRY WRITES DOWN.
 *
 *   1. Fold: uppercase, strip accents, turn every non-letter into a space.
 *   2. Strip titles and honorifics (Chief, Alhaji, Engr, Dr, Mrs, Barr, Prof,
 *      Otunba, and the rest below) and generational suffixes (Jnr, Snr).
 *   3. Split hyphenated compounds into their parts. A compound written as one
 *      word ("ADEBAYOOGUNLESI") is joined back when two adjacent tokens on the
 *      other side spell it.
 *   4. The shorter name must have at least two real tokens. One shared word is
 *      never a match: half of Lagos is called Chidi or Tolu.
 *   5. Every token of the shorter name must appear in the longer. An initial
 *      ("C") matches a full token that starts with it, but at most one token
 *      of the shorter name may be carried by an initial, and at least one
 *      full (non-initial) token on each side must match exactly.
 *   6. The surname must match when it is known. When it is not (a free-text
 *      name), the first or last token of the shorter name must appear as a
 *      full token in the longer, because a surname is at one end of a
 *      Nigerian name in every order a bank or a form uses.
 *
 * Order is ignored on purpose, which is the opposite of `sameAccountName`,
 * and it is safe here for one reason: this answer is never the only thing
 * that moves money. A match passes a rung that a person can still reverse,
 * and a no-match goes to a person with both names side by side.
 *
 * ---------------------------------------------------------------------------
 * PURE. No I/O, no logging (both names are personal data, rule 16), no
 * randomness. The reason string is written for the desk's `note` column and
 * names the rule that decided, never the names themselves, so the note can be
 * read by a person without it becoming a second copy of the data.
 */

/** Titles, honorifics and suffixes that are not part of anybody's name. */
export const NAME_TITLES: ReadonlySet<string> = new Set([
  "MR", "MRS", "MS", "MISS", "MADAM", "DR", "DOCTOR", "PROF", "PROFESSOR",
  "ENGR", "ENGINEER", "ARC", "ARCH", "ARCHITECT", "BARR", "BARRISTER", "ESQ", "SAN",
  "CHIEF", "ALHAJI", "ALHAJA", "ALH", "HAJIA", "HAJIYA", "MALLAM", "MALAM", "OTUNBA",
  "SIR", "DAME", "HON", "HONOURABLE", "HONORABLE", "PASTOR", "PST", "REV", "REVEREND",
  "EVANG", "EVANGELIST", "BISHOP", "DEACON", "DEACONESS", "APOSTLE", "PROPHETESS",
  "IMAM", "SHEIKH", "USTAZ", "COL", "CAPT", "CAPTAIN", "GEN", "MAJ", "LT", "SGT", "CPL",
  "CDR", "CMDR", "PHARM", "JNR", "JR", "SNR", "SR", "II", "III", "HRH", "HRM", "AMB",
  "AMBASSADOR", "SENATOR", "SEN", "COMRADE", "COMR",
]);
/* NOT IN THE LIST, ON PURPOSE: Obi, Eze, Igwe and Oba are titles AND common
   surnames ("Peter Obi"), and Prince, Princess, Lady and Elder are given names
   here as often as they are styles. Stripping a real part of somebody's name
   makes a false match easier, so an ambiguous word is kept as a name. */

export type NameMatch = {
  match: boolean;
  /** Why, for the desk's note. Names the rule, never the names. */
  reason: string;
};

/** Upper case, no accents, letters only, split into tokens, titles removed. */
export function nameTokens(raw: string): string[] {
  const folded = raw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]+/g, " ")
    .trim();
  if (folded === "") return [];
  return folded.split(/\s+/).filter((token) => !NAME_TITLES.has(token));
}

function isInitial(token: string): boolean {
  return token.length === 1;
}

/**
 * Does `token` (from the shorter name) appear in `pool` (the longer)? Returns
 * how it matched so the caller can enforce the limits in rule 5, and removes
 * what it used so one token on the long side is never counted twice.
 */
function take(token: string, pool: string[]): "exact" | "initial" | "joined" | null {
  const exact = pool.indexOf(token);
  if (exact >= 0) {
    pool.splice(exact, 1);
    return "exact";
  }
  /* A compound written as one word on this side, as two adjacent words on
     the other: "ADEBAYOOGUNLESI" against "ADEBAYO OGUNLESI". */
  for (let i = 0; i + 1 < pool.length; i += 1) {
    if (pool[i]! + pool[i + 1]! === token) {
      pool.splice(i, 2);
      return "joined";
    }
  }
  if (isInitial(token)) {
    const at = pool.findIndex((candidate) => !isInitial(candidate) && candidate.startsWith(token));
    if (at >= 0) {
      pool.splice(at, 1);
      return "initial";
    }
  }
  return null;
}

/**
 * Are `a` and `b` the same person's name?
 *
 * `surname`, when known (a structured identity record), must appear in both.
 */
export function namesMatch(a: string, b: string, surname?: string | null): NameMatch {
  const left = nameTokens(a);
  const right = nameTokens(b);
  if (left.length === 0 || right.length === 0) return { match: false, reason: "a name was empty" };

  /* The shorter name is the one whose every token must be found. A tie keeps
     the argument order, which does not change the answer. */
  const [short, long] = left.length <= right.length ? [left, right] : [right, left];
  const fullShort = short.filter((token) => !isInitial(token));
  if (fullShort.length < 1 || short.length < 2) {
    return { match: false, reason: "the shorter name has fewer than two parts" };
  }

  if (surname) {
    const surnameTokens = nameTokens(surname);
    const both = [left, right].every((side) => surnameTokens.every((part) => side.includes(part)));
    if (surnameTokens.length === 0 || !both) {
      return { match: false, reason: "the surname on record does not appear in both names" };
    }
  } else {
    const ends = [short[0]!, short[short.length - 1]!].filter((token) => !isInitial(token));
    if (!ends.some((token) => long.includes(token) || long.join("").includes(token))) {
      return { match: false, reason: "neither end of the shorter name appears in the longer" };
    }
  }

  const pool = [...long];
  let initials = 0;
  let exact = 0;
  for (const token of short) {
    const how = take(token, pool);
    if (how === null) return { match: false, reason: "a part of the shorter name is missing from the longer" };
    if (how === "initial") initials += 1;
    else exact += 1;
  }
  if (initials > 1) return { match: false, reason: "more than one part matched only by an initial" };
  if (exact < 1) return { match: false, reason: "no full part matched" };

  const extra = pool.length;
  return {
    match: true,
    reason:
      `every part of the shorter name found in the longer` +
      /* At most one initial reaches here (the check above refuses two). */
      (initials > 0 ? ", one by its initial" : "") +
      (extra > 0 ? `, further parts on the longer (such as a middle name): ${extra}` : "") +
      (surname ? ", surname on record present in both" : ""),
  };
}

/** Company suffixes that do not distinguish one registered name from another. */
const BUSINESS_NOISE: ReadonlySet<string> = new Set([
  "LTD", "LIMITED", "PLC", "NIG", "NIGERIA", "NG", "CO", "COMPANY", "THE", "AND",
  "ENTERPRISE", "ENTERPRISES", "VENTURE", "VENTURES", "GLOBAL", "INTL", "INTERNATIONAL",
  "SERVICES", "SERVICE", "RC", "BN",
]);

/**
 * Does a bank's holder name match a CAC registered name? Firms only.
 *
 * Stricter than a person's name, because a company has no middle names: every
 * distinguishing word of the registered name must appear in the holder name,
 * and there must be at least one. "ACME PROPERTIES NIG LTD" matches "Acme
 * Properties Limited"; "ACME LTD" does not match "Acme Properties Limited".
 */
export function businessNamesMatch(holder: string, registered: string): NameMatch {
  const words = (raw: string) =>
    raw
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/&/g, " AND ")
      .replace(/[^A-Z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter((word) => word !== "" && !BUSINESS_NOISE.has(word));
  const need = words(registered);
  const have = new Set(words(holder));
  if (need.length === 0) return { match: false, reason: "the registered name has no distinguishing word" };
  if (!need.every((word) => have.has(word))) {
    return { match: false, reason: "a distinguishing word of the registered name is missing" };
  }
  if (have.size !== need.length) {
    return { match: false, reason: "the holder name carries words the registered name does not" };
  }
  return { match: true, reason: "every distinguishing word of the registered name present, and no other" };
}

/**
 * Does `holder` match ANY of the names on record for one person? The first
 * match wins; with none, the reason is the last one tried, which is enough for
 * a desk note and names no name.
 */
export function matchesAnyName(holder: string, onRecord: readonly string[]): NameMatch {
  let last: NameMatch = { match: false, reason: "no verified name on record" };
  for (const name of onRecord) {
    const result = namesMatch(holder, name);
    if (result.match) return result;
    last = result;
  }
  return last;
}

/**
 * Does `holder` share ANY name with any name on record? Used only to decide
 * how loudly a no-match is drawn (V-04): sharing a surname with the lister is
 * a mismatch the reader should weigh, sharing nothing at all is a total one.
 * Company suffixes are ignored, so "LTD" alone is never a shared name.
 */
export function sharesAName(holder: string, onRecord: readonly string[]): boolean {
  const mine = new Set(nameTokens(holder).filter((t) => t.length > 1 && !BUSINESS_NOISE.has(t)));
  return onRecord.some((name) => nameTokens(name).some((t) => t.length > 1 && mine.has(t)));
}
