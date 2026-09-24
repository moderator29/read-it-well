import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NEIGHBOURHOODS, PLACE_ALIASES } from "./neighbourhoods";

/**
 * THE CLOSED LISTS EXIST TWICE, IN TS AND IN SQL, AND MUST NOT DRIFT.
 * `private.public_neighbourhood` carries the same values (migration
 * 20260924121300). This parses the newest migration that
 * defines each and compares the tuples with the lists here.
 */

const MIGRATIONS = join(__dirname, "../../../../../supabase/migrations");

function newestDefining(fn: string): string {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files.reverse()) {
    const text = readFileSync(join(MIGRATIONS, file), "utf8");
    const at = text.indexOf(`create or replace function private.${fn}(`);
    if (at >= 0) return text.slice(at, text.indexOf("$function$;", text.indexOf("$function$", at) + 10));
  }
  throw new Error(`no migration defines private.${fn}`);
}

function tuples(block: string, cte: string): string[][] {
  const start = block.indexOf(`${cte} as (`);
  const end = block.indexOf(")\n  ),", start) >= 0 ? block.indexOf("\n  )", start) : block.length;
  return [...block.slice(start, end).matchAll(/\('((?:[^']|'')*)', '((?:[^']|'')*)'\)/g)].map((m) => [m[1]!, m[2]!]);
}

describe("the closed lists in TS and in SQL", () => {
  it("hold the same neighbourhoods, states and aliases", () => {
    const block = newestDefining("public_neighbourhood");
    const sqlAreas = tuples(block, "areas(area, state_code)").map(([a, s]) => `${a}|${s}`).sort();
    const tsAreas = NEIGHBOURHOODS.map((n) => `${n.area}|${n.stateCode}`).sort();
    expect(sqlAreas).toEqual(tsAreas);
    const sqlAliases = tuples(block, "aliases(alias, area)").map(([a, n]) => `${a}|${n}`).sort();
    const tsAliases = Object.entries(PLACE_ALIASES).map(([a, n]) => `${a}|${n}`).sort();
    expect(sqlAliases).toEqual(tsAliases);
  });
});
