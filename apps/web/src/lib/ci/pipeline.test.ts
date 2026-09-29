/**
 * The pipeline's own rules, held where the unit suite can see them:
 * OPS-08 (the migration process check), DOC-P2-03 (something watches for
 * advisories) and DOC-01/DOC-02 (CI installs the lockfile tree).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..", "..", "..");

type MigrationsCheck = {
  checkNames: (files: string[]) => string[];
  checkImmutable: (nameStatus: string, renamed?: Map<string, string>) => string[];
  parseManifest: (text: string) => {
    entries: Map<string, { version: string; name: string; sha: string }>;
    problems: string[];
  };
  checkManifest: (
    files: Map<string, string>,
    entries: Map<string, { version: string; name: string; sha: string }>,
  ) => string[];
  parseRenamed: (text: string) => { renamed: Map<string, string>; problems: string[] };
  checkLive: (manifestPairs: string[], livePairs: string[]) => string[];
};

async function migrationsCheck(): Promise<MigrationsCheck> {
  return (await import(pathToFileURL(join(ROOT, "scripts", "check-migrations.mjs")).href)) as MigrationsCheck;
}

describe("OPS-08: the migration process check", () => {
  it("passes the repository's migrations as they stand", async () => {
    const { checkNames } = await migrationsCheck();
    const dir = join(ROOT, "supabase", "migrations");
    const files = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name);
    expect(files.length).toBeGreaterThan(300);
    expect(checkNames(files)).toEqual([]);
  });

  it("refuses a badly named file and a version used twice", async () => {
    const { checkNames } = await migrationsCheck();
    expect(checkNames(["fix_grants.sql"]).join()).toMatch(/not <14-digit version>/);
    expect(
      checkNames(["20260923120000_one.sql", "20260923120000_two.sql"]).join(),
    ).toMatch(/already used/);
  });

  it("refuses an edited, renamed or deleted applied migration, and allows a new one", async () => {
    const { checkImmutable } = await migrationsCheck();
    const diff = [
      "A\tsupabase/migrations/20260924000000_new.sql",
      "M\tsupabase/migrations/20260923234749_db04.sql",
      "R100\tsupabase/migrations/20260801000000_a.sql\tsupabase/migrations/20260801000000_b.sql",
      "D\tsupabase/migrations/20260701000000_old.sql",
      "M\tsupabase/migrations/pending/m06_bookings_extension.sql",
    ].join("\n");
    const problems = checkImmutable(diff);
    expect(problems).toHaveLength(3);
    expect(problems.join()).toMatch(/modified/);
    expect(problems.join()).toMatch(/renamed/);
    expect(problems.join()).toMatch(/deleted/);
    expect(checkImmutable("A\tsupabase/migrations/20260924000000_new.sql")).toEqual([]);
  });
});

describe("DB2: the applied manifest and the reviewed renames", () => {
  const SHA = "a".repeat(64);
  const OTHER = "b".repeat(64);

  it("wants APPLIED.txt to list exactly the top-level files, unedited", async () => {
    const { parseManifest, checkManifest } = await migrationsCheck();
    const { entries, problems } = parseManifest(`# comment\n20260101000000 one ${SHA}\n`);
    expect(problems).toEqual([]);
    expect(checkManifest(new Map([["20260101000000_one.sql", SHA]]), entries)).toEqual([]);
    expect(checkManifest(new Map([["20260101000000_one.sql", OTHER]]), entries).join()).toMatch(/edited after it was applied/);
    expect(
      checkManifest(new Map([["20260101000000_one.sql", SHA], ["20260102000000_two.sql", SHA]]), entries).join(),
    ).toMatch(/not in APPLIED\.txt/);
    expect(checkManifest(new Map(), entries).join()).toMatch(/no such file/);
    expect(parseManifest("20260101000000 one\n").problems.join()).toMatch(/not "<version> <name> <sha256>"/);
  });

  it("allows a move only when RENAMED.txt lists exactly it", async () => {
    const { parseRenamed, checkImmutable } = await migrationsCheck();
    const { renamed, problems } = parseRenamed(
      "20260924110000_a.sql 20260924104229_a.sql\n20260924140000_b.sql superseded/20260924140000_b.sql\n",
    );
    expect(problems).toEqual([]);
    const ok = [
      "R100\tsupabase/migrations/20260924110000_a.sql\tsupabase/migrations/20260924104229_a.sql",
      "D\tsupabase/migrations/20260924140000_b.sql",
      "A\tsupabase/migrations/superseded/20260924140000_b.sql",
    ].join("\n");
    expect(checkImmutable(ok, renamed)).toEqual([]);
    const bad = [
      "R100\tsupabase/migrations/20260924110000_a.sql\tsupabase/migrations/20260924999999_a.sql",
      "D\tsupabase/migrations/20260924140000_b.sql",
      "M\tsupabase/migrations/20260924104229_a.sql",
    ].join("\n");
    expect(checkImmutable(bad, renamed)).toHaveLength(3);
  });

  it("compares the manifest with the live history both ways", async () => {
    const { checkLive } = await migrationsCheck();
    expect(checkLive(["1 a", "2 b"], ["1 a", "2 b"])).toEqual([]);
    const problems = checkLive(["1 a", "2 b"], ["1 a", "3 c"]).join("\n");
    expect(problems).toMatch(/missing from APPLIED\.txt: 3 c/);
    expect(problems).toMatch(/never applied on the database: 2 b/);
  });
});

describe("the CI workflow", () => {
  const ci = readFileSync(join(ROOT, ".github", "workflows", "ci.yml"), "utf8");

  it("installs with npm ci, never npm install (the lockfile tree is what ships)", () => {
    expect(ci).toMatch(/run: npm ci/);
    expect(ci).not.toMatch(/run: npm install/);
  });

  it("runs the migration check against the previous commit, with history to diff", () => {
    expect(ci).toMatch(/node scripts\/check-migrations\.mjs --base/);
    expect(ci).toMatch(/fetch-depth: 0/);
  });

  it("keeps npm audit out of the required checks job", () => {
    const checksJob = ci
      .slice(ci.indexOf("  checks:"), ci.indexOf("\n  audit:"))
      .split("\n")
      .filter((line) => !line.trim().startsWith("#"))
      .join("\n");
    expect(checksJob).not.toMatch(/npm audit/);
    expect(ci).toMatch(/npm audit --omit=dev --audit-level=high/);
  });
});

describe("DOC-P2-03: something watches for advisories", () => {
  it("has a Dependabot config for the npm lockfile at the root", () => {
    const dependabot = readFileSync(join(ROOT, ".github", "dependabot.yml"), "utf8");
    expect(dependabot).toMatch(/package-ecosystem:\s*npm\s*\n\s*directory:\s*\//);
  });
});

describe("A10 gate details", () => {
  const ci = readFileSync(join(ROOT, ".github", "workflows", "ci.yml"), "utf8");

  it("DOC-23: a push to main is never cancelled by the next push", () => {
    expect(ci).toMatch(/cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
    expect(ci).not.toMatch(/^\s*cancel-in-progress: true\s*$/m);
  });

  it("DOC-P2-04: failures are recorded by name (junit, kept as an artifact) and never retried", () => {
    expect(ci).toMatch(/--reporter=junit/);
    expect(ci).toMatch(/name: vitest-junit/);
    expect(readFileSync(join(ROOT, "apps", "web", "vitest.config.ts"), "utf8")).toMatch(/retry: 0/);
  });

  it("DOC-18: lint fails when the warning count rises", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "apps", "web", "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts.lint).toMatch(/eslint \. --max-warnings=\d+/);
  });
});
