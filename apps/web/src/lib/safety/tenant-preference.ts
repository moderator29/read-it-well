/**
 * SEC-06: a tenant preference by ethnicity, religion, marital status or gender
 * ("No Igbo", "Muslims only", "Married couples only").
 *
 * The database is the enforcement: `private.discriminatory_phrase()` runs in
 * the listing, business, stay and room-type scan triggers, and a match HOLDS
 * the row for review with the reason in `review_notes` (the lister's workspace
 * shows it). Nothing is refused, because context decides whether "ladies
 * only" is a shared female flat or a refusal.
 *
 * This is the same rule, said to the lister while they type, so the hold is
 * never a surprise. It mirrors the SQL pattern set and its normalisation; the
 * test table in `tenant-preference.test.ts` is the same case list the probe
 * `supabase/tests/probes/sec-06.sql` runs against the live function.
 *
 * Client-safe: no imports.
 */

const GROUPS =
  "(?:igbos?|yorubas?|hausas?|fulanis?|ijaws?|tivs?|efiks?|ibibios?|edos?|urhobos?|itsekiris?" +
  "|idomas?|igalas?|nupes?|kanuris?|northerners?|southerners?|easterners?|westerners?" +
  "|muslims?|moslems?|christians?|pentecostals?|catholics?|alhajis?|pagans?" +
  "|married (?:couples?|people|men|women)|unmarried (?:couples?|people|men|women|ladies)|unmarried" +
  "|single (?:men|women|ladies|mothers?|guys|girls|parents?)|singles|bachelors?|spinsters?" +
  "|couples|families|women|ladies|men|males?|females?|guys|girls|boys)";

const REFUSAL =
  "(?:no|not for|strictly no|we do not accept|we dont accept|not open to|not available to|not suitable for)";

const PATTERNS = [
  new RegExp(`\\b(${REFUSAL} ${GROUPS})\\b`),
  new RegExp(`\\b(${GROUPS} only)\\b`),
  new RegExp(`\\b(only ${GROUPS})\\b`),
];

const FROM = "0134579@$!|";
const TO = ["oieastgasii", "oleastgasil"];

function translate(value: string, to: string): string {
  let out = "";
  for (const ch of value) {
    const at = FROM.indexOf(ch);
    out += at >= 0 ? (to[at] ?? ch) : ch;
  }
  return out;
}

/**
 * The forms a text is read in, exactly as `private.content_forms()` builds
 * them: lower case, accents stripped, digits and symbols inside a word read as
 * letters (1 as i, and again as l), punctuation as spaces, and a run of three
 * or more single letters joined.
 */
export function contentForms(raw: string): string[] {
  const base = raw
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[̀-ͯ]/g, "")
    .trim();
  if (base === "") return [];
  const tokens = base.split(/\s+/);
  const forms: string[] = [];
  for (const to of TO) {
    const mapped: string[] = [];
    for (let token of tokens) {
      token = token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
      if (/[a-z]/.test(token)) token = translate(token, to);
      token = token.replace(/[^a-z0-9]+/g, " ").trim();
      if (token !== "") mapped.push(...token.split(" "));
    }
    const out: string[] = [];
    let singles: string[] = [];
    for (const token of [...mapped, ""]) {
      if (token.length === 1) {
        singles.push(token);
        continue;
      }
      if (singles.length >= 3) out.push(translate(singles.join(""), to));
      else out.push(...singles);
      singles = [];
      if (token !== "") out.push(token);
    }
    const variant = out.join(" ");
    if (variant !== "" && !forms.includes(variant)) forms.push(variant);
  }
  return forms;
}

/** The preference phrase in `text`, or null when there is none. */
export function tenantPreference(text: string): string | null {
  for (const form of contentForms(text)) {
    for (const pattern of PATTERNS) {
      const match = pattern.exec(form);
      if (match?.[1]) return match[1];
    }
  }
  return null;
}
