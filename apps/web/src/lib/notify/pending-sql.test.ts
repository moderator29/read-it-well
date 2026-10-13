import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { PG_CRON_JOBS } from "@/lib/admin/reads/jobs";

/**
 * THE NOTIFICATION MIGRATIONS (track/notifications, 13 October 2026), held to
 * the rules the lead applied them under. Applied to the live database on
 * 13 October 2026 and recorded in `supabase/migrations/APPLIED.txt` as
 * `<version>_nt0N_*.sql`; their probes moved to `supabase/tests/probes/`.
 *
 * Applied files are never edited (scripts/check-migrations.mjs), so these
 * checks read the files exactly as they ran and keep holding them to what the
 * brief said:
 *
 *   - ADDITIVE ONLY. No DROP and no DELETE statement (the connector freezes on
 *     them), no TRUNCATE, no ALTER ... DROP, and no new cron job.
 *   - A PROBE EACH, in `supabase/tests/probes/`, that ends in the
 *     PROBE_OK line and rolls back.
 *   - EVERY SECURITY DEFINER FUNCTION PINS ITS search_path (rule M4), and every
 *     function created in `private` is revoked from the API roles in the same
 *     file (rule 21), so a notice function can never be called from a client.
 *   - ONE DOOR. Nothing inserts into `public.notifications` by hand: every
 *     notice goes through `private.notify` or the `private.notify_once` that
 *     wraps it.
 *   - THE CRON COUNT DOES NOT MOVE. No file schedules a job; the new sweeps
 *     ride the existing `vallo_send_member_reminders`.
 */

const ROOT = fileURLToPath(new URL("../../../../../", import.meta.url));
/* Applied migrations live directly in supabase/migrations, named
   <14-digit version>_<name>.sql. */
const MIGRATIONS = join(ROOT, "supabase", "migrations");
const PROBES = join(ROOT, "supabase", "tests", "probes");
const NT = /^\d{14}_(nt\d{2})_[a-z0-9_]+\.sql$/;

const FILES = readdirSync(MIGRATIONS)
  .filter((name) => NT.test(name))
  .sort((a, b) => code(a).localeCompare(code(b)));

/** The nt code of a file, such as "nt05". */
function code(name: string): string {
  return NT.exec(name)?.[1] ?? name;
}

/** The file with line comments and block comments removed, so only statements remain. */
function statements(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
}

describe("the notification migrations", () => {
  it("are the six that were written", () => {
    expect(FILES.map((name) => code(name))).toEqual(["nt01", "nt02", "nt03", "nt04", "nt05", "nt06"]);
  });

  it.each(FILES)("%s is additive: no DROP, DELETE or TRUNCATE, and no new cron job", (name) => {
    const text = statements(readFileSync(join(MIGRATIONS, name), "utf8"));
    expect(text).not.toMatch(/\bdrop\b/i);
    expect(text).not.toMatch(/\bdelete\b/i);
    expect(text).not.toMatch(/\btruncate\b/i);
    expect(text).not.toMatch(/cron\.schedule/i);
    /* The whole file, comments included, never names the two words the
       connector freezes on. */
    const raw = readFileSync(join(MIGRATIONS, name), "utf8");
    expect(raw).not.toMatch(/\bdrop\b/i);
    expect(raw).not.toMatch(/\bdelete\b/i);
  });

  it.each(FILES)("%s has a probe that rolls back", (name) => {
    const prefix = code(name);
    const probe = readdirSync(PROBES).find((p) => p.startsWith(`${prefix}-`));
    expect(probe, `${name} has no probe`).toBeDefined();
    const text = readFileSync(join(PROBES, probe!), "utf8");
    expect(text).toMatch(new RegExp(`raise exception 'PROBE_OK ${prefix}-`));
    expect(text).toMatch(/PROBE_FAIL/);
  });

  it.each(FILES)("%s pins search_path on every security definer function", (name) => {
    const text = statements(readFileSync(join(MIGRATIONS, name), "utf8"));
    const functions = text.split(/create or replace function/i).slice(1);
    expect(functions.length).toBeGreaterThan(0);
    for (const fn of functions) {
      const head = fn.slice(0, fn.search(/\bas\s+\$/i));
      if (/security definer/i.test(head)) {
        expect(head, head.slice(0, 80)).toMatch(/set search_path to/i);
      }
    }
  });

  it.each(FILES)("%s revokes every function it creates in private from the API roles", (name) => {
    const text = statements(readFileSync(join(MIGRATIONS, name), "utf8"));
    const created = [...text.matchAll(/create or replace function (private\.[a-z_0-9]+)\s*\(/gi)].map((m) => m[1]!);
    expect(created.length).toBeGreaterThan(0);
    const revokes = [...text.matchAll(/revoke all on function([\s\S]*?)from public, anon, authenticated, service_role;/gi)]
      .map((m) => m[1]!)
      .join("\n");
    for (const fn of new Set(created)) {
      expect(revokes, `${name}: ${fn} is not revoked from the API roles`).toContain(`${fn}(`);
    }
  });

  it.each(FILES)("%s writes notifications only through private.notify or private.notify_once", (name) => {
    const text = statements(readFileSync(join(MIGRATIONS, name), "utf8"));
    expect(text).not.toMatch(/insert into public\.notifications/i);
    expect(text).not.toMatch(/insert into notifications/i);
  });

  it("do not move the cron count (the new sweeps ride the existing job)", () => {
    const names = PG_CRON_JOBS.map((job) => job.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("vallo_send_member_reminders");
    /* No migration here schedules anything (checked above), so the count in
       PG_CRON_JOBS and in the table in docs/ADMIN_CONSOLE.md is what it was. */
    const nt05File = FILES.find((name) => name.endsWith("_nt05_stay_reminders_and_unread_message_email.sql"));
    expect(nt05File, "nt05 is not recorded").toBeDefined();
    const nt05 = readFileSync(join(MIGRATIONS, nt05File!), "utf8");
    expect(nt05).toContain("create or replace function private.send_member_reminders()");
  });

  it("never print a claim with no mechanism in any notice they write", () => {
    for (const name of FILES) {
      const text = statements(readFileSync(join(MIGRATIONS, name), "utf8"));
      /* Only the strings handed to a notice: single-quoted literals in the file. */
      for (const literal of text.matchAll(/'((?:[^']|'')*)'/g)) {
        const words = literal[1]!;
        expect(words, `${name}: ${words.slice(0, 60)}`).not.toMatch(/\b(safe|secure|guaranteed?|100 percent)\b/i);
        expect(words, `${name}: ${words.slice(0, 60)}`).not.toMatch(/\bverified\b/i);
      }
    }
  });

  it("have a map that names every migration", () => {
    const map = readFileSync(join(ROOT, "docs", "NOTIFICATIONS_MAP.md"), "utf8");
    for (const name of FILES) {
      expect(map, name).toContain(name.replace(/^\d{14}_/, "").replace(/\.sql$/, ""));
    }
    expect(existsSync(join(ROOT, "docs", "NOTIFICATIONS_MAP.md"))).toBe(true);
  });
});
