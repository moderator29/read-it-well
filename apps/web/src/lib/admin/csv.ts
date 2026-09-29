/**
 * CSV FOR THE CONSOLE'S EXPORTS.
 *
 * Finance, compliance and operations take figures out of the console into a
 * spreadsheet. Two things make that safe:
 *
 *  - Every value is quoted and inner quotes doubled (RFC 4180), so a comma or
 *    a newline in a name cannot shift the columns.
 *  - FORMULA INJECTION. A spreadsheet runs a cell that starts with = + - @ (or
 *    a tab or carriage return before one) as a formula. Names, titles and
 *    notes are typed by members, so such a cell is prefixed with a single
 *    quote and read as text. Numbers are written as numbers, never prefixed,
 *    so a negative amount stays a number.
 *
 * The file starts with a byte-order mark so Excel reads naira signs and
 * accented names as UTF-8.
 */

export type CsvValue = string | number | boolean | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "true" : "false";
  const text = FORMULA_START.test(value) ? `'${value}` : value;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(header: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
  const lines = [header.map((h) => csvCell(h)).join(","), ...rows.map((row) => row.map(csvCell).join(","))];
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** Headers for a CSV download that must never be cached or rendered inline. */
export function csvHeaders(filename: string): Record<string, string> {
  const safe = filename.replace(/[^A-Za-z0-9._-]/g, "-");
  return {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename="${safe}"`,
    "cache-control": "private, no-store, max-age=0",
    "x-content-type-options": "nosniff",
  };
}

/** Kobo to a naira figure with two decimals, as a number a spreadsheet can sum. */
export function nairaFromMinor(minor: number | null | undefined): number | null {
  if (minor === null || minor === undefined || !Number.isFinite(minor)) return null;
  return Math.round(minor) / 100;
}
