import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * DB-10 STEP 2 AND NEW-A4-01 STEP 2 CAN ONLY GO LIVE ONCE NO READ NAMES WHAT THEY TAKE AWAY.
 *
 * PostgREST refuses a whole read when one named column is not granted, so a
 * select that names a revoked column does not lose a field, it loses the page:
 * on 24 September a listing read naming `ownership_verified_at`,
 * `mandate_verified_at`, `latitude` and `longitude` answered 403 signed in and
 * 401 signed out within two minutes of the step-2 grants, and the grants were
 * reverted (20260924071045).
 *
 * The revoked columns are read from the step-2 migrations themselves, never
 * restated here. Every select on listings, businesses, accommodations and
 * catalogue_entries in the app, including a relation embedded in a select on
 * another table, is checked:
 *   - through a caller's own client, it names no column step 2 takes from
 *     `authenticated`, and it is never `*`;
 *   - a select naming the exact point (latitude, longitude, location) goes
 *     through `pointSelect` or `withPublicPoint`, so a signed-out reader asks
 *     for the public twins, unless its file is one only a signed-in member
 *     reaches (SIGNED_IN_ONLY, each with its reason).
 * The service role (an admin client) reads every column and is not checked.
 */

const WEB = process.cwd();
const REPO = join(WEB, "..", "..");
const SRC = join(WEB, "src");
const MIGRATIONS = join(REPO, "supabase", "migrations");

const TABLES = ["listings", "businesses", "accommodations", "catalogue_entries"] as const;
type Table = (typeof TABLES)[number];

/** Files whose selects only a signed-in member ever runs, so `anon`'s point grants do not apply. */
const SIGNED_IN_ONLY: Record<string, string> = {
  "lib/host/queries.ts": "the host workspace: every read returns early unless session.state is signed-in",
  "lib/saved/queries.ts": "saved places: every read returns early unless session.state is signed-in",
};

/** The newest step-2 file of that name, applied or still pending. */
function migrationText(pattern: RegExp): string {
  const dirs = [MIGRATIONS, join(MIGRATIONS, "pending")];
  const files = dirs
    .flatMap((dir) => readdirSync(dir).filter((name) => pattern.test(name)).map((name) => ({ dir, name })))
    .sort((a, b) => a.name.localeCompare(b.name));
  const latest = files.at(-1);
  if (!latest) throw new Error(`no migration matching ${pattern}`);
  return readFileSync(join(latest.dir, latest.name), "utf8");
}

/** Column lists read out of `('<table>', array['a', 'b', ...])` rows. */
function revokedFromAuthenticated(): Map<Table, Set<string>> {
  const sql = migrationText(/^\d{14}_db10_step2_.*\.sql$/);
  const out = new Map<Table, Set<string>>();
  for (const row of sql.matchAll(/\(\s*'(\w+)'\s*,\s*array\s*\[([^\]]*)\]/g)) {
    const table = row[1] as Table;
    if (!TABLES.includes(table)) continue;
    out.set(table, new Set([...row[2]!.matchAll(/'(\w+)'/g)].map((m) => m[1]!)));
  }
  return out;
}

function revokedFromAnon(): { tables: Set<string>; columns: Set<string> } {
  const sql = migrationText(/^\d{14}_new_a4_01_step2_.*\.sql$/);
  const tables = sql.match(/array\s*\[\s*('listings'[^\]]*)\]/);
  const columns = sql.match(/not in\s*\(([^)]*)\)/);
  if (!tables || !columns) throw new Error("could not read the anon revoke out of the NEW-A4-01 step-2 migration");
  return {
    tables: new Set([...tables[1]!.matchAll(/'(\w+)'/g)].map((m) => m[1]!)),
    columns: new Set([...columns[1]!.matchAll(/'(\w+)'/g)].map((m) => m[1]!)),
  };
}

/** The text between a "(" at `start - 1` and its matching ")". */
function balanced(text: string, start: number): string {
  let depth = 1;
  let i = start;
  while (i < text.length && depth > 0) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") depth -= 1;
    i += 1;
  }
  return text.slice(start, i - 1);
}

/** Top-level column names of a PostgREST select (aliases, casts and hints dropped). */
export function topLevelColumns(select: string): string[] {
  let flat = "";
  let depth = 0;
  for (const ch of select) {
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    else if (depth === 0) flat += ch;
  }
  return flat
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.split(":").filter(Boolean).pop()!.split("!")[0]!.trim())
    .filter((name) => !/\s/.test(name));
}

/** Relations on the four tables embedded in a select, with their own column lists. */
export function embedded(select: string): { table: Table; columns: string[] }[] {
  const out: { table: Table; columns: string[] }[] = [];
  const re = new RegExp(`\\b(${TABLES.join("|")})\\s*(?:!\\w+)?\\s*\\(`, "g");
  for (const m of select.matchAll(re)) {
    out.push({ table: m[1] as Table, columns: topLevelColumns(balanced(select, m.index! + m[0].length)) });
  }
  return out;
}

type Offence = string;

/** Check one select on one table; the file context decides the anon rule. */
export function offences(
  where: string,
  table: Table,
  columns: string[],
  publicPoint: boolean,
  signedInOnly: boolean,
  authRevoked: Map<Table, Set<string>>,
  anon: { tables: Set<string>; columns: Set<string> },
): Offence[] {
  const found: Offence[] = [];
  const revoked = authRevoked.get(table) ?? new Set<string>();
  for (const column of columns) {
    if (column === "*") {
      const anonReads = anon.tables.has(table) && !publicPoint && !signedInOnly;
      if (authRevoked.has(table) || anonReads) found.push(`${where} ${table}: select * (step 2 revokes columns of this table)`);
    }
    else if (revoked.has(column)) found.push(`${where} ${table}.${column}: revoked from authenticated`);
    else if (anon.tables.has(table) && anon.columns.has(column) && !publicPoint && !signedInOnly) {
      found.push(`${where} ${table}.${column}: revoked from anon; use pointSelect/withPublicPoint`);
    }
  }
  return found;
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(path, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) && entry.name !== "database.types.ts") {
      out.push(path);
    }
  }
  return out;
}

/** The select text a call hands PostgREST: its literals, and its ALL_CAPS constants resolved in the same file. */
function selectText(args: string, file: string): string {
  const parts = [...args.matchAll(/`([^`$]*)`|"([^"]*)"|'([^']*)'/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? "");
  for (const id of args.matchAll(/\b([A-Z][A-Z0-9_]{3,})\b/g)) {
    const def = file.match(new RegExp(`const\\s+${id[1]}\\s*=\\s*(?:\`([^\`]*)\`|"([^"]*)"|'([^']*)')`));
    if (def) parts.push(def[1] ?? def[2] ?? def[3] ?? "");
  }
  return parts.join(",");
}

function isAdminCall(before: string, path: string): boolean {
  if (/(^|\/)(lib|app)\/admin\//.test(path)) return true;
  const receiver = before.match(/([\w.]+(?:\(\))?)\s*$/)?.[1] ?? "";
  return /admin|service/i.test(receiver);
}

function scan(): Offence[] {
  const authRevoked = revokedFromAuthenticated();
  const anon = revokedFromAnon();
  const found: Offence[] = [];
  for (const path of sourceFiles(SRC)) {
    const rel = relative(SRC, path);
    const file = readFileSync(path, "utf8");
    const signedInOnly = rel in SIGNED_IN_ONLY;
    for (const call of file.matchAll(/\.select\(/g)) {
      const at = call.index!;
      const args = balanced(file, at + call[0].length);
      const chainStart = Math.max(file.lastIndexOf(";", at), file.lastIndexOf("{", at), 0);
      const chain = file.slice(chainStart, at);
      const from = chain.match(/\.from\(\s*["'](\w+)["']\s*\)\s*$|\.from\(\s*["'](\w+)["']\s*\)[\s\S]*$/);
      const table = (from?.[1] ?? from?.[2]) as Table | undefined;
      const fromAt = from ? chainStart + from.index! : at;
      if (isAdminCall(file.slice(Math.max(0, fromAt - 160), fromAt), rel)) continue;
      const text = selectText(args, file);
      const publicPoint = /pointSelect\(|withPublicPoint\(/.test(args);
      const line = file.slice(0, at).split("\n").length;
      const where = `${rel}:${line}`;
      if (table && TABLES.includes(table)) {
        found.push(...offences(where, table, topLevelColumns(text), publicPoint, signedInOnly, authRevoked, anon));
      }
      for (const inner of embedded(text)) {
        found.push(...offences(where, inner.table, inner.columns, publicPoint, signedInOnly, authRevoked, anon));
      }
    }
  }
  return found;
}

describe("no own-client read names a column the step-2 grants take away", () => {
  it("reads the revoked columns out of the step-2 migrations", () => {
    const auth = revokedFromAuthenticated();
    expect(auth.get("listings")).toContain("ownership_verified_at");
    expect(auth.get("listings")).toContain("mandate_verified_at");
    expect(auth.get("businesses")).toContain("verification_tier");
    expect(auth.get("accommodations")).toContain("address");
    const anon = revokedFromAnon();
    expect([...anon.columns].sort()).toEqual(["latitude", "location", "longitude"]);
    expect(anon.tables).toContain("listings");
  });

  it("flags the select that broke on 24 September (the instrument works)", () => {
    const auth = revokedFromAuthenticated();
    const anon = revokedFromAnon();
    const broke = "id,title,latitude,longitude,ownership_verified_at,mandate_verified_at,listing_photos(storage_path)";
    const found = offences("fixture", "listings", topLevelColumns(broke), false, false, auth, anon);
    expect(found.join("\n")).toMatch(/ownership_verified_at/);
    expect(found.join("\n")).toMatch(/mandate_verified_at/);
    expect(found.join("\n")).toMatch(/latitude: revoked from anon/);
    const nested = embedded("id, listings!inner(id, address), status");
    expect(offences("fixture", nested[0]!.table, nested[0]!.columns, false, false, auth, anon)).toHaveLength(1);
    expect(offences("fixture", "listings", topLevelColumns("id, latitude"), true, false, auth, anon)).toEqual([]);
  });

  it("finds no offending select in the app", () => {
    expect(scan()).toEqual([]);
  });
});
