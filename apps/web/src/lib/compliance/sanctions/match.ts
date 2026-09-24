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
 * A single-word name is only ever matched exactly: one shared word is not a
 * person.
 *
 * A match is a reason for a person to look, never a verdict. See the
 * escalation path in the migration header and docs/COMPLIANCE_RUNBOOK.md.
 */

export const FUZZY_THRESHOLD = 0.88;

const HONORIFICS = new Set([
  "mr", "mrs", "ms", "miss", "dr", "prof", "chief", "alhaji", "alhaja", "hajia", "sheikh", "shaykh",
  "mallam", "malam", "engr", "barr", "rev", "pastor", "sir", "lady", "hon", "mal",
]);

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

/** 0..1 for two already-normalised names. */
export function nameScore(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aw = a.split(" ");
  const bw = b.split(" ");
  if (aw.length < 2 || bw.length < 2) return 0;
  return Math.max(editRatio(a, b), wordScore(aw, bw));
}

export type ListedName = {
  entryId: string;
  source: "un" | "ng";
  reference: string;
  primaryName: string;
  /** Normalised primary name and aliases (`sanctions_entries.names_normalised`). */
  names: string[];
};

export type NameMatch = {
  entryId: string;
  source: "un" | "ng";
  reference: string;
  kind: "exact" | "fuzzy";
  score: number;
  screenedName: string;
  matchedName: string;
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
export function createMatcher(listed: readonly ListedName[], threshold = FUZZY_THRESHOLD): (screened: readonly string[]) => NameMatch[] {
  const byPrefix = new Map<string, Set<number>>();
  listed.forEach((entry, index) => {
    for (const name of entry.names) {
      for (const word of name.split(" ")) {
        const key = word.slice(0, 3);
        if (!key) continue;
        let bucket = byPrefix.get(key);
        if (!bucket) byPrefix.set(key, (bucket = new Set()));
        bucket.add(index);
      }
    }
  });

  return (screened) => {
    const out: NameMatch[] = [];
    const mine = [...new Set(screened.map((s) => s.trim()).filter(Boolean))].map((raw) => ({ raw, norm: normaliseName(raw) }));
    for (const person of mine) {
      if (!person.norm) continue;
      const candidates = new Set<number>();
      for (const word of person.norm.split(" ")) for (const i of byPrefix.get(word.slice(0, 3)) ?? []) candidates.add(i);
      for (const index of candidates) {
        const entry = listed[index]!;
        let best: NameMatch | null = null;
        for (const name of entry.names) {
          const score = person.norm === name ? 1 : nameScore(person.norm, name);
          if (score < threshold) continue;
          const kind = person.norm === name ? "exact" : "fuzzy";
          if (!best || score > best.score) {
            best = { entryId: entry.entryId, source: entry.source, reference: entry.reference, kind, score, screenedName: person.raw, matchedName: entry.primaryName };
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
