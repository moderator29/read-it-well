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
      aliases: ["Zeph Braxtove", "The Quill & Ink"],
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
  });

  it("reads doubled quotes and newlines inside a quoted field", () => {
    expect(readCsv('a,b\n"x ""y""","line\nbreak"\n')).toEqual([["a", "b"], ['x "y"', "line\nbreak"]]);
  });
});
