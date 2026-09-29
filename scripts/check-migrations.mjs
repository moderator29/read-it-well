#!/usr/bin/env node
/**
 * OPS-08: the migration process, checked on every push.
 *
 * Migrations are applied to the live database first (through the Supabase
 * MCP or the dashboard) and committed afterwards under the version the server
 * stamped. This holds the repository to the database it claims to describe.
 * Only the files DIRECTLY in supabase/migrations are migrations: `pending/`
 * holds drafts that were never applied and `superseded/` holds committed
 * files that were replaced before they were applied; neither is checked.
 *
 * OFFLINE (no database, no network; runs in `npm run lint` and in CI):
 *
 *   1. NAMES. Every top-level file is `<14-digit version>_<snake_case>.sql`
 *      (APPLIED.txt and RENAMED.txt excepted).
 *   2. ONE FILE PER VERSION. No two files share a version.
 *   3. THE MANIFEST. `supabase/migrations/APPLIED.txt` has one line per
 *      applied migration, `<version> <name> <sha256 of the file>`, and lists
 *      EXACTLY the top-level files: a file with no line was never recorded as
 *      applied (move it to pending/), a line with no file is a migration the
 *      repository lost. A file whose sha256 differs from its line was EDITED
 *      after it was applied: history is not rewritten, a fix is a new file.
 *   4. (with --base <git ref>) no existing migration file was modified,
 *      renamed or deleted since that commit, unless a reviewed line of
 *      `supabase/migrations/RENAMED.txt` (`<old> <new>`, relative to
 *      supabase/migrations) lists exactly that move: a file renumbered to the
 *      version the database recorded, or a never-applied file set aside into
 *      superseded/ or pending/. Editing in place is never allowed.
 *
 * ONLINE (--online; only when a credential is present, otherwise it says so
 * and exits 0, so CI without database access stays green on the offline half):
 *
 *   5. APPLIED.txt's (version, name) pairs equal the live
 *      `supabase_migrations.schema_migrations`, both ways. The credential is
 *      SUPABASE_DB_URL (a Postgres connection string, read with `psql`) or
 *      SUPABASE_ACCESS_TOKEN (a Management API token; the project is
 *      SUPABASE_PROJECT_REF, default the one hosted project).
 *
 * RECORDING a migration you just applied:
 *
 *   node scripts/check-migrations.mjs --record supabase/migrations/<version>_<name>.sql
 *
 * appends its manifest line (and refuses a name that breaks rule 1 or 2).
 *
 *   node scripts/check-migrations.mjs [--base <ref>] [--online] [--record <file>...]
 *
 * No dependencies: node's own fs, crypto, child_process and fetch.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const NAME = /^(\d{14})_([a-z0-9_]+)\.sql$/;
export const MANIFEST = "APPLIED.txt";
export const RENAMED = "RENAMED.txt";
const NOT_MIGRATIONS = new Set([MANIFEST, RENAMED]);
const DEFAULT_PROJECT_REF = "uccixoonmbhrnyczyigt";

/** Rules 1 and 2 over a directory listing. Returns problems, empty when clean. */
export function checkNames(files) {
  const problems = [];
  const seen = new Map();
  for (const file of files) {
    if (NOT_MIGRATIONS.has(file)) continue;
    const m = NAME.exec(file);
    if (!m) {
      problems.push(`${file}: not <14-digit version>_<snake_case>.sql`);
      continue;
    }
    const version = m[1];
    if (seen.has(version)) problems.push(`${file}: version ${version} is already used by ${seen.get(version)}`);
    else seen.set(version, file);
  }
  return problems;
}

/** Parses APPLIED.txt. Returns { entries: Map<file, {version,name,sha}>, problems }. */
export function parseManifest(text) {
  const entries = new Map();
  const problems = [];
  const versions = new Set();
  text.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) return;
    const m = /^(\d{14}) ([a-z0-9_]+) ([0-9a-f]{64})$/.exec(line);
    if (!m) {
      problems.push(`${MANIFEST} line ${i + 1}: not "<version> <name> <sha256>"`);
      return;
    }
    const [, version, name, sha] = m;
    if (versions.has(version)) problems.push(`${MANIFEST} line ${i + 1}: version ${version} listed twice`);
    versions.add(version);
    entries.set(`${version}_${name}.sql`, { version, name, sha });
  });
  return { entries, problems };
}

/**
 * Rule 3. `files` maps each top-level migration file name to its sha256.
 * Returns problems, empty when the manifest lists exactly the files, unedited.
 */
export function checkManifest(files, entries) {
  const problems = [];
  for (const [file, sha] of files) {
    const entry = entries.get(file);
    if (!entry) {
      problems.push(
        `${file}: not in ${MANIFEST}. If it is applied, record it (--record); if it is not, move it to pending/ or superseded/.`,
      );
    } else if (entry.sha !== sha) {
      problems.push(`${file}: edited after it was applied (sha256 differs from ${MANIFEST}). Write a new migration instead.`);
    }
  }
  for (const file of entries.keys()) {
    if (!files.has(file)) problems.push(`${MANIFEST} lists ${file}, and there is no such file.`);
  }
  return problems;
}

/** Parses RENAMED.txt: `<old path> <new path>` per line, relative to supabase/migrations. */
export function parseRenamed(text) {
  const renamed = new Map();
  const problems = [];
  text.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) return;
    const parts = line.split(/\s+/);
    const ok = (p) => /^((superseded|pending)\/)?[A-Za-z0-9_.-]+\.sql$/.test(p ?? "");
    if (parts.length !== 2 || !ok(parts[0]) || !ok(parts[1])) {
      problems.push(`${RENAMED} line ${i + 1}: not "<old file> <new file>"`);
      return;
    }
    renamed.set(parts[0], parts[1]);
  });
  return { renamed, problems };
}

/**
 * Rule 4 over `git diff --name-status -M <base> HEAD -- supabase/migrations`.
 * Additions are fine. A top-level file may leave its name only as a reviewed
 * line of RENAMED.txt says (`renamed`: old -> new, both relative to
 * supabase/migrations): a renumbering onto the version the database recorded,
 * or a move into superseded/ or pending/ of a file that was never applied.
 * Git reports such a move as R (similar content) or as D plus A; both pass
 * only when the listed target is the one that appeared. Anything else that
 * modifies, renames or deletes a top-level file is refused.
 */
export function checkImmutable(nameStatus, renamed = new Map()) {
  const problems = [];
  const rel = (p) => p.replace(/^supabase\/migrations\//, "");
  const lines = nameStatus
    .split("\n")
    .map((l) => l.trim().split(/\t+/))
    .filter((p) => (p[0] ?? "") !== "");
  const added = new Set(lines.filter((p) => p[0] === "A").map((p) => rel(p[1] ?? "")));
  const TOP = /^supabase\/migrations\/[^/]+\.sql$/;
  for (const parts of lines) {
    const status = parts[0];
    const path = parts[1] ?? "";
    const to = parts[2] ?? "";
    if (status === "A") continue;
    if (!TOP.test(path)) continue;
    const listed = renamed.get(rel(path));
    if (status.startsWith("R") && listed !== undefined && listed === rel(to)) continue;
    if (status === "D" && listed !== undefined && added.has(listed)) continue;
    const what = status.startsWith("R") ? "renamed" : status === "D" ? "deleted" : "modified";
    const hint = status === "M" ? "write a new one" : `list it in ${RENAMED} if it was renumbered to its recorded version or set aside unapplied`;
    problems.push(`${path}: ${what}. An applied migration is never edited; ${hint}.`);
  }
  return problems;
}

/** Rule 5: manifest pairs against live pairs, both given as "version name" strings. */
export function checkLive(manifestPairs, livePairs) {
  const live = new Set(livePairs);
  const mine = new Set(manifestPairs);
  const problems = [];
  for (const p of livePairs) if (!mine.has(p)) problems.push(`applied on the database, missing from ${MANIFEST}: ${p}`);
  for (const p of manifestPairs) if (!live.has(p)) problems.push(`in ${MANIFEST}, never applied on the database: ${p}`);
  return problems;
}

const LIVE_SQL = "select version || ' ' || coalesce(name, '') as pair from supabase_migrations.schema_migrations order by version";

async function readLive() {
  const url = process.env.SUPABASE_DB_URL ?? "";
  const token = process.env.SUPABASE_ACCESS_TOKEN ?? "";
  if (url) {
    const r = spawnSync("psql", [url, "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", LIVE_SQL], { encoding: "utf8" });
    if (r.error || r.status !== 0) throw new Error(`psql failed: ${r.error?.message ?? r.stderr.trim()}`);
    return r.stdout.split("\n").map((l) => l.trim()).filter(Boolean);
  }
  if (token) {
    const ref = process.env.SUPABASE_PROJECT_REF || DEFAULT_PROJECT_REF;
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ query: LIVE_SQL, read_only: true }),
    });
    if (!res.ok) throw new Error(`Management API answered ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows)) throw new Error("Management API did not return rows");
    return rows.map((r) => String(r.pair));
  }
  return null;
}

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const dir = join(root, "supabase", "migrations");
  const manifestPath = join(dir, MANIFEST);
  const argv = process.argv.slice(2);
  const names = readdirSync(dir).filter((f) => statSync(join(dir, f)).isFile());
  const migrationFiles = names.filter((f) => !NOT_MIGRATIONS.has(f));

  // --record: append manifest lines for files just applied, then check as usual.
  const ri = argv.indexOf("--record");
  if (ri !== -1) {
    const current = existsSync(manifestPath) ? parseManifest(readFileSync(manifestPath, "utf8")).entries : new Map();
    for (const arg of argv.slice(ri + 1).filter((a) => !a.startsWith("--"))) {
      const file = basename(arg);
      const m = NAME.exec(file);
      if (!m || !existsSync(join(dir, file))) {
        console.error(`migrations: cannot record ${arg}: not a top-level <version>_<name>.sql file`);
        process.exit(1);
      }
      if (current.has(file)) {
        console.log(`migrations: ${file} is already recorded.`);
        continue;
      }
      appendFileSync(manifestPath, `${m[1]} ${m[2]} ${sha256(join(dir, file))}\n`);
      console.log(`migrations: recorded ${file}.`);
    }
  }

  const problems = checkNames(migrationFiles);
  let entries = new Map();
  if (!existsSync(manifestPath)) {
    problems.push(`${MANIFEST} is missing.`);
  } else {
    const parsed = parseManifest(readFileSync(manifestPath, "utf8"));
    entries = parsed.entries;
    problems.push(...parsed.problems);
    const files = new Map(migrationFiles.filter((f) => NAME.test(f)).map((f) => [f, sha256(join(dir, f))]));
    problems.push(...checkManifest(files, entries));
  }

  const bi = argv.indexOf("--base");
  const base = bi === -1 ? "" : (argv[bi + 1] ?? "");
  if (base && !/^0+$/.test(base)) {
    let diff = "";
    try {
      diff = execFileSync("git", ["diff", "--name-status", "-M", base, "HEAD", "--", "supabase/migrations"], {
        cwd: root,
        encoding: "utf8",
      });
    } catch (error) {
      problems.push(`could not diff against ${base}: ${error instanceof Error ? error.message.split("\n")[0] : error}`);
    }
    const renamedPath = join(dir, RENAMED);
    const parsedRenamed = existsSync(renamedPath)
      ? parseRenamed(readFileSync(renamedPath, "utf8"))
      : { renamed: new Map(), problems: [] };
    problems.push(...parsedRenamed.problems);
    problems.push(...checkImmutable(diff, parsedRenamed.renamed));
  }

  let online = "";
  if (argv.includes("--online")) {
    let live = null;
    try {
      live = await readLive();
    } catch (error) {
      problems.push(`could not read the live history: ${error instanceof Error ? error.message : error}`);
    }
    if (live === null && !problems.some((p) => p.startsWith("could not read"))) {
      online = " Online check skipped: neither SUPABASE_DB_URL nor SUPABASE_ACCESS_TOKEN is set.";
    } else if (live) {
      const mine = [...entries.values()].map((e) => `${e.version} ${e.name}`);
      problems.push(...checkLive(mine, live));
      online = ` ${MANIFEST} equals the live history (${live.length} applied).`;
    }
  }

  if (problems.length > 0) {
    console.error(`migrations: ${problems.length} problem(s):\n  - ${problems.join("\n  - ")}`);
    process.exit(1);
  }
  console.log(
    `migrations: ${migrationFiles.length} files, names, versions and ${MANIFEST} clean` +
      `${base ? `, none edited since ${base.slice(0, 12)}` : ""}.${online}`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(`migrations: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  });
}
