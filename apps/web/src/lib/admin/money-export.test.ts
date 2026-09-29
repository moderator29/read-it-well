import { describe, expect, it } from "vitest";
import { exportFilename, moneyHistoryCsv, MONEY_EXPORT_HEADER, parseExportRange } from "./money-export";
import { parseHistoryRows } from "../money/history-model";

const rows = parseHistoryRows([
  {
    entry_id: "e1",
    kind: "payment",
    occurred_at: "2026-09-28T23:30:00.5+00:00",
    amount_minor: 45_000_050,
    lister_share_minor: 44_325_050,
    guarantee_minor: 675_000,
    commission_minor: 0,
    status: "SUCCESSFUL",
    reference: "PSK_1",
    title: "=HYPERLINK(\"http://x\")",
    booking_id: "b1",
    payer_name: "Ada, Obi",
    payee_name: "+Tunde",
  },
  {
    entry_id: "e2",
    kind: "refund",
    occurred_at: "2026-09-28T10:00:00Z",
    amount_minor: 100,
    status: "submitted",
    reference: null,
    title: null,
    booking_id: "b1",
    payer_name: "Ada, Obi",
    payee_name: null,
  },
])!;

describe("the Money desk CSV", () => {
  const csv = moneyHistoryCsv(rows);
  const lines = csv.replace(/^﻿/, "").trim().split("\r\n");

  it("writes the header and one line per row", () => {
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(MONEY_EXPORT_HEADER.map((h) => `"${h}"`).join(","));
  });

  it("writes naira as numbers a spreadsheet can sum, kobo intact", () => {
    expect(lines[1]).toContain(",450000.5,443250.5,6750,0,");
  });

  it("dates the row in UTC and on its Lagos day", () => {
    expect(lines[1]!.startsWith('"2026-09-28T23:30:00.500Z","2026-09-29"')).toBe(true);
  });

  it("neutralises a member-typed formula and keeps a comma in a name inside its cell", () => {
    expect(lines[1]).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(lines[1]).toContain(`"Ada, Obi"`);
    expect(lines[1]).toContain(`"'+Tunde"`);
  });

  it("leaves the split empty on a refund rather than writing zero", () => {
    expect(lines[2]).toContain(",1,,,,");
  });
});

describe("the export's range", () => {
  it("is everything when no range is given", () => {
    const range = parseExportRange(new URLSearchParams());
    expect(range).toEqual({ ok: true, from: null, to: null, fromDay: null, toDay: null });
  });

  it("covers both days whole, in Lagos time", () => {
    const range = parseExportRange(new URLSearchParams("from=2026-09-01&to=2026-09-29"));
    expect(range).toMatchObject({ ok: true, from: "2026-09-01T00:00:00+01:00", to: "2026-09-30T00:00:00+01:00" });
  });

  it("refuses a mistyped or impossible day instead of exporting everything", () => {
    expect(parseExportRange(new URLSearchParams("from=01/09/2026")).ok).toBe(false);
    expect(parseExportRange(new URLSearchParams("to=2026-02-30")).ok).toBe(false);
    expect(parseExportRange(new URLSearchParams("from=2026-09-29&to=2026-09-01")).ok).toBe(false);
  });

  it("names the file after the range", () => {
    expect(exportFilename(null, null)).toBe("vallo-money-history-all.csv");
    expect(exportFilename("2026-09-01", null)).toBe("vallo-money-history-2026-09-01-to-now.csv");
  });
});
