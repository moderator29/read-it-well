import { describe, expect, it } from "vitest";
import { csvCell, csvHeaders, nairaFromMinor, toCsv } from "./csv";

describe("csv", () => {
  it("quotes text and doubles inner quotes", () => {
    expect(csvCell('Ada "the lister", Lagos')).toBe('"Ada ""the lister"", Lagos"');
  });

  it("neutralises a cell a spreadsheet would run as a formula", () => {
    for (const bad of ["=HYPERLINK(\"http://x\")", "+2+3", "-1+cmd", "@SUM(A1)", "\t=1", "\r=1"]) {
      expect(csvCell(bad).startsWith("\"'")).toBe(true);
    }
  });

  it("writes numbers as numbers, negative ones included", () => {
    expect(csvCell(-1250.5)).toBe("-1250.5");
    expect(csvCell(Number.NaN)).toBe("");
  });

  it("builds a file with a BOM and CRLF lines", () => {
    const out = toCsv(["a", "b"], [["x", 1], [null, true]]);
    expect(out.startsWith("﻿")).toBe(true);
    expect(out).toBe('﻿"a","b"\r\n"x",1\r\n,true\r\n');
  });

  it("keeps a filename to safe characters", () => {
    expect(csvHeaders('pay"ments\r\n.csv')["content-disposition"]).toBe('attachment; filename="pay-ments--.csv"');
  });

  it("turns kobo into naira", () => {
    expect(nairaFromMinor(123456)).toBe(1234.56);
    expect(nairaFromMinor(null)).toBeNull();
  });
});
