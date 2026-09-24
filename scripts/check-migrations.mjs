#!/usr/bin/env node
/**
 * OPS-08: the migration process, checked on every push.
 *
 * Migrations are applied to the live database first (through the Supabase
 * MCP or the dashboard) and committed afterwards under the version the server
 * stamped. Nothing stopped a committed migration from being edited later, so
 * the repository could stop describing the database it claims to describe,
 * and nothing stopped two files claiming one version. This holds three rules:
 *
 *   1. NAMES. Every file directly in supabase/migrations is
 *      `<14-digit version>_<snake_case>.sql`. (`pending/` holds drafts that
 *      are not applied and is not checked.)
 *   2. ONE FILE PER VERSION. No two files share a version.
 *   3. APPLIED IS IMMUTABLE. Against `--base <git ref>` (CI passes the commit
 *      before the push, or the pull request's base), no existing migration
 *      file was modified, renamed or deleted. A mistake in an applied
 *      migration is corrected by a NEW migration, never by editing history,
 *      because the live database already ran the old text.
 *
 * It cannot see the live database: whether each file was really applied is the
 * job of the database probes (`supabase/tests/probes`, CI job "Database
 * probes"), which read the live catalogue.
 *
 *   node scripts/check-migrations.mjs [--base <ref>]
 */
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const NAME = /^(\d{14})_[a-z0-9_]+\.sql$/;

/** Rules 1 and 2 over a directory listing. Returns problems, empty when clean. */
export function checkNames(files) {
  const problems = [];
  const seen = new Map();
  for (const file of files) {
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

/**
 * Rule 3 over `git diff --name-status <base> HEAD -- supabase/migrations`
 * output. Additions are fine; anything else touching an applied file is not.
 */
export function checkImmutable(nameStatus) {
  const problems = [];
  for (const line of nameStatus.split("\n")) {
    const parts = line.trim().split(/\t+/);
    const status = parts[0] ?? "";
    const path = parts[1] ?? "";
    if (status === "" || status === "A") continue;
    if (path.includes("/pending/")) continue;
    if (!/^supabase\/migrations\/[^/]+\.sql$/.test(path)) continue;
    const what = status.startsWith("R") ? "renamed" : status === "D" ? "deleted" : "modified";
    problems.push(`${path}: ${what}. An applied migration is never edited; write a new one.`);
  }
  return problems;
}

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const dir = join(root, "supabase", "migrations");
  const files = readdirSync(dir).filter((f) => statSync(join(dir, f)).isFile());
  const problems = checkNames(files);

  const i = process.argv.indexOf("--base");
  const base = i === -1 ? "" : (process.argv[i + 1] ?? "");
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
    problems.push(...checkImmutable(diff));
  } else {
    console.log("migrations: no --base given, so rule 3 (applied migrations are immutable) was not checked.");
  }

  if (problems.length > 0) {
    console.error(`migrations: ${problems.length} problem(s):\n  - ${problems.join("\n  - ")}`);
    process.exit(1);
  }
  console.log(`migrations: ${files.length} files, names and versions clean${base ? `, none changed since ${base.slice(0, 12)}` : ""}.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
