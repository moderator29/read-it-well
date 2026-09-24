/**
 * DOC-03: the database probe harness, the half that needs no database.
 *
 * `scripts/db-probes/run.mjs` runs every `supabase/tests/probes/*.sql` against
 * a live database (CI job `db-probes`, when the DATABASE_URL secret is set).
 * This suite pins the rule it judges by, and holds every probe file in the
 * folder to the contract, so a probe that could commit, or that can only ever
 * come back green, is red here on every push, database or not.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..", "..", "..");
const PROBES = join(ROOT, "supabase", "tests", "probes");

type Contract = {
  probeIdFromPath: (p: string) => string;
  checkProbeSource: (p: string, sql: string) => string[];
  judgeRun: (id: string, output: string, exitCode: number | null) => { ok: boolean; reason: string };
};

async function contract(): Promise<Contract> {
  return (await import(pathToFileURL(join(ROOT, "scripts", "db-probes", "contract.mjs")).href)) as Contract;
}

const GOOD = `-- a comment
do $$
begin
  if false then raise exception 'PROBE_FAIL db-99: x'; end if;
  raise exception 'PROBE_OK db-99';
end;
$$;
`;

describe("judgeRun: a probe passes only on its own PROBE_OK", () => {
  it("passes on PROBE_OK <id> in the server's error", async () => {
    const { judgeRun } = await contract();
    expect(judgeRun("db-99", "ERROR:  PROBE_OK db-99: 12 pairs", 3).ok).toBe(true);
    expect(judgeRun("db-99", 'Failed to apply database migration: ERROR:  P0001: PROBE_OK DB-99', 1).ok).toBe(true);
  });

  it("fails on PROBE_FAIL, even when PROBE_OK text appears too", async () => {
    const { judgeRun } = await contract();
    const r = judgeRun("db-99", "ERROR:  PROBE_FAIL db-99: anon wrote (PROBE_OK db-99 never reached)", 3);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/PROBE_FAIL db-99/);
  });

  it("never counts a PROBE_OK that arrived as a NOTICE", async () => {
    const { judgeRun } = await contract();
    // `raise notice 'PROBE_OK <id>'` and a normal end asserts nothing.
    expect(judgeRun("db-99", "psql:<stdin>:2: NOTICE:  PROBE_OK db-99", 0).ok).toBe(false);
    // A notice that spells an ERROR line, followed by an unrelated error.
    expect(
      judgeRun("db-99", "psql:<stdin>:2: NOTICE:  ERROR:  PROBE_OK db-99\npsql:<stdin>:9: ERROR:  division by zero", 3).ok,
    ).toBe(false);
  });

  it("passes the psql shape: PROBE_OK on an ERROR line and a non-zero exit", async () => {
    const { judgeRun } = await contract();
    expect(judgeRun("db-99", "psql:<stdin>:40: ERROR:  PROBE_OK db-99: 12 pairs", 3).ok).toBe(true);
    // The same line with a zero exit is not a pass: the client must have seen the error.
    expect(judgeRun("db-99", "psql:<stdin>:40: ERROR:  PROBE_OK db-99: 12 pairs", 0).ok).toBe(false);
  });

  it("fails when the probe finished without raising (exit 0)", async () => {
    const { judgeRun } = await contract();
    expect(judgeRun("db-99", "", 0)).toMatchObject({ ok: false, reason: expect.stringMatching(/without raising/) });
  });

  it("fails on another probe's PROBE_OK, and on a longer id that merely starts with this one", async () => {
    const { judgeRun } = await contract();
    expect(judgeRun("db-9", "ERROR:  PROBE_OK db-99", 3).ok).toBe(false);
    expect(judgeRun("db-99", "ERROR:  PROBE_OK db-01", 3).reason).toMatch(/names another probe/);
  });

  it("fails on a syntax error, a timeout or a lost connection", async () => {
    const { judgeRun } = await contract();
    expect(judgeRun("db-99", 'ERROR:  syntax error at or near "selec"', 3).ok).toBe(false);
    expect(judgeRun("db-99", "ERROR:  canceling statement due to statement timeout", 3).ok).toBe(false);
    expect(judgeRun("db-99", "psql: error: connection refused", 2).ok).toBe(false);
  });
});

describe("checkProbeSource: the shape every probe keeps", () => {
  it("accepts the canonical shape", async () => {
    const { checkProbeSource } = await contract();
    expect(checkProbeSource("supabase/tests/probes/db-99.sql", GOOD)).toEqual([]);
  });

  it("refuses a file whose PROBE_OK names another probe", async () => {
    const { checkProbeSource } = await contract();
    expect(checkProbeSource("x/db-98.sql", GOOD).join()).toMatch(/PROBE_OK db-98/);
  });

  it("refuses a file with no PROBE_FAIL branch", async () => {
    const { checkProbeSource } = await contract();
    const sql = "do $$ begin raise exception 'PROBE_OK db-99'; end $$;";
    expect(checkProbeSource("db-99.sql", sql).join()).toMatch(/PROBE_FAIL/);
  });

  it("refuses statements outside the one DO block, and COMMIT anywhere", async () => {
    const { checkProbeSource } = await contract();
    expect(checkProbeSource("db-99.sql", `${GOOD}\ngrant all on public.wallets to anon;`).join()).toMatch(/ONE block/);
    expect(checkProbeSource("db-99.sql", GOOD.replace("begin", "begin commit;")).join()).toMatch(/COMMIT/);
    expect(checkProbeSource("db-99.sql", `grant all on public.wallets to anon;\n${GOOD}`).join()).toMatch(/does not start/);
  });

  it("refuses dblink and pg_net, which write outside the rolled-back transaction", async () => {
    const { checkProbeSource } = await contract();
    expect(checkProbeSource("db-99.sql", GOOD.replace("begin", "begin perform dblink_exec('x', 'y');")).join()).toMatch(/dblink or pg_net/);
    expect(checkProbeSource("db-99.sql", GOOD.replace("begin", "begin perform net.http_post('https://x');")).join()).toMatch(/dblink or pg_net/);
  });

  it("does not count a PROBE_OK that exists only in a comment", async () => {
    const { checkProbeSource } = await contract();
    const sql = "-- raise exception 'PROBE_OK db-99'\ndo $$ begin raise exception 'PROBE_FAIL db-99'; end $$;";
    expect(checkProbeSource("db-99.sql", sql).join()).toMatch(/never raises/);
  });
});

describe("every probe in supabase/tests/probes keeps the contract", () => {
  const files = readdirSync(PROBES).filter((f) => f.endsWith(".sql"));

  it("the folder is not empty (an empty folder would make the CI job pass over nothing)", () => {
    expect(files.length).toBeGreaterThanOrEqual(3);
  });

  it.each(files)("%s", async (file) => {
    const { checkProbeSource } = await contract();
    expect(checkProbeSource(file, readFileSync(join(PROBES, file), "utf8"))).toEqual([]);
  });
});

/*
 * information_schema's grant views (role_table_grants, table_privileges,
 * column_privileges, routine_privileges, ...) list only the grants the
 * OBSERVING role is party to. Two migrations asserted "born locked" against
 * role_table_grants, got an empty answer under the migration role, and passed
 * by seeing nothing. Grant checks read pg_class.relacl / pg_attribute.attacl /
 * pg_proc.proacl or ask has_*_privilege(role, ...), which answer for the named
 * role. The two applied migrations cannot be edited; their claims are re-made
 * by `supabase/tests/probes/info-schema-guards.sql`.
 */
describe("no SQL check reads grants through information_schema", () => {
  const APPLIED_AND_SUPERSEDED = new Set([
    "supabase/migrations/20260923092729_push_one_the_table_a_device_is_remembered_in.sql",
    "supabase/migrations/20260923093115_a_password_change_and_a_new_device_leave_the_building.sql",
  ]);
  const OBSERVER_VIEWS =
    /information_schema\s*\.\s*(role_)?(table|column|routine|udt|usage)_(grants|privileges)|information_schema\s*\.\s*role_(table|column|routine|usage|udt)_grants/i;

  const sqlFiles = (dir: string): string[] =>
    readdirSync(join(ROOT, dir), { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith(".sql"))
      .map((f) => `${dir}/${f.split("\\").join("/")}`);

  const withoutComments = (sql: string) => sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");

  it("finds none outside the two applied migrations it supersedes", () => {
    const files = [...sqlFiles("supabase/migrations"), ...sqlFiles("supabase/tests"), ...sqlFiles("scripts/probes")];
    expect(files.length).toBeGreaterThan(300);
    const offenders = files.filter(
      (f) => !APPLIED_AND_SUPERSEDED.has(f) && OBSERVER_VIEWS.test(withoutComments(readFileSync(join(ROOT, f), "utf8"))),
    );
    expect(offenders).toEqual([]);
  });

  it("the pattern bites: both superseded migrations still match it", () => {
    for (const f of APPLIED_AND_SUPERSEDED) {
      expect(OBSERVER_VIEWS.test(withoutComments(readFileSync(join(ROOT, f), "utf8"))), f).toBe(true);
    }
  });
});
