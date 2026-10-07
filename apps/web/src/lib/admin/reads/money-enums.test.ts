import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ESCROW_PURPOSES, ESCROW_STATES } from "./money-types";

/*
 * R3-22. The escrow enums live in `retired_custody`, outside type generation.
 * Rebuild each enum from the migrations exactly as Postgres would (create,
 * then every `add value ... after/before`), and hold the TypeScript arrays to
 * it, so a money type is never maintained by hand against the database.
 */
const DIR = join(__dirname, "..", "..", "..", "..", "..", "..", "supabase", "migrations");
const SQL = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(DIR, f), "utf8"))
  .join("\n");

function enumFromMigrations(name: string): string[] {
  const created = new RegExp(`create type public\\.${name} as enum \\(([^;]*?)\\);`, "i").exec(SQL);
  if (!created) throw new Error(`no create type for ${name}`);
  const values = [...created[1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
  const adds = new RegExp(`alter type public\\.${name} add value(?: if not exists)? '([^']+)'(?: (after|before) '([^']+)')?`, "gi");
  for (const m of SQL.matchAll(adds)) {
    const [, value, where, anchor] = m;
    if (values.includes(value!)) continue;
    const at = anchor ? values.indexOf(anchor) : -1;
    if (at < 0) values.push(value!);
    else values.splice(where!.toLowerCase() === "after" ? at + 1 : at, 0, value!);
  }
  return values;
}

describe("escrow enums match the database's own definition", () => {
  it("escrow_state", () => expect([...ESCROW_STATES]).toEqual(enumFromMigrations("escrow_state")));
  it("escrow_purpose", () => expect([...ESCROW_PURPOSES]).toEqual(enumFromMigrations("escrow_purpose")));
});
