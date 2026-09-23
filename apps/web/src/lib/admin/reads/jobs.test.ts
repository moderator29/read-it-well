import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PG_CRON_JOBS, VERCEL_JOBS } from "./jobs";

/**
 * The job counts are DERIVED, so they cannot drift a third time: the
 * database's list is held equal to the migrations that schedule it, the
 * Vercel list is held equal to `vercel.json` (`session-b-admin-shell.test.ts`),
 * and the handbook's table and its stated numbers are held equal to both.
 */
const root = new URL("../../../../../../", import.meta.url);

/** Every pg_cron job the migrations leave scheduled, name -> cron, in migration order. */
function scheduledInMigrations(): Map<string, string> {
  const dir = new URL("supabase/migrations/", root);
  const jobs = new Map<string, string>();
  const rename = (name: string) => name.replace(/^rentme/, "vallo");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(new URL(file, dir), "utf8");
    for (const m of sql.matchAll(/cron\.unschedule\s*\(\s*'([^']+)'\s*\)/g)) jobs.delete(rename(m[1]!));
    for (const m of sql.matchAll(/cron\.schedule\s*\(\s*'([^']+)'\s*,\s*'([^']+)'/g)) jobs.set(rename(m[1]!), m[2]!);
  }
  return jobs;
}

describe("PG_CRON_JOBS", () => {
  it("lists every job the migrations schedule, at the time they schedule it, and nothing else", () => {
    const scheduled = scheduledInMigrations();
    expect(scheduled.size).toBeGreaterThan(0);
    const ours = new Map(PG_CRON_JOBS.map((j) => [j.name, j.cron]));
    const missing = [...scheduled.keys()].filter((name) => !ours.has(name));
    expect(missing, `scheduled in supabase/migrations but not in PG_CRON_JOBS: ${missing.join(", ")}`).toEqual([]);
    expect([...ours.entries()].sort()).toEqual([...scheduled.entries()].sort());
  });
});

describe("the handbook's job table", () => {
  const handbook = readFileSync(new URL("docs/ADMIN_CONSOLE.md", root), "utf8");
  const rows = [...handbook.matchAll(/^\| ([A-Za-z0-9_-]+) \| (Vercel Cron|pg_cron) `([^`]+)` \|/gm)];

  it("has one row per job, at its schedule, for both schedulers", () => {
    const table = rows.map((r) => `${r[2]} ${r[1]} ${r[3]}`).sort();
    const expected = [
      ...VERCEL_JOBS.map((j) => `Vercel Cron ${j.name} ${j.cron}`),
      ...PG_CRON_JOBS.map((j) => `pg_cron ${j.name} ${j.cron}`),
    ].sort();
    expect(table).toEqual(expected);
  });
  it("states the derived counts", () => {
    expect(handbook).toContain(`${VERCEL_JOBS.length} Vercel Cron jobs and ${PG_CRON_JOBS.length} pg_cron jobs`);
  });
});
