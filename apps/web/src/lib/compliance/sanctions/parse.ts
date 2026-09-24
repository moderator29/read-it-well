import { normaliseName } from "./match";

/**
 * READING A SANCTIONS LIST FILE. SCUML items 8 and 9.
 *
 * Pure: text in, entries out. No XML or CSV library (the build pipeline and
 * its lockfile are the audit's); both formats here are simple enough to read
 * with care, and a file that does not look like its list is REFUSED rather
 * than loaded as an empty list, because an empty list would re-screen
 * everyone to "clear".
 *
 * UN CONSOLIDATED LIST: the Security Council's published XML
 * (`<CONSOLIDATED_LIST>` with `<INDIVIDUALS>` and `<ENTITIES>`): name parts
 * FIRST_NAME to FOURTH_NAME, every ALIAS_NAME, REFERENCE_NUMBER, LISTED_ON,
 * NATIONALITY/VALUE and the DATE or YEAR of each date of birth.
 *
 * NIGERIA SANCTIONS LIST: published by the Nigeria Sanctions Committee in no
 * stable machine format we can rely on, so the officer loads it as CSV with a
 * header row: reference, name, aliases (separated by ";"), date_of_birth
 * (";" for several), nationality (";"), listed_on, and optionally type
 * (individual or entity). If the Committee publishes a feed, it is one more
 * parser here.
 */

export type ParsedEntry = {
  reference: string;
  kind: "individual" | "entity";
  primaryName: string;
  aliases: string[];
  namesNormalised: string[];
  datesOfBirth: string[];
  nationalities: string[];
  listedOn: string | null;
};

export type ParseResult = { ok: true; entries: ParsedEntry[] } | { ok: false; reason: string };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (whole, code: string) => {
      if (code[0] === "#") {
        const n = code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
      }
      return ENTITIES[code.toLowerCase()] ?? whole;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function blocks(xml: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1]!);
  return out;
}

function first(xml: string, tag: string): string {
  const found = blocks(xml, tag)[0];
  return found === undefined ? "" : decode(found);
}

function all(xml: string, tag: string): string[] {
  return blocks(xml, tag).map(decode).filter(Boolean);
}

function isoDate(value: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return m ? m[1]! : null;
}

function entry(
  kind: ParsedEntry["kind"],
  reference: string,
  primaryName: string,
  aliases: string[],
  datesOfBirth: string[],
  nationalities: string[],
  listedOn: string | null,
): ParsedEntry | null {
  const name = primaryName.replace(/\s+/g, " ").trim();
  const ref = reference.trim();
  if (!name || !ref) return null;
  const cleanAliases = [...new Set(aliases.map((a) => a.replace(/\s+/g, " ").trim()).filter((a) => a && a !== name))];
  const namesNormalised = [...new Set([name, ...cleanAliases].map(normaliseName).filter(Boolean))];
  return {
    reference: ref.slice(0, 80),
    kind,
    primaryName: name.slice(0, 300),
    aliases: cleanAliases,
    namesNormalised,
    datesOfBirth: [...new Set(datesOfBirth.filter(Boolean))],
    nationalities: [...new Set(nationalities.filter(Boolean))],
    listedOn,
  };
}

export function parseUnConsolidated(xml: string): ParseResult {
  if (!/<CONSOLIDATED_LIST[\s>]/.test(xml)) return { ok: false, reason: "not_un_consolidated_list" };
  const entries: ParsedEntry[] = [];
  for (const person of blocks(xml, "INDIVIDUAL")) {
    const name = ["FIRST_NAME", "SECOND_NAME", "THIRD_NAME", "FOURTH_NAME"].map((t) => first(person, t)).filter(Boolean).join(" ");
    const aliases = blocks(person, "INDIVIDUAL_ALIAS").map((a) => first(a, "ALIAS_NAME"));
    const dobs = blocks(person, "INDIVIDUAL_DATE_OF_BIRTH").map((d) => first(d, "DATE") || first(d, "YEAR"));
    const nationalities = blocks(person, "NATIONALITY").flatMap((n) => all(n, "VALUE"));
    const made = entry("individual", first(person, "REFERENCE_NUMBER"), name, aliases, dobs, nationalities, isoDate(first(person, "LISTED_ON")));
    if (made) entries.push(made);
  }
  for (const body of blocks(xml, "ENTITY")) {
    const aliases = blocks(body, "ENTITY_ALIAS").map((a) => first(a, "ALIAS_NAME"));
    const made = entry("entity", first(body, "REFERENCE_NUMBER"), first(body, "FIRST_NAME"), aliases, [], [], isoDate(first(body, "LISTED_ON")));
    if (made) entries.push(made);
  }
  return entries.length > 0 ? { ok: true, entries } : { ok: false, reason: "no_entries" };
}

/** RFC 4180-ish: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function readCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

const split = (value: string | undefined) => (value ?? "").split(";").map((s) => s.trim()).filter(Boolean);

export function parseNigeriaCsv(text: string): ParseResult {
  const rows = readCsv(text.replace(/^﻿/, ""));
  const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const col = (name: string) => header.indexOf(name);
  if (col("reference") < 0 || col("name") < 0) return { ok: false, reason: "missing_reference_or_name_column" };
  const entries: ParsedEntry[] = [];
  for (const cells of rows.slice(1)) {
    const cell = (name: string) => (col(name) >= 0 ? cells[col(name)] : undefined);
    const type = (cell("type") ?? "").trim().toLowerCase();
    const made = entry(
      type === "entity" ? "entity" : "individual",
      cell("reference") ?? "",
      cell("name") ?? "",
      split(cell("aliases")),
      split(cell("date_of_birth")),
      split(cell("nationality")),
      isoDate(cell("listed_on") ?? ""),
    );
    if (made) entries.push(made);
  }
  return entries.length > 0 ? { ok: true, entries } : { ok: false, reason: "no_entries" };
}

export function parseList(source: "un" | "ng", text: string): ParseResult {
  return source === "un" ? parseUnConsolidated(text) : parseNigeriaCsv(text);
}
