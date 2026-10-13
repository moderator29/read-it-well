import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * THE VISIT REMINDERS, HELD TO THEIR SQL (13 October 2026).
 *
 * The reminders are a database function (`private.send_viewing_reminders`,
 * run by pg_cron through `private.send_member_reminders`), so this file reads
 * the SQL the way `lib/admin/reads/jobs.test.ts` reads the migrations: as
 * text, from the newest file that defines it, applied or still in
 * `supabase/migrations/pending/`. It locks the three stages and the two
 * audiences, the stage rule (including D-05: the evening reminder only for a
 * visit whose Lagos date is exactly tomorrow), the links on both sides, the
 * visit mode in every message, and the house rules for a draft.
 *
 * The rule was also run against Postgres (PGlite, in the session that wrote
 * it) over the cases named below; this test is what keeps the text from
 * drifting afterwards.
 */
const root = new URL("../../../../../", import.meta.url);
const migrations = new URL("supabase/migrations/", root);
const pending = new URL("pending/", migrations);
const DRAFT = new URL("visit_reminders_both_sides.sql", pending);

/** The newest definition of a function among the applied files and the drafts. */
function newestDefinition(name: string): string {
  const files = [
    ...readdirSync(migrations).filter((f) => f.endsWith(".sql")).sort().map((f) => new URL(f, migrations)),
    ...(existsSync(pending) ? readdirSync(pending).filter((f) => f.endsWith(".sql")).sort().map((f) => new URL(f, pending)) : []),
  ];
  let found = "";
  const head = new RegExp(`create or replace function ${name.replace(".", "\\.")}\\(`, "i");
  for (const file of files) {
    const sql = readFileSync(file, "utf8");
    const at = sql.search(head);
    if (at < 0) continue;
    const start = sql.indexOf("$fn$", at);
    const end = sql.indexOf("$fn$", start + 4);
    found = sql.slice(at, end + 4);
  }
  return found;
}

describe("the pending reminders draft", () => {
  const sql = readFileSync(DRAFT, "utf8");

  it("follows the house rules for a draft", () => {
    expect(sql.startsWith("set lock_timeout = '5s';")).toBe(true);
    expect(sql).toContain("$fn$");
    expect(sql).not.toMatch(/\$\$/);
    expect(sql).not.toMatch(/\bdelete\b/i);
    expect(sql).not.toMatch(/\btruncate\b/i);
    expect(sql).not.toContain("—");
    /* The one DROP is the stage constraint, replaced in the same statement. */
    const drops = sql.split("\n").filter((line) => /\bdrop\b/i.test(line) && !line.trim().startsWith("--"));
    expect(drops).toEqual(["  drop constraint if exists viewing_reminders_stage_check,"]);
    expect(sql).not.toMatch(/cron\.(schedule|unschedule)/);
  });

  it("widens the stage check to exactly eve, morning and soon", () => {
    expect(sql).toMatch(
      /add constraint viewing_reminders_stage_check check \(stage in \('eve', 'morning', 'soon'\)\);/,
    );
  });

  it("lets admins read the ledger and nobody else", () => {
    expect(sql).toContain("grant select on public.viewing_reminders to authenticated;");
    expect(sql).toMatch(/create policy viewing_reminders_select_admin\s+on public\.viewing_reminders\s+for select/);
    expect(sql).toContain("'admin'::public.app_role");
    expect(sql).toContain("'super_admin'::public.app_role");
    expect(sql).not.toMatch(/grant (insert|update|all)[^;]*viewing_reminders/i);
  });

  it("keeps every function on an empty search_path and off the public roles", () => {
    const heads = [...sql.matchAll(/create or replace function ([\w.]+)\(/g)].map((m) => m[1]);
    expect(heads).toEqual([
      "private.viewing_reminder_stage",
      "private.send_viewing_reminders",
      "private.notify_inspection_change",
    ]);
    expect([...sql.matchAll(/set search_path = ''/g)].length).toBe(heads.length);
    for (const name of heads) {
      expect(sql).toMatch(new RegExp(`revoke all on function ${name!.replace(".", "\\.")}\\([^)]*\\) from public, anon, authenticated;`));
    }
  });
});

describe("the reminder stages (newest definition)", () => {
  const stage = newestDefinition("private.viewing_reminder_stage");
  const send = newestDefinition("private.send_viewing_reminders");

  it("is defined", () => {
    expect(stage.length).toBeGreaterThan(0);
    expect(send.length).toBeGreaterThan(0);
  });

  it("returns only the three stages", () => {
    const returned = [...stage.matchAll(/return '(\w+)';/g)].map((m) => m[1]).sort();
    expect(returned).toEqual(["eve", "morning", "soon"]);
  });

  it("sends soon two hours before", () => {
    expect(stage).toMatch(/if p_at >= p_slot - interval '2 hours' then\s+return 'soon';/);
  });

  it("sends morning at 08:00 on the day, for 10:00 or later, confirmed before 08:00, not within the hour of soon", () => {
    const morning = stage.slice(stage.indexOf("if today = slot_day"), stage.indexOf("return 'morning';"));
    expect(morning).toContain("slot_local::time >= time '10:00'");
    expect(morning).toContain("lagos >= slot_day + time '08:00'");
    expect(morning).toContain("(p_confirmed at time zone 'Africa/Lagos') < slot_day + time '08:00'");
    expect(morning).toContain("p_at < p_slot - interval '3 hours'");
  });

  it("D-05: sends eve at 19:00 only when the visit's Lagos date is exactly tomorrow", () => {
    const eve = stage.slice(stage.lastIndexOf("if ", stage.indexOf("return 'eve';")), stage.indexOf("return 'eve';"));
    expect(eve).toContain("today = slot_day - 1");
    expect(eve).toContain("lagos >= (slot_day - 1) + time '19:00'");
    /* The live bug: a lower bound alone fired "tomorrow" for a visit later the same day. */
    expect(stage).not.toMatch(/today < slot_day/);
    expect(stage).toContain("today      date := (p_at at time zone 'Africa/Lagos')::date;");
    expect(stage).toContain("slot_day   date := (p_slot at time zone 'Africa/Lagos')::date;");
  });

  it("sends one stage per visit per run, to both audiences, deduplicated in the ledger", () => {
    expect(send).toContain("due_stage := private.viewing_reminder_stage(r.slot_at, r.confirmed_at, now());");
    expect(send).toContain("foreach aud in array array['renter', 'lister'] loop");
    expect(send).toMatch(/insert into public\.viewing_reminders \(inspection_id, audience, stage, slot_at\)\s+values \(r\.id, aud, due_stage, r\.slot_at\) on conflict do nothing;/);
    expect(send).toContain("where i.state = 'CONFIRMED'");
  });

  it("says the visit mode and links each side to its own page", () => {
    expect(send).toContain("i.visit_mode");
    expect(send).toContain("'by video call in Vallo'");
    expect(send).toContain("'in person at ' || r.place");
    expect(send).toContain("renter_href := '/listing/' || r.listing_id::text || '/visit/' || r.id::text;");
    expect(send).toMatch(/perform private\.notify\(r\.requester_id,[\s\S]*?renter_href\);/);
    expect(send).toMatch(/perform private\.notify\(r\.lister_id,[\s\S]*?'\/agent\/inspections'\);/);
  });
});

describe("the change notices (newest definition)", () => {
  const notice = newestDefinition("private.notify_inspection_change");

  it("tells the lister of a request and of a cancel, and the renter of confirm, propose and decline", () => {
    expect(notice).toContain("'Inspection requested'");
    expect(notice).toContain("'Inspection withdrawn'");
    expect(notice).toContain("'Viewing cancelled'");
    expect(notice).toContain("'Inspection confirmed'");
    expect(notice).toContain("'Another time offered'");
    expect(notice).toContain("'Inspection declined'");
  });

  it("says the mode and sends the renter to the visit page", () => {
    expect(notice).toContain("how := case when new.visit_mode = 'video' then 'by video call in Vallo' else 'in person' end;");
    expect(notice).toContain("renter_href := '/listing/' || new.listing_id::text || '/visit/' || new.id::text;");
    expect(notice).not.toContain("'/inspections'");
  });
});
