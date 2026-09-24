/**
 * V-09: CONTACT DETAILS OUT OF A PASTED BROADCAST, WHATEVER SHAPE THEY ARE IN.
 *
 * A broadcast is written to be read by a person, and people write numbers in
 * every shape a filter would miss: "(0803) 123 4567", "0803/123/4567",
 * "0803 x 123 x 4567", "O8O3 123 4567" with the letter O, full-width digits,
 * "zero eight zero three ...", "0803 one two three 4567", "0 8 0 3 1 2 ...".
 * Review found each of those surviving the first version, which matched
 * shapes. This one NORMALISES FIRST, then classifies:
 *
 *   1. Compatibility normalisation (NFKC), so full-width and other
 *      look-alike digits become ASCII digits.
 *   2. A chain of at least seven spelled or written digits ("zero eight zero
 *      three one two three ...", "080three1234567") becomes digits. Seven, so
 *      ordinary prose ("one or two rooms") is never touched.
 *   3. Every run of digits (and the letter O between or beside digits) joined
 *      by short separators (spaces, dots, dashes, slashes, underscores, "x",
 *      brackets, a plus) is examined group by group, and the longest stretch
 *      of whole groups that reads as a Nigerian mobile (0 or 234, then 7, 8
 *      or 9, then 0 or 1, eight more digits), a landline (01 and seven or
 *      eight digits, or another 0 area code), or a ten digit account number is
 *      removed and reported. A figure with a naira sign in front is money and
 *      is left for the money reader.
 *   4. Handles by platform word ("IG: vallo_homes", "ig vallohomes", "insta
 *      ...", "tiktok ..."), and spelled email addresses ("ade at gmail dot
 *      com").
 *
 * What it does not claim: that no contact can survive. A person determined to
 * smuggle a number past any reader can ("call me, the first digit is the
 * number of fingers on..."). What it does is remove every form in the review's
 * list and the ordinary variations of each, tested in `contacts.test.ts`, and
 * list back to the agent what it removed.
 */

export type ContactHit = { kind: "phone" | "account" | "handle" | "email"; text: string };

/**
 * Where something was removed. Left in the text so the caller can take the
 * words that led up to it ("call", "WhatsApp me on") with it, then replaced by
 * a space (`CUT_MARK_RE`).
 */
export const CUT_MARK = "\u2063";
export const CUT_MARK_RE = /\u2063/g;

const DIGIT_WORDS: Readonly<Record<string, string>> = {
  zero: "0",
  oh: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
};

const DIGIT_TOKEN = "(?:\\d|zero|oh|one|two|three|four|five|six|seven|eight|nine)";
/**
 * Seven or more digit tokens, glued or separated by spaces, dashes, dots,
 * commas, or "and" / "then" ("eight zero three, one two three, four ...").
 */
const CHAIN_SEP = "(?:[\\s,.-]|\\band\\b|\\bthen\\b)*";
const SPELLED_CHAIN = new RegExp(`(?<![a-z])${DIGIT_TOKEN}(?:${CHAIN_SEP}${DIGIT_TOKEN}){6,}(?![a-z])`, "gi");

/**
 * A run: digits (or O next to digits) joined by at most three separator
 * characters. Separators: space, dot, dash, slash, underscore, x, brackets.
 */
/* Any short run of non-alphanumeric characters (up to five) joins digit
   groups: spaces, dots, commas, slashes, pipes, stars, tildes, semicolons,
   brackets, dashes. And "x", which people write between groups. */
const RUN = /[+(]?[\dOo](?:[\dOo]|(?:[^\p{L}\p{N}\n]{1,5}|\s?x\s?)(?=[+(]?[\dOo]))*\)?/gu;

const MOBILE = /^(?:0|234|2340)[789][01]\d{8}$/;
const LANDLINE = /^0[1-9]\d{6,8}$/;
const ACCOUNT = /^\d{10}$/;

function classify(compact: string): "phone" | "account" | null {
  if (MOBILE.test(compact)) return "phone";
  if (ACCOUNT.test(compact)) return "account";
  if (LANDLINE.test(compact) && compact.length >= 9) return "phone";
  return null;
}

type Group = { start: number; end: number; digits: string };

function groupsOf(run: string): Group[] {
  const out: Group[] = [];
  const re = /[\dOo]+/g;
  for (const m of run.matchAll(re)) {
    const digits = m[0].replace(/[Oo]/g, "0");
    out.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, digits });
  }
  return out;
}

/**
 * Normalise, then remove every contact detail and say what each was. Returns
 * the text with each removed stretch replaced by `CUT_MARK`.
 */
export function stripContacts(message: string): { text: string; hits: ContactHit[] } {
  const hits: ContactHit[] = [];
  let text = message.normalize("NFKC");
  /* Invisible format characters (zero-width spaces and joiners) are
     removed, so a number split by them is one number. */
  text = text.replace(/\p{Cf}/gu, "");
  /* Every dash is a dash and an ellipsis is dots, so "0803\u2014123\u20144567"
     and "0803 ...123... 4567" are runs like any other. */
  text = text.replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-").replace(/\u2026/g, "...");
  /* "0803 and 1234567", "0803 and then 1234567": two groups of digits joined
     by words are still one number. Only between groups of three or more
     digits, so "2 and 3 bedrooms" is untouched. */
  text = text.replace(/(\d{3,})(?:\s+(?:and|then|or|plus|after|that|also)){1,3}\s+(?=\d{3,})/gi, "$1 ");
  /* Letters that stand in for digits inside a number: O for zero, I and l
     for one ("o8o3 i23 4567", "08O3l234567"). Only in a token made of
     digits and those letters that holds at least two real digits, so words
     are never touched. */
  text = text.replace(/(?<![\p{L}\p{N}])[0-9oOiIlL]*\d[0-9oOiIlL]*\d[0-9oOiIlL]*(?![\p{L}\p{N}])/gu, (token) =>
    token.replace(/[oO]/g, "0").replace(/[iIlL]/g, "1"),
  );

  /* 2. Spelled digit chains to digits. */
  text = text.replace(SPELLED_CHAIN, (chain) => {
    /* A chain of plain digits is left for the run reader below, so a price
       like "2500000" keeps its place in the sentence. */
    if (!/[a-z]/i.test(chain)) return chain;
    const digits = chain
      .replace(/\b(?:and|then)\b/gi, " ")
      .replace(/zero|oh|one|two|three|four|five|six|seven|eight|nine/gi, (w) => DIGIT_WORDS[w.toLowerCase()] ?? w)
      .replace(/[^\d]/g, "");
    return ` ${digits} `;
  });

  /* 3. Runs of digits, examined group by group. */
  text = text.replace(RUN, (run, offset: number, whole: string) => {
    const before = whole.slice(Math.max(0, offset - 2), offset);
    const isMoney = /[₦#]\s?$|\bn\s?$|\bN\s?$/.test(before);
    const groups = groupsOf(run);
    if (groups.length === 0) return run;
    /* Every group must hold at least one real digit to count; "Ooo" is a word. */
    let best: { i: number; j: number; kind: "phone" | "account"; compact: string } | null = null;
    for (let i = 0; i < groups.length; i++) {
      let compact = "";
      for (let j = i; j < groups.length; j++) {
        compact += groups[j]!.digits;
        if (compact.length > 14) break;
        const kind = classify(compact);
        if (!kind) continue;
        if (kind === "account" && isMoney && i === 0) continue;
        if (!best || j - i > best.j - best.i || compact.length > best.compact.length) best = { i, j, kind, compact };
      }
    }
    if (!best) return run;
    const from = groups[best.i]!.start;
    const to = groups[best.j]!.end;
    /* The digit runs must be real digits in the majority: "Oooo 1" is not a number. */
    const raw = run.slice(from, to);
    if ((raw.match(/\d/g) ?? []).length < Math.ceil(best.compact.length * 0.6)) return run;
    hits.push({ kind: best.kind, text: raw.trim() });
    const lead = run.slice(0, from).replace(/[+(]\s*$/, "");
    const tail = run.slice(to).replace(/^\s*\)/, "");
    return `${lead} ${CUT_MARK} ${tail}`;
  });

  /* 4a. Handles named by their platform. */
  text = text.replace(
    /\b(?:ig|insta(?:gram)?|tiktok|tik\s?tok|twitter|snap(?:chat)?|fb|facebook|telegram|tg)\b\s*(?:handle|page|id)?\s*[:@-]?\s*@?([a-z0-9_.]{3,30})\b/gi,
    (all, handle: string) => {
      if (/^(?:handle|page|only|for|and|or|dm|me|us|the|is)$/i.test(handle)) return all;
      hits.push({ kind: "handle", text: all.trim() });
      return ` ${CUT_MARK} `;
    },
  );
  /* 4b. Spelled email addresses: "ade at gmail dot com". */
  text = text.replace(
    /\b[\w.+-]+\s*(?:\(at\)|\[at\]|\bat\b)\s*[\w-]+\s*(?:\(dot\)|\[dot\]|\bdot\b|\.)\s*(?:com|ng|net|org|co|io)\b(?:\s*(?:\(dot\)|\bdot\b|\.)\s*ng\b)?/gi,
    (all) => {
      hits.push({ kind: "email", text: all.trim() });
      return ` ${CUT_MARK} `;
    },
  );

  return { text, hits };
}
