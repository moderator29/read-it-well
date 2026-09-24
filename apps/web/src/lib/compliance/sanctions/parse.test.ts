import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseList, parseNigeriaCsv, parseUnConsolidated, readCsv } from "./parse";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");

describe("reading the UN Consolidated List (SCUML item 8)", () => {
  it("reads individuals and entities, aliases, dates of birth, nationality and reference", () => {
    const result = parseUnConsolidated(fixture("un-consolidated.fixture.xml"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries.map((e) => e.reference)).toEqual(["FXi.001", "FXi.002", "FXe.001"]);
    const first = result.entries[0]!;
    expect(first).toMatchObject({
      kind: "individual",
      primaryName: "ZEPHYRIN QUILLAN BRAXTOVÉ",
      /* "The Quill & Ink" is graded Low by the list, so it is not screened on. */
      aliases: ["Zeph Braxtove"],
      datesOfBirth: ["1971-07-02"],
      nationalities: ["Testland"],
      listedOn: "2020-03-14",
    });
    expect(first.namesNormalised).toContain("braxtove quillan zephyrin");
    expect(result.entries[1]!.datesOfBirth).toEqual(["1980"]);
    expect(result.entries[2]).toMatchObject({ kind: "entity", aliases: ["Glimmervale Traders"] });
  });

  it("refuses a file that is not the list, rather than loading an empty one", () => {
    expect(parseUnConsolidated("<html></html>")).toEqual({ ok: false, reason: "not_un_consolidated_list" });
    expect(parseUnConsolidated("<CONSOLIDATED_LIST></CONSOLIDATED_LIST>")).toEqual({ ok: false, reason: "no_entries" });
    const whole = fixture("un-consolidated.fixture.xml");
    expect(parseUnConsolidated(whole.slice(0, whole.indexOf("</INDIVIDUALS>")))).toEqual({ ok: false, reason: "truncated" });
  });

  it("keeps a numeric character reference beyond Unicode as text instead of throwing", () => {
    const xml = "<CONSOLIDATED_LIST><INDIVIDUALS><INDIVIDUAL><FIRST_NAME>ADA &#x110000; OBI</FIRST_NAME><REFERENCE_NUMBER>R1</REFERENCE_NUMBER></INDIVIDUAL></INDIVIDUALS></CONSOLIDATED_LIST>";
    const result = parseUnConsolidated(xml);
    expect(result.ok && result.entries[0]!.primaryName).toBe("ADA &#x110000; OBI");
  });
});

describe("reading the Nigeria Sanctions List (SCUML item 8)", () => {
  it("reads the CSV with quoted fields and ; separated lists", () => {
    const result = parseNigeriaCsv(fixture("nigeria-sanctions.fixture.csv"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({ reference: "FXN.001", aliases: ["Q. A. Tesk", "Quorvin Tesk"], datesOfBirth: ["1975-01-09"] });
    expect(result.entries[1]).toMatchObject({ kind: "entity", primaryName: "Brightwater Holdings, Fixture" });
    expect(parseList("ng", "name\nx")).toEqual({ ok: false, reason: "missing_reference_or_name_column" });
    expect(result.complete).toBe(true);
  });

  it("refuses an END count that does not match, and marks a file without one incomplete", () => {
    const whole = fixture("nigeria-sanctions.fixture.csv");
    expect(parseNigeriaCsv(whole.replace("END,2", "END,3"))).toEqual({ ok: false, reason: "truncated" });
    const bare = parseNigeriaCsv(whole.replace("END,2\n", ""));
    expect(bare.ok && bare.complete).toBe(false);
  });

  it("reads doubled quotes and newlines inside a quoted field", () => {
    expect(readCsv('a,b\n"x ""y""","line\nbreak"\n')).toEqual([["a", "b"], ['x "y"', "line\nbreak"]]);
  });
});
