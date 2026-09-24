/**
 * NAME MATCHING FOR SANCTIONS SCREENING. SCUML item 8.
 *
 * Pure. A name is NORMALISED before it is compared: case folded, diacritics
 * removed (Ọ̀ becomes o, é becomes e), punctuation and hyphens turned into
 * spaces, honorifics dropped, and the words SORTED, so "Musa Ibrahim",
 * "IBRAHIM, Musa" and "Ibrahim Músa" are one name. A listed person is
 * matched on the primary name and on every alias.
 *
 * Two kinds of match, recorded separately:
 *   - EXACT: the normalised names are the same words, every token counted.
 * For FUZZY scoring only, one-letter tokens and two-letter ones that are not
 * a handled particle (Al, El, Ul, Md) are dropped while two real words remain
 * (`dropJunk`), so padding "a b c d" cannot dilute a match, and dropping
 * "Ag" or "Ri" can never make a partial name exact.
 *   - FUZZY: close but not the same, scored 0..1, and raised only at or above
 *     `FUZZY_THRESHOLD`. The score is the better of two views: the whole
 *     sorted string by edit distance, and word by word (each word of the
 *     shorter name against its best partner in the longer one, by Jaro-Winkler,
 *     weighted by length), so a missing middle name or a transliteration
 *     ("Mohammed"/"Muhammad") still scores high while two names that only
 *     share a common surname do not.
 * TRANSLITERATION. Before scoring (and indexing), each word is FOLDED to a
 * rough sound: "ph" to f, "ou"/"oo" to u, "kh" to k, "q" and a "c" not in
 * "ch" to k, doubled letters to one, then o to u and e to a, a leading "wu"
 * to u (Ould/Wuld), a final y after a consonant to i (Ghaly/Ghali), and an assimilated article back to Abdul (Abdurrahman,
 * Abdussalam), so "Mohammed Yousef" and "Muhammad Yusuf" land on the same
 * letters. Exact still means the unfolded names are the same words; a match
 * only through folding is fuzzy.
 *
 * ABBREVIATIONS AND ARTICLES. "Mohd", "Muhd", "Mhd" and "Md" read as
 * Muhammad; a standalone "al"/"el" is dropped and a joined one split off
 * before a consonant ("Alhassan" and "Al Hassan" are the same word; "Aliyu"
 * is left alone). A standalone "Abdul"/"Abd" is also tried joined to each
 * other word ("Abdul Rahman" is Abdulrahman; names are stored sorted, so the
 * word that followed it is not known).
 *
 * NEVER ON ONE WORD OR ON PART OF A LISTING. A single-word name from our side
 * is never matched, exact or not: one word is not a person. The LISTED
 * name's words must be COVERED by ours, ONE TO ONE: each of our words covers
 * at most one listed word, and the pairing chosen is the best over all
 * pairings (so "Muhammad Musa" never covers "Muhammad Mustafa Musa"). A word
 * covers another when:
 *   - they fold to the same letters, or are the same but for a y between
 *     vowels (Aliyu/Aliu);
 *   - their edit ratio is at least 0.85; or
 *   - they have the same consonants (three or more), the same first letter
 *     and an edit ratio of at least 0.7 (Yousef/Yusuf, Khaled/Khalid,
 *     Tahiru/Tahir), which keeps apart names that only share consonants:
 *     Muhammad/Mahmud, Karim/Akram, Kabir/Akbar, Salim/Aslam/Islam,
 *     Bashir/Bushra, Rashid/Rushdi. Hassan and Hussein are kept apart ON
 *     PURPOSE: Hasan and Husayn are two different names (brothers, both
 *     widely borne), not two spellings of one, while Hussein/Hussaini/Husain
 *     are one name and still cover each other. Stated cost: one-vowel pairs
 *     such as Jamil/Jamal and Rashid/Rashad cover each other, exactly as
 *     Khaled/Khalid must; telling them apart needs a dictionary, and a
 *     missed match is worse than a wrong one.
 * An "Abdul-" word is compared on what follows the prefix, a final i or u
 * being optional (Abdullah/Abdullahi/Abdallah), so a shared prefix never
 * covers a word by itself: Abdulkadir never covers Abdullahi.
 *
 * Every listed word must be covered for a listing of three words or fewer. A
 * longer one needs two thirds, each word weighted by how RARE it is, across
 * the lists AND the names we screen, with names common in Nigeria (Bello,
 * Usman, Garba, Musa, Ibrahim, Abubakar...) capped low; and at least one
 * covered word must be a distinctive one, UNLESS every word of a name of ours
 * of three or more words is found in the listing ("Abubakar Muhammad Bello"
 * inside "Abubakar Muhammad Bello Usman").
 *
 * A listing covered word for word is SCORED ON THE WORDS THAT COVER IT, so
 * extra words on our side cannot pull the score under the threshold. At most
 * MAX_OUR_WORDS of our words are paired with one listing: those that cover
 * one of its words, best first. A long name is never "no match" because it
 * is long.
 *
 * COMMON NAMES ARE RAISED, IN THEIR OWN GROUP. For a screening duty a missed
 * match is worse than a wrong one. A close match resting only on names common
 * in Nigeria ("Muhammad Yusuf" inside "Mohammed Yusuf Bello") is raised like
 * any other, marked `common`, and the desk shows it in a lower group: "common
 * name, check identifiers". So is an EXACT match on a listing made only of
 * common names ("Muhammad Yusuf" exactly): thousands carry that name, so it
 * is treated like a close match until two people confirm it (it does not
 * change a risk class while open; migration 20260924176700). No match, of any
 * kind, holds money by itself.
 *
 * A CLOSE MATCH NEEDS THE FACTS NOT TO DISAGREE. A fuzzy match becomes a
 * queue item only when the listing's date of birth or nationality is
 * consistent with ours or unknown on either side (`factsAllowHit`);
 * otherwise it is recorded on the screening and not raised. An exact match
 * is always raised. Vallo holds no date of birth or nationality for most
 * people today, so in practice every close match is raised.
 *
 * A match is a reason for a person to look, never a verdict. See the
 * escalation path in the migration header and docs/COMPLIANCE_RUNBOOK.md.
 */

export const FUZZY_THRESHOLD = 0.88;

const HONORIFICS = new Set([
  "mr", "mrs", "ms", "miss", "dr", "prof", "chief", "alhaji", "alhaja", "hajia", "sheikh", "shaykh",
  "mallam", "malam", "engr", "barr", "rev", "pastor", "sir", "lady", "hon", "mal",
]);

const ABBREVIATIONS: Record<string, string> = { mohd: "muhammad", muhd: "muhammad", mhd: "muhammad", md: "muhammad" };

/** Abbreviations expanded, and "al"/"el" articles dropped or split off. */
function expandWords(words: string[]): string[] {
  const out: string[] = [];
  for (const raw of words) {
    const word = ABBREVIATIONS[raw] ?? raw;
    if (word === "al" || word === "el") continue;
    /* Split only before a consonant: Alhassan is al-Hassan, Aliyu is not al-Iyu. */
    const joined = /^(?:al|el)([^aeiouy][a-z]{2,})$/.exec(word);
    out.push(joined ? joined[1]! : word);
  }
  return out;
}

/** One word folded to a rough sound, for scoring and indexing only. */
export function foldWord(word: string): string {
  return word
    .replace(/ph/g, "f")
    .replace(/ou|oo/g, "u")
    .replace(/kh/g, "k")
    .replace(/q/g, "k")
    .replace(/c(?!h)/g, "k")
    .replace(/(.)\1+/g, "$1")
    .replace(/o/g, "u")
    .replace(/e/g, "a")
    /* Ould and Wuld ("son of") are one word. */
    .replace(/^wu/, "u")
    /* A final y after a consonant is an i: Ghaly/Ghali, Fathy/Fathi, Mahdy/Mahdi. */
    .replace(/([^aeiou])y$/, "$1i")
    /* The assimilated article: Abdurrahman, Abdussalam, Abduzzahir are Abdul-names. */
    .replace(/^abd[ua](?=[rstzn])/, "abdul");
}

/** A normalised name, every word folded (word order kept sorted). */
export function foldName(normalised: string): string {
  return expandWords(normalised.split(" ").filter(Boolean))
    .map(foldWord)
    .sort()
    .join(" ");
}

/** Two-letter tokens with a meaning the matcher handles: articles and the Md abbreviation. */
const SHORT_KEPT = new Set(["al", "el", "ul", "md"]);

/** Our words considered against one listing, at most: the ones that pair with it, best first. */
export const MAX_OUR_WORDS = 10;

export function normaliseName(raw: string): string {
  const words = raw
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && !HONORIFICS.has(w));
  return words.sort().join(" ");
}

/**
 * A normalised name without junk tokens, for FUZZY scoring only (exact is
 * decided on the whole normalised name, so "Iyad Ghali" is never an exact
 * match for "Iyad Ag Ghali"). Padding ("Abubakar Shekau a b c d") is one-
 * letter tokens and two-letter ones that are not a handled particle; they are
 * dropped as long as two real words remain ("Li Wei" keeps "Li").
 */
export function dropJunk(normalised: string): string {
  const words = normalised.split(" ").filter(Boolean);
  const real = words.filter((w) => w.length >= 3 || SHORT_KEPT.has(w));
  return (real.filter((w) => !SHORT_KEPT.has(w)).length >= 2 ? real : words).join(" ");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const next = [i];
    for (let j = 1; j <= b.length; j += 1) {
      next[j] = Math.min(next[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = next;
  }
  return prev[b.length]!;
}

function editRatio(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  return longest === 0 ? 1 : 1 - levenshtein(a, b) / longest;
}

export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const window = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aHit = new Array<boolean>(a.length).fill(false);
  const bHit = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i += 1) {
    for (let j = Math.max(0, i - window); j < Math.min(b.length, i + window + 1); j += 1) {
      if (bHit[j] || a[i] !== b[j]) continue;
      aHit[i] = true;
      bHit[j] = true;
      matches += 1;
      break;
    }
  }
  if (matches === 0) return 0;
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (!aHit[i]) continue;
    while (!bHit[k]) k += 1;
    if (a[i] !== b[k]) transpositions += 1;
    k += 1;
  }
  const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < 4 && a[prefix] === b[prefix]) prefix += 1;
  return jaro + prefix * 0.1 * (1 - jaro);
}

function wordScore(a: string[], b: string[]): number {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  let weighted = 0;
  let weight = 0;
  for (const word of short) {
    const best = Math.max(...long.map((other) => jaroWinkler(word, other)));
    weighted += best * word.length;
    weight += word.length;
  }
  /* A shorter name covers less of the longer one: a two-word name against a
     four-word listing cannot score as if it were the whole person. */
  const coverage = short.length / long.length;
  return weight === 0 ? 0 : (weighted / weight) * (0.85 + 0.15 * coverage);
}

const WORD_EDIT = 0.85;
/* Same consonants alone is not enough: Karim/Akram, Muhammad/Mahmud share them. */
const SKELETON_EDIT = 0.7;
const MIN_COVERAGE = 2 / 3;
const SHORT_LISTING = 3;

export type WordWeight = (foldedWord: string) => number;
const EVEN: WordWeight = () => 1;

/**
 * Names common in Nigeria, folded. Their rarity weight is capped, because
 * the international lists (where they are rare) would otherwise make a
 * covered "Bello" count like a covered surname nobody else has.
 */
const COMMON_NG = new Set(
  [
    "muhammad", "mohammed", "ahmad", "ahmed", "ali", "aliyu", "abdullahi", "abdullah", "abdallah", "abubakar", "bello", "usman", "uthman", "garba",
    "adamu", "danjuma", "musa", "ibrahim", "yusuf", "umar", "sani", "haruna", "suleiman", "sulaiman", "isa", "yakubu",
    "idris", "lawal", "shehu", "sadiq", "aminu", "kabiru", "nasiru", "bashir", "tijani", "hassan", "hussaini", "hussein",
    "abdulrahman", "abdulkadir", "abdulmalik", "abdulaziz", "abdulsalam", "abdulhamid", "abdul", "salisu", "auwal",
    "gambo", "bala", "danladi", "mustapha", "mustafa", "umaru", "ahmadu", "abba", "hamza", "zakari", "zakariya",
    "aisha", "fatima", "zainab", "hauwa", "amina", "khadija", "maryam", "hadiza", "halima", "salamatu",
  ].map(foldWord),
);
const COMMON_CAP = 0.35;
export const isCommonWord = (folded: string): boolean => COMMON_NG.has(folded);

/** An "Abdul-" name without its prefix, so the prefix alone never makes two names close. */
function abdulTail(word: string): string | null {
  const m = /^abd(?:u|a)?l(.*)$/.exec(word);
  return m ? m[1]! : null;
}

/** A standalone Abdul word ("Abdul Rahman", "Abd al-Rahman"), folded, to be joined to the next. */
const ABDUL_ALONE = new Set(["abd", "abdul", "abdal", "abdur", "abdus", "abduz", "abdut", "abdun"]);

/** A word's consonants, in order: "yusaf" and "yusuf" are both "ysf". */
const skeleton = (word: string): string => word.replace(/[aeiou]/g, "");
const SKELETON_MIN = 3;
/** A y between vowels is optional: Aliyu/Aliu, Zakariya/Zakaria. */
const dropGlide = (word: string): string => word.replace(/([aeiou])y(?=[aeiou])/g, "$1");
/** A trailing i or u on an Abdul- tail is optional: Abdullah/Abdullahi. */
const dropFinalVowel = (tail: string): string => (tail.length > 2 ? tail.replace(/[iu]$/, "") : tail);

function closeWords(a: string, b: string): number {
  if (a === b) return 1;
  if (dropGlide(a) === dropGlide(b)) return 0.95;
  const ratio = editRatio(a, b);
  if (ratio >= WORD_EDIT) return ratio;
  /* Transliterations differ in vowels (Yousef/Yusuf, Khaled/Khalid, Bakar/Bakr),
     but a shared skeleton only counts from the same first letter and with the
     letters mostly in place, so Karim/Akram and Muhammad/Mahmud stay apart. */
  const sk = skeleton(a);
  if (sk.length >= SKELETON_MIN && sk === skeleton(b) && a[0] === b[0] && ratio >= SKELETON_EDIT) return 0.9;
  return 0;
}

/**
 * Do two folded words cover each other? Equal folds; the same word but for a
 * y between vowels; an edit ratio of 0.85 or more; or the same consonant
 * skeleton of three or more letters from the same first letter with an edit
 * ratio of at least 0.7. An Abdul- word is compared on its tail only, a
 * trailing i or u on the tail being optional.
 */
export function wordsCover(mine: string, theirs: string): number {
  if (mine === theirs) return 1;
  const a = abdulTail(mine);
  const b = abdulTail(theirs);
  if (a !== null || b !== null) {
    if (a === null || b === null || !a || !b) return 0;
    if (dropFinalVowel(a) === dropFinalVowel(b)) return 0.95;
    return closeWords(a, b);
  }
  return closeWords(mine, theirs);
}

type Pairing = { covered: Set<number>; mineUsed: number; mine: number[] };

/**
 * The best ONE-TO-ONE pairing of our words with the listed words: each of
 * ours covers at most one listed word, and the pairing chosen covers the most
 * listed weight (then the best scores). Exhaustive over the few words a name
 * has, so a greedy first pick can never block a better whole.
 */
function pairWords(ours: string[], listed: string[], weight: WordWeight = EVEN): Pairing {
  const scores = ours.map((mine) => listed.map((theirs) => wordsCover(mine, theirs)));
  const memo = new Map<string, { value: number; picks: number[] }>();
  const best = (j: number, used: number): { value: number; picks: number[] } => {
    if (j === listed.length) return { value: 0, picks: [] };
    const key = `${j}:${used}`;
    const hit = memo.get(key);
    if (hit) return hit;
    const skip = best(j + 1, used);
    let top = { value: skip.value, picks: [-1, ...skip.picks] };
    for (let i = 0; i < ours.length; i += 1) {
      const score = scores[i]![j]!;
      if (score <= 0 || used & (1 << i)) continue;
      const rest = best(j + 1, used | (1 << i));
      const value = rest.value + weight(listed[j]!) + score * 1e-3;
      if (value > top.value) top = { value, picks: [i, ...rest.picks] };
    }
    memo.set(key, top);
    return top;
  };
  /* Callers pass at most MAX_OUR_WORDS (see `nameAssess`); this is a backstop. */
  const picks = ours.length > 16 ? [] : best(0, 0).picks;
  const covered = new Set<number>();
  const mine: number[] = [];
  picks.forEach((i, j) => {
    if (i >= 0) {
      covered.add(j);
      mine.push(i);
    }
  });
  return { covered, mineUsed: covered.size, mine };
}

/** The listed words our words cover, one to one (see `pairWords`). */
export function coveredWords(ours: string[], listed: string[]): Set<number> {
  return pairWords(ours, listed).covered;
}

/**
 * Rarity weights: log(1 + N / df), where the frequency counts the lists and
 * (when given) the names we screen, and a name common in Nigeria is capped.
 */
export function rarityWeights(listed: readonly { names: string[] }[], ourNames: readonly string[] = []): WordWeight {
  const df = new Map<string, number>();
  const count = (names: readonly string[]) => {
    const words = new Set(names.flatMap((name) => foldName(name).split(" ").filter(Boolean)));
    for (const word of words) df.set(word, (df.get(word) ?? 0) + 1);
  };
  for (const entry of listed) count(entry.names);
  for (const name of ourNames) count([normaliseName(name)]);
  const n = Math.max(1, listed.length + ourNames.length);
  return (word) => {
    const w = Math.log(1 + n / (df.get(word) ?? 1));
    return isCommonWord(word) ? Math.min(w, COMMON_CAP) : w;
  };
}

/**
 * How ours covers a listing: null when not well enough to be the same person;
 * otherwise whether the covered words are all names common in Nigeria.
 */
function listingCovered(
  ours: string[],
  listed: string[],
  weight: WordWeight,
  oursTotal = ours.length,
): { common: boolean; full: boolean; mine: string[] } | null {
  const { covered, mineUsed, mine } = pairWords(ours, listed, weight);
  const common = [...covered].every((j) => isCommonWord(listed[j]!));
  const used = mine.map((i) => ours[i]!);
  if (covered.size === listed.length) return { common, full: true, mine: used };
  if (listed.length <= SHORT_LISTING) return null;
  let got = 0;
  let total = 0;
  listed.forEach((word, j) => {
    const w = weight(word);
    total += w;
    if (covered.has(j)) got += w;
  });
  if (total <= 0 || got / total < MIN_COVERAGE) return null;
  /* Every word of a name of ours of three or more words found in the listing
     is enough: the distinctive-word rule is for partial names, not for a
     whole name of ours that the listing contains. */
  if (oursTotal >= 3 && mineUsed === oursTotal) return { common, full: false, mine: used };
  return common ? null : { common, full: false, mine: used };
}

/**
 * Our words worth pairing with a listing: those that cover one of its words,
 * best first, at most MAX_OUR_WORDS. A long name is never "no match" for its
 * length: its words that could matter are kept, the rest cannot change the
 * pairing.
 */
function relevantWords(ours: string[], listed: string[]): string[] {
  const scored = ours
    .map((word) => ({ word, best: Math.max(0, ...listed.map((theirs) => wordsCover(word, theirs))) }))
    .filter((x) => x.best > 0);
  if (scored.length <= MAX_OUR_WORDS) return scored.map((x) => x.word);
  return scored
    .sort((x, y) => y.best - x.best)
    .slice(0, MAX_OUR_WORDS)
    .map((x) => x.word);
}

/**
 * A folded name's word lists to try: as written, and with each standalone
 * Abdul word joined to another word (names are stored with their words sorted,
 * so "Abdul Rahman" is tried as "Abdulrahman").
 */
function wordVariants(normalised: string): string[][] {
  const words = expandWords(normalised.split(" ").filter(Boolean)).map(foldWord);
  const out = [words];
  words.forEach((word, i) => {
    if (!ABDUL_ALONE.has(word)) return;
    words.forEach((other, j) => {
      if (j === i || ABDUL_ALONE.has(other)) return;
      out.push([foldWord(`abdul${other}`), ...words.filter((_, k) => k !== i && k !== j)]);
    });
  });
  return out;
}

/**
 * Score and kind of cover for a screened name against a listed one, both
 * already normalised (`screened` is ours, `listed` is the list's).
 */
export function nameAssess(screened: string, listed: string, weight: WordWeight = EVEN): { score: number; common: boolean } {
  let top = { score: 0, common: false };
  if (!screened || !listed) return top;
  for (const aw of wordVariants(screened)) {
    for (const bw of wordVariants(listed)) {
      if (aw.length < 2 || bw.length < 2) continue;
      const cover = listingCovered(relevantWords(aw, bw), bw, weight, aw.length);
      if (!cover) continue;
      /* A listing covered word for word is scored on the words that cover
         it: padding a name with other words cannot dilute the score. */
      const mineScored = cover.full ? cover.mine : aw;
      const a = [...mineScored].sort().join(" ");
      const b = [...bw].sort().join(" ");
      const score = a === b ? 1 : Math.max(editRatio(a, b), wordScore(mineScored, bw));
      if (score > top.score) top = { score, common: cover.common };
    }
  }
  return top;
}

/** 0..1 for a screened name against a listed one (see `nameAssess`). */
export function nameScore(screened: string, listed: string, weight: WordWeight = EVEN): number {
  return nameAssess(screened, listed, weight).score;
}

export type ListedName = {
  entryId: string;
  source: "un" | "ng";
  reference: string;
  primaryName: string;
  /** Normalised primary name and aliases (`sanctions_entries.names_normalised`). */
  names: string[];
  datesOfBirth?: string[];
  nationalities?: string[];
};

/** What we hold about the person, when we hold it. */
export type PersonFacts = { dateOfBirth?: string | null; nationality?: string | null };

/**
 * May a close match be raised? Yes when the facts are consistent or unknown
 * on either side; no only when a known fact on both sides disagrees.
 */
export function factsAllowHit(listed: Pick<ListedName, "datesOfBirth" | "nationalities">, facts: PersonFacts = {}): boolean {
  const ourYear = (facts.dateOfBirth ?? "").slice(0, 4);
  const theirDobs = listed.datesOfBirth ?? [];
  if (/^\d{4}$/.test(ourYear) && theirDobs.length > 0 && !theirDobs.some((d) => d.slice(0, 4) === ourYear)) return false;
  const ours = (facts.nationality ?? "").trim().toLowerCase();
  const theirs = (listed.nationalities ?? []).map((n) => n.trim().toLowerCase());
  if (ours && theirs.length > 0 && !theirs.includes(ours)) return false;
  return true;
}

export type NameMatch = {
  entryId: string;
  source: "un" | "ng";
  reference: string;
  kind: "exact" | "fuzzy";
  score: number;
  screenedName: string;
  matchedName: string;
  /** False when a known date of birth or nationality disagrees: recorded, not raised. */
  raise: boolean;
  /**
   * A close match resting only on names common in Nigeria. Still raised (a
   * missed match is worse than a wrong one), in the desk's lower group:
   * "common name, check identifiers".
   */
  common: boolean;
};

/**
 * A matcher over one set of lists, built once per run. Candidates are found
 * through an index of the first three letters of every listed word, so a
 * screened name is scored only against listings that share a word start with
 * it (the UN list alone is thousands of names and aliases). The cost, stated:
 * a misspelling inside the first three letters of EVERY word is not found;
 * one intact word start is enough.
 *
 * Returns every listed entry that one of the screened names matches, at most
 * one match per (entry, screened name), exact before fuzzy, best score first.
 */
export function createMatcher(
  listed: readonly ListedName[],
  threshold = FUZZY_THRESHOLD,
  ourNames: readonly string[] = [],
): (screened: readonly string[], facts?: PersonFacts) => NameMatch[] {
  const weight = rarityWeights(listed, ourNames);
  const byPrefix = new Map<string, Set<number>>();
  listed.forEach((entry, index) => {
    for (const name of entry.names) {
      for (const word of foldName(name).split(" ")) {
        const key = word.slice(0, 3);
        if (!key) continue;
        let bucket = byPrefix.get(key);
        if (!bucket) byPrefix.set(key, (bucket = new Set()));
        bucket.add(index);
      }
    }
  });

  return (screened, facts = {}) => {
    const out: NameMatch[] = [];
    const mine = [...new Set(screened.map((s) => s.trim()).filter(Boolean))].map((raw) => ({ raw, norm: normaliseName(raw) }));
    for (const person of mine) {
      /* One word from our side is never a person. */
      if (!person.norm || person.norm.split(" ").length < 2) continue;
      const candidates = new Set<number>();
      for (const word of foldName(person.norm).split(" ")) for (const i of byPrefix.get(word.slice(0, 3)) ?? []) candidates.add(i);
      for (const index of candidates) {
        const entry = listed[index]!;
        let best: NameMatch | null = null;
        for (const stored of entry.names) {
          /* Normalised again: a version loaded before a normalising rule changed still compares like for like. */
          const name = normaliseName(stored);
          /* Exact on the whole normalised names; junk tokens are dropped for fuzzy scoring only. */
          const exact = person.norm === name;
          /* An exact match on a listing of common names only is still in the common group. */
          const assessed = exact
            ? { score: 1, common: foldName(name).split(" ").every(isCommonWord) }
            : nameAssess(dropJunk(person.norm), dropJunk(name), weight);
          const score = exact ? 1 : Math.min(assessed.score, 0.999);
          if (score < threshold) continue;
          const kind = exact ? "exact" : "fuzzy";
          if (!best || score > best.score) {
            best = {
              entryId: entry.entryId,
              source: entry.source,
              reference: entry.reference,
              kind,
              score,
              screenedName: person.raw,
              matchedName: entry.primaryName,
              raise: kind === "exact" || factsAllowHit(entry, facts),
              common: assessed.common,
            };
          }
        }
        if (best) out.push({ ...best, score: Math.round(best.score * 1000) / 1000 });
      }
    }
    return out.sort((x, y) => (x.kind === y.kind ? y.score - x.score : x.kind === "exact" ? -1 : 1));
  };
}

/** One-off: `createMatcher(listed)(screened)`. */
export function matchNames(screened: readonly string[], listed: readonly ListedName[], threshold = FUZZY_THRESHOLD): NameMatch[] {
  return createMatcher(listed, threshold)(screened);
}

/** The screening's outcome from its matches. */
export function outcomeOf(matches: readonly NameMatch[]): { outcome: "clear" | "exact" | "fuzzy"; best: number } {
  if (matches.length === 0) return { outcome: "clear", best: 0 };
  const best = Math.max(...matches.map((m) => m.score));
  return { outcome: matches.some((m) => m.kind === "exact") ? "exact" : "fuzzy", best };
}
