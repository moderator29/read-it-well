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
 *   - EXACT: the normalised names are the same words.
 *   - FUZZY: close but not the same, scored 0..1, and raised only at or above
 *     `FUZZY_THRESHOLD`. The score is the better of two views: the whole
 *     sorted string by edit distance, and word by word (each word of the
 *     shorter name against its best partner in the longer one, by Jaro-Winkler,
 *     weighted by length), so a missing middle name or a transliteration
 *     ("Mohammed"/"Muhammad") still scores high while two names that only
 *     share a common surname do not.
 * TRANSLITERATION. Before scoring (and indexing), each word is FOLDED to a
 * rough sound: "ph" to f, "ou"/"oo" to u, "kh" to k, "q" and a "c" not in
 * "ch" to k, doubled
 * letters to one, then o to u and e to a, so "Mohammed Yousef" and "Muhammad
 * Yusuf" land on the same letters. Exact still means the unfolded names are
 * the same words; a match only through folding is fuzzy.
 *
 * ABBREVIATIONS AND ARTICLES. "Mohd", "Muhd", "Mhd" and "Md" read as
 * Muhammad; a standalone "al"/"el" is dropped and a joined one split off
 * ("Alhassan" and "Al Hassan" are the same word).
 *
 * NEVER ON ONE WORD OR ON PART OF A LISTING. A single-word name from our side
 * is never matched, exact or not: one word is not a person. The LISTED
 * name's words must be COVERED by ours, one to one (each of our words covers
 * at most one listed word, paired greedily by best score, so "Muhammad Musa"
 * never covers "Muhammad Mustafa Musa"). A word covers another only when the
 * two fold to the same letters or their edit ratio is at least 0.85; no
 * prefix bonus, and an "Abdul-" name is compared on what follows the prefix,
 * so Abdulkadir never covers Abdullahi. Every listed word must be covered for
 * a listing of three words or fewer; a longer one needs two thirds, each word
 * weighted by how RARE it is, across the lists AND across the names we
 * screen, with names common in Nigeria (Bello, Usman, Garba, Musa, Ibrahim,
 * Abubakar...) capped low; and unless every word is covered, at least one
 * covered word must be a distinctive one. A covered "Muhammad" or "Bello" is
 * worth little; a covered "Braxtove" a lot.
 *
 * A LISTING OF COMMON NAMES ONLY, found inside a LONGER name of ours ("Muhammad
 * Yusuf" inside "Mohammed Yusuf Bello"), is recorded on the screening and not
 * raised: thousands of Nigerians carry those two names, and the extra name is
 * evidence it is somebody else. The same words and no more are still raised.
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
    const joined = /^(?:al|el)([a-z]{3,})$/.exec(word);
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
    .replace(/e/g, "a");
}

/** A normalised name, every word folded (word order kept sorted). */
export function foldName(normalised: string): string {
  return expandWords(normalised.split(" ").filter(Boolean))
    .map(foldWord)
    .sort()
    .join(" ");
}

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
    "muhammad", "mohammed", "ahmad", "ahmed", "ali", "aliyu", "abdullahi", "abubakar", "bello", "usman", "uthman", "garba",
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

/** A word's consonants, in order: "yusaf" and "yusuf" are both "ysf". */
const skeleton = (word: string): string => word.replace(/[aeiou]/g, "");
const SKELETON_MIN = 3;

/**
 * Do two folded words cover each other? Equal folds; the same consonant
 * skeleton of three or more letters (transliterations differ in vowels:
 * Yousef/Yusuf, Khaled/Khalid, Bakar/Bakr); or an edit ratio of 0.85 or more.
 */
export function wordsCover(mine: string, theirs: string): number {
  if (mine === theirs) return 1;
  const sameSkeleton = (a: string, b: string) => skeleton(a).length >= SKELETON_MIN && skeleton(a) === skeleton(b);
  const a = abdulTail(mine);
  const b = abdulTail(theirs);
  if (a !== null || b !== null) {
    if (a === null || b === null || !a || !b) return 0;
    const tail = a === b ? 1 : sameSkeleton(a, b) ? 0.9 : editRatio(a, b);
    return tail >= WORD_EDIT ? tail : 0;
  }
  if (sameSkeleton(mine, theirs)) return 0.9;
  const ratio = editRatio(mine, theirs);
  return ratio >= WORD_EDIT ? ratio : 0;
}

/**
 * The listed words our words cover, ONE TO ONE: every close pair, best first,
 * each of ours and each of theirs used once.
 */
export function coveredWords(ours: string[], listed: string[]): Set<number> {
  const pairs: { i: number; j: number; score: number }[] = [];
  ours.forEach((mine, i) =>
    listed.forEach((theirs, j) => {
      const score = wordsCover(mine, theirs);
      if (score > 0) pairs.push({ i, j, score });
    }),
  );
  pairs.sort((x, y) => y.score - x.score);
  const usedMine = new Set<number>();
  const covered = new Set<number>();
  for (const pair of pairs) {
    if (usedMine.has(pair.i) || covered.has(pair.j)) continue;
    usedMine.add(pair.i);
    covered.add(pair.j);
  }
  return covered;
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

/** Does ours cover the listing well enough to be the same person? */
function listingCovered(ours: string[], listed: string[], weight: WordWeight): boolean {
  const covered = coveredWords(ours, listed);
  if (covered.size === listed.length) return true;
  if (listed.length <= SHORT_LISTING) return false;
  let got = 0;
  let total = 0;
  let distinctive = false;
  listed.forEach((word, j) => {
    const w = weight(word);
    total += w;
    if (covered.has(j)) {
      got += w;
      if (!isCommonWord(word)) distinctive = true;
    }
  });
  return total > 0 && got / total >= MIN_COVERAGE && distinctive;
}

/**
 * 0..1 for a screened name against a listed one, both already normalised
 * (`screened` is ours, `listed` is the list's). Scored on folded words.
 */
export function nameScore(screened: string, listed: string, weight: WordWeight = EVEN): number {
  if (!screened || !listed) return 0;
  const a = foldName(screened);
  const b = foldName(listed);
  const aw = a.split(" ");
  const bw = b.split(" ");
  if (aw.length < 2 || bw.length < 2) return 0;
  if (!listingCovered(aw, bw, weight)) return 0;
  if (a === b) return 1;
  return Math.max(editRatio(a, b), wordScore(aw, bw));
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
        for (const name of entry.names) {
          const exact = person.norm === name;
          const listedFolded = foldName(name).split(" ");
          const commonOnly = listedFolded.every(isCommonWord);
          const longerThanListing = foldName(person.norm).split(" ").length > listedFolded.length;
          const score = exact ? 1 : Math.min(nameScore(person.norm, name, weight), 0.999);
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
              raise: kind === "exact" || (!(commonOnly && longerThanListing) && factsAllowHit(entry, facts)),
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
