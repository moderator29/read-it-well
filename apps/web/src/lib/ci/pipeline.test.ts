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
  checkImmutable: (nameStatus: string) => string[];
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
