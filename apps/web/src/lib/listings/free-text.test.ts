import { describe, expect, it } from "vitest";
import { freeTextGroups } from "./supabase-repository";
import { haystack } from "./filter";
import type { Listing } from "./types";

/*
 * The one property this file exists to defend.
 *
 * `matchesFilter` is the authority on whether a listing matches a search term,
 * and it asks a single question: is the term a substring of `title area city
 * state kind`. The SQL groups are an optimisation in front of it. An
 * optimisation is allowed to hand back rows the matcher then drops. It is never
 * allowed to withhold a row the matcher would have kept, because nothing runs
 * after it to notice.
 *
 * So these tests do not check that the groups come out looking a particular
 * way. They evaluate the groups as a predicate, run the matcher's own question
 * beside them over the same rows, and assert the implication in the direction
 * that can actually hurt somebody: matcher keeps it, therefore SQL admitted it.
 */

const STATE_NAMES = new Map([
  ["LA", "Lagos"],
  ["OG", "Ogun"],
  ["FC", "Abuja"],
  ["RI", "Rivers"],
]);

type Row = {
  title: string;
  city: string;
  area: string;
  state_code: string;
  property_type: string;
};

/** The listing the catalogue would build from that row, as far as text goes. */
function asListing(row: Row): Listing {
  return {
    title: row.title,
    city: row.city,
    area: row.area,
    state: STATE_NAMES.get(row.state_code) ?? row.state_code,
    kind: row.property_type,
  } as Listing;
}

/*
 * A reader for the PostgREST filter strings, deliberately small.
 *
 * It splits on commas that are not inside parentheses, because `state_code.in.
 * (LA,OG)` carries its own, and understands the two operators these groups use.
 */
function splitParts(group: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of group) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current) parts.push(current);
  return parts;
}

function partHolds(part: string, row: Row): boolean {
  const ilike = /^(\w+)\.ilike\.(.*)$/.exec(part);
  if (ilike) {
    const column = ilike[1] ?? "";
    const pattern = ilike[2] ?? "";
    const regex = new RegExp(
      `^${pattern
        .split("%")
        .map((chunk) => chunk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*")}$`,
      "i",
    );
    return regex.test(String(row[column as keyof Row] ?? ""));
  }

  const inList = /^(\w+)\.in\.\((.*)\)$/.exec(part);
  if (inList) {
    const column = inList[1] ?? "";
    const values = inList[2] ?? "";
    return values.split(",").includes(String(row[column as keyof Row] ?? ""));
  }

  throw new Error(`unreadable filter part: ${part}`);
}

/** Groups are ANDed with each other, parts inside one group are ORed. */
function sqlAdmits(groups: string[], row: Row): boolean {
  return groups.every((group) => splitParts(group).some((part) => partHolds(part, row)));
}

/** The matcher's own question, asked of the same row. */
function matcherKeeps(term: string, row: Row): boolean {
  return haystack(asListing(row)).includes(term.trim().toLowerCase());
}

const LEKKI_FLAT: Row = {
  title: "Two bedroom flat with borehole",
  city: "Lagos",
  area: "Lekki Phase 1",
  state_code: "LA",
  property_type: "apartment",
};

const ABEOKUTA_HOUSE: Row = {
  title: "Family house near the expressway",
  city: "Abeokuta",
  area: "Oke-Ilewo",
  state_code: "OG",
  property_type: "home",
};

const ABUJA_OFFICE: Row = {
  title: "Serviced office, St. Peter's Close",
  city: "Abuja",
  area: "Wuse 2",
  state_code: "FC",
  property_type: "office",
};

const PORT_HARCOURT_VILLA: Row = {
  title: "Waterfront villa",
  city: "Port Harcourt",
  area: "Old GRA",
  state_code: "RI",
  property_type: "villa",
};

const ROWS: Row[] = [LEKKI_FLAT, ABEOKUTA_HOUSE, ABUJA_OFFICE, PORT_HARCOURT_VILLA];

const TERMS = [
  "lekki",
  "Lekki",
  "lekki lagos",
  "lagos lekki",
  "ogun",
  "abeokuta ogun",
  "villa",
  "office abuja",
  "st. peter",
  "oke-ilewo",
  "borehole",
  "wuse",
  "harcourt rivers",
  "ekki",
  "%",
  "   ",
  "nothing here matches at all",
];

describe("freeTextGroups", () => {
  it("never withholds a row the matcher would have kept", () => {
    for (const term of TERMS) {
      const groups = freeTextGroups(term, STATE_NAMES);
      for (const row of ROWS) {
        if (!matcherKeeps(term, row)) continue;
        expect(
          sqlAdmits(groups, row),
          `term ${JSON.stringify(term)} lost ${JSON.stringify(row.title)}`,
        ).toBe(true);
      }
    }
  });

  it("still narrows, so the row cap lands on matching listings", () => {
    // The point of the change: a term has to remove rows in SQL, or the cap is
    // back to being applied to the newest listings rather than the relevant
    // ones. "lekki" must not admit the Abuja office.
    const groups = freeTextGroups("lekki", STATE_NAMES);
    const admitted = ROWS.filter((row) => sqlAdmits(groups, row));
    expect(admitted).toHaveLength(1);
    expect(admitted[0]?.area).toBe("Lekki Phase 1");
  });

  it("requires every word, rather than any word", () => {
    // "lagos" alone would admit the Lekki flat; "lekki" alone would too. A row
    // in Lagos that is not in Lekki must fail the phrase.
    const lagosNotLekki: Row = {
      title: "Studio",
      city: "Lagos",
      area: "Yaba",
      state_code: "LA",
      property_type: "apartment",
    };
    expect(sqlAdmits(freeTextGroups("lekki lagos", STATE_NAMES), lagosNotLekki)).toBe(false);
    expect(sqlAdmits(freeTextGroups("lagos", STATE_NAMES), lagosNotLekki)).toBe(true);
  });

  it("reaches a listing through its state name, which no column holds", () => {
    // The row says OG. The person typed Ogun. Only the reference map bridges
    // that, which is why state is resolved in JavaScript and not by an ilike.
    const groups = freeTextGroups("ogun", STATE_NAMES);
    expect(groups.join(" ")).toContain("state_code.in.(OG)");
    expect(sqlAdmits(groups, ABEOKUTA_HOUSE)).toBe(true);
  });

  it("treats punctuation as a wildcard rather than deleting it", () => {
    // Deleting would turn "st." into "st" and stop matching "St. Peter's",
    // which is the one direction this is not allowed to move in.
    const groups = freeTextGroups("st.", STATE_NAMES);
    expect(groups[0]).toContain("title.ilike.%st%%");
    expect(sqlAdmits(groups, ABUJA_OFFICE)).toBe(true);
  });

  it("emits nothing for a term that is all punctuation or blank", () => {
    // A user typing "%" must not hand us a pattern that matches the catalogue,
    // and an empty group list means the term simply adds no predicate.
    expect(freeTextGroups("%", STATE_NAMES)).toEqual([]);
    expect(freeTextGroups("   ", STATE_NAMES)).toEqual([]);
    expect(freeTextGroups("!!! ???", STATE_NAMES)).toEqual([]);
  });

  it("caps the number of words it pushes down", () => {
    const groups = freeTextGroups("one two three four five six seven eight", STATE_NAMES);
    expect(groups).toHaveLength(6);
  });

  it("pushes down every field the haystack reads", () => {
    /*
     * Drift guard. If somebody adds a field to `haystack`, the matcher starts
     * accepting rows on evidence the SQL groups know nothing about, and the
     * superset property breaks quietly for exactly the searches that use it.
     * This asserts the haystack is still built from the five fields the groups
     * cover: title, area, city, state and kind.
     */
    const probe = haystack({
      title: "T",
      area: "A",
      city: "C",
      state: "S",
      kind: "K",
    } as unknown as Listing);
    expect(probe).toBe("t a c s k");
  });
});
