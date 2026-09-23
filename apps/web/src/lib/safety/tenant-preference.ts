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

const ETHNIC =
  "(?:igbos?(?! (?:efon|ora|elerin|ukwu))|yorubas?|hausas?|fulanis?|ijaws?|tivs?|efiks?|ibibios?|edos?" +
  "|urhobos?|itsekiris?|idomas?|igalas?|nupes?|kanuris?|northerners?|southerners?|easterners?|westerners?" +
  "|muslims?|moslems?|christians?|pentecostals?|catholics?|alhajis?|pagans?)";

/* Marital status and gender, with the ordinary listing words that share a
   group word excluded: boys' quarters, a ladies' bar or salon, a hostel's
   visiting rule. */
const STATUS =
  "(?:(?:married (?:couples?|people|men|women)|unmarried (?:couples?|people|men|women|ladies)|unmarried" +
  "|single (?:men|women|ladies|mothers?|guys|girls|parents?)|singles|bachelors?|spinsters?" +
  "|couples|families|women|ladies|men|males?|females?|guys|girls|boys)" +
  "(?! (?:s )?(?:quarters?|bq|bar|bars|salon|salons|hairdressers?|barbers?|wear|clothing|fashion|boutique" +
  "|toilets?|restrooms?|bathrooms?|hostels?|allowed in (?:the )?rooms?|visitors? after)))";

const GROUP = `(?:${ETHNIC}|${STATUS})`;

const REFUSAL =
  "(?:no|not for|strictly no|we do not accept|we dont accept|not open to|not available to|not suitable for)";

const PATTERNS = [
  new RegExp(`\\b(${REFUSAL} ${GROUP})\\b`),
  new RegExp(`\\b(${GROUP} (?:tenants? |people |occupants? )?(?:only|not allowed|not accepted|not welcome|preferred))\\b`),
  new RegExp(`\\b(only ${GROUP})\\b`),
  new RegExp(`\\b((?:we )?prefer(?:red|s)? (?:only )?${GROUP})\\b`),
  new RegExp(`\\b(strictly for ${GROUP})\\b`),
];

const FROM = "0134579@$!|";
const TO = ["oieastgasii", "oleastgasil"];

/* Cyrillic and Greek letters that look like Latin ones, and what they read as. */
const HOMOGLYPH_FROM = "\u0430\u0435\u043e\u0440\u0441\u0443\u0445\u0456\u0458\u0455\u0501\u0432\u043a\u043c\u043d\u0442\u0457\u04cf\u03bf\u03b1\u03b5\u03b9\u03ba\u03bd\u03c1\u03c4\u03c5\u03c7\u03b2\u03b7";
const HOMOGLYPH_TO = "aeopcyxijsdbkmhtiloaeikvptuxbn";

function translate(value: string, from: string, to: string): string {
  let out = "";
  for (const ch of value) {
    const at = from.indexOf(ch);
    out += at >= 0 ? (to[at] ?? ch) : ch;
  }
  return out;
}

/**
 * The forms a text is read in, exactly as `private.content_forms()` builds
 * them: lower case, accents, zero-width characters and soft hyphens removed,
 * look-alike letters read as Latin, digits and symbols inside a word read as
 * letters (1 as i, and again as l), edge punctuation stripped before and after
 * that mapping, punctuation as spaces, a run of three or more single letters
 * joined, and runs of three or more of one letter collapsed to one and to two.
 */
export function contentForms(raw: string): string[] {
  let base = raw.normalize("NFKD").toLowerCase().replace(/[̀-ͯ]/g, "");
  base = base.replace(/[​-‍⁠﻿­]/g, "");
  base = translate(base, HOMOGLYPH_FROM, HOMOGLYPH_TO).trim();
  if (base === "") return [];
  const tokens = base.split(/\s+/);
  const forms: string[] = [];
  const add = (form: string) => {
    if (form !== "" && !forms.includes(form)) forms.push(form);
  };
  for (const to of TO) {
    for (const stripFirst of [true, false]) {
      const mapped: string[] = [];
      for (let token of tokens) {
        if (stripFirst) token = token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
        if (/[a-z]/.test(token)) token = translate(token, FROM, to);
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
        if (singles.length >= 3) out.push(translate(singles.join(""), FROM, to));
        else out.push(...singles);
        singles = [];
        if (token !== "") out.push(token);
      }
      const variant = out.join(" ");
      add(variant);
      add(variant.replace(/([a-z])\1{2,}/g, "$1"));
      add(variant.replace(/([a-z])\1{2,}/g, "$1$1"));
    }
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
