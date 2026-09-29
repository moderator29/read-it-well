#!/usr/bin/env node
/**
 * Run every database probe in `supabase/tests/probes/*.sql` against a live
 * database and pass only when each one raises `PROBE_OK <its id>`.
 *
 *   DATABASE_URL=postgres://... node scripts/db-probes/run.mjs [--only db-04,...] [--json out.json]
 *   node scripts/db-probes/run.mjs --check     # shape check only, no database
 *   node scripts/db-probes/run.mjs --list      # print the probe files, one per line
 *   node scripts/db-probes/run.mjs --dir <path> ...   # a different probe folder
 *
 * HOW A PROBE RUNS. Each file goes to `psql` on its own connection as
 *
 *     \set ON_ERROR_STOP 1
 *     begin;
 *     set local statement_timeout = '60s';
 *     set local lock_timeout = '5s';
 *     <the probe>
 *     rollback;
 *
 * A probe always ends in `raise exception`, so the transaction aborts and
 * nothing is kept. If a probe forgets to raise, the explicit `rollback` still
 * throws its work away and the run is judged FAIL, because no PROBE_OK was
 * seen. The lock timeout keeps a probe from queueing behind live traffic on
 * the production database; the statement timeout keeps a bad probe from
 * holding its locks.
 *
 * THE ROLE. The connection must be able to `set role anon` and `set role
 * authenticated` (the probes switch into the API roles to prove what they can
 * and cannot do), which on Supabase means the `postgres` user. See
 * supabase/tests/README.md for which connection string to use.
 *
 * IN A CLAUDE SESSION WITHOUT A CONNECTION STRING, the same files run through
 * the Supabase MCP: `apply_migration` with the file's contents. The expected
 * result is an ERROR whose text contains `PROBE_OK <id>`, and because the
 * migration failed nothing is recorded in `supabase_migrations`. `--list`
 * prints the files to feed it. `execute_sql` must NOT be used: it runs with
 * `rolbypassrls` and cannot demonstrate a refusal.
 *
 * Exit status: 0 when every probe passed, 1 when any failed, 2 when the
 * runner itself could not run (no DATABASE_URL, no psql, no probes).
 */
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkProbeSource,
  connectionError,
  judgeRun,
  normaliseDatabaseUrl,
  probeIdFromPath,
  redactPassword,
} from "./contract.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
// `--dir` exists for the runner's own tests; everything else uses the default.
const PROBES_DIR = value("--dir") ?? join(ROOT, "supabase", "tests", "probes");

function probeFiles() {
  let names;
  try {
    names = readdirSync(PROBES_DIR);
  } catch {
    return [];
  }
  return names.filter((n) => n.endsWith(".sql")).sort().map((n) => join(PROBES_DIR, n));
}

const only = (value("--only") ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const files = probeFiles().filter((f) => only.length === 0 || only.includes(probeIdFromPath(f)));

if (files.length === 0) {
  console.error(`db-probes: no probe files in ${relative(ROOT, PROBES_DIR)}${only.length ? ` matching ${only.join(",")}` : ""}.`);
  process.exit(2);
}

if (flag("--list")) {
  for (const f of files) console.log(relative(ROOT, f));
  process.exit(0);
}

// The shape check runs first, always. A probe that could commit never reaches a database.
let shapeBad = 0;
for (const f of files) {
  const problems = checkProbeSource(f, readFileSync(f, "utf8"));
  if (problems.length > 0) {
    shapeBad += 1;
    console.error(`SHAPE FAIL ${relative(ROOT, f)}:\n  - ${problems.join("\n  - ")}`);
  }
}
if (shapeBad > 0) {
  console.error(`db-probes: ${shapeBad} of ${files.length} probe files break the contract (scripts/db-probes/contract.mjs). Nothing was run.`);
  process.exit(1);
}
if (flag("--check")) {
  console.log(`db-probes: ${files.length} probe files keep the contract (shape only; no database was contacted).`);
  process.exit(0);
}

const url = normaliseDatabaseUrl(process.env.DATABASE_URL);
if (url.length === 0) {
  console.error("db-probes: DATABASE_URL is not set, so no probe can run. This is a failure, not a skip.");
  process.exit(2);
}
const psqlCheck = spawnSync("psql", ["--version"], { encoding: "utf8" });
if (psqlCheck.status !== 0) {
  console.error("db-probes: psql is not installed (apt-get install postgresql-client).");
  process.exit(2);
}

/*
 * ONE CONNECTION FIRST. If the database cannot be reached, every probe fails
 * the same way, and sixty identical lines hide the one fact that matters. So
 * the runner connects once, and on failure prints psql's own words (password
 * removed) and stops with the "could not run" status. The two usual causes on
 * Supabase are named: the direct `db.<ref>.supabase.co` host is IPv6 only and
 * GitHub's runners have no IPv6, and a wrong password.
 */
const reach = spawnSync("psql", ["-X", "-q", "-t", "-c", "select 1", url], {
  encoding: "utf8",
  env: { ...process.env, PGAPPNAME: "db-probe preflight", PGCONNECT_TIMEOUT: "15" },
  timeout: 60_000,
});
if (reach.error || reach.status !== 0) {
  const said = connectionError(`${reach.stdout ?? ""}\n${reach.stderr ?? ""}`) ?? (reach.error?.message || (reach.stderr ?? "").trim() || `psql exited ${reach.status}`);
  console.error(`db-probes: could not connect to the database, so no probe ran.\n  ${redactPassword(said, url)}`);
  console.error(
    "  Use the Supabase SESSION pooler URI (aws-0-<region>.pooler.supabase.com:5432, user postgres.<ref>), not the direct db.<ref>.supabase.co host, which is IPv6 only and unreachable from GitHub runners; and check the password. See supabase/tests/README.md.",
  );
  process.exit(2);
}

const results = [];
for (const f of files) {
  const id = probeIdFromPath(f);
  const sql = readFileSync(f, "utf8");
  const script = [
    "\\set ON_ERROR_STOP 1",
    "begin;",
    "set local statement_timeout = '60s';",
    "set local lock_timeout = '5s';",
    sql,
    "rollback;",
    "",
  ].join("\n");
  const started = Date.now();
  const run = spawnSync("psql", ["-X", "-q", "-v", "VERBOSITY=terse", url], {
    input: script,
    encoding: "utf8",
    env: { ...process.env, PGAPPNAME: `db-probe ${id}`, PGCONNECT_TIMEOUT: "15" },
    timeout: 120_000,
  });
  const output = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  const verdict = run.error
    ? { ok: false, reason: `psql did not finish: ${run.error.message}` }
    : judgeRun(id, output, run.status);
  verdict.reason = redactPassword(verdict.reason, url);
  results.push({ id, file: relative(ROOT, f), ms: Date.now() - started, ...verdict });
  console.log(`${verdict.ok ? "PASS" : "FAIL"} ${id} (${Date.now() - started} ms) ${verdict.ok ? "" : verdict.reason}`);
}

const failed = results.filter((r) => !r.ok);
const jsonOut = value("--json");
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 2));

console.log(`\ndb-probes: ${results.length - failed.length} of ${results.length} passed${failed.length ? `, ${failed.length} FAILED: ${failed.map((r) => r.id).join(", ")}` : ""}.`);
process.exit(failed.length > 0 ? 1 : 0);
