import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

/*
 * V-51: the migration gate's rules, run against the two lines that caused the
 * section 67 outage and against their correct forms. The gate itself is
 * `scripts/check-migration-rules.mjs` at the repository root; this imports it
 * rather than restating it.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..");
const GATE = join(ROOT, "scripts", "check-migration-rules.mjs");

type Gate = {
  checkText: (name: string, sql: string, columns: string[]) => [string, string][];
  listingColumns: (source: string) => string[];
  scan: (options?: { since?: string | null }) => { failures: unknown[]; hit: Set<string> };
  KNOWN: Map<string, string>;
};
let gate: Gate;

beforeAll(async () => {
  gate = (await import(/* @vite-ignore */ pathToFileURL(GATE).href)) as Gate;
});

const NEW = "20260924169999_a_new_file.sql";
const COLUMNS = ["id", "title", "listing_role", "area"];
const rules = (sql: string, name = NEW) => gate.checkText(name, sql, COLUMNS).map(([rule]) => rule);

describe("M1: the load-bearing helpers", () => {
  it("fails a revoke of owns_listing from anon, which was half of the outage", () => {
    expect(rules("revoke execute on function private.owns_listing(uuid) from public, anon;")).toContain("M1");
  });
  it("reads quoted identifiers too", () => {
    expect(rules('revoke execute on function "private"."owns_listing"(uuid) from anon;')).toContain("M1");
  });
  it("fails a revoke of every private function from anon", () => {
    expect(rules("revoke execute on all functions in schema private from anon;")).toContain("M1");
  });
  it("passes a revoke from authenticated only, and a revoke of some other function", () => {
    expect(rules("revoke execute on function private.owns_listing(uuid) from authenticated;")).toEqual([]);
    expect(rules("revoke all on function private.device_words(text) from public, anon, authenticated;")).toEqual([]);
  });
  it("ignores a revoke that only appears in a comment", () => {
    expect(rules("-- revoke execute on function private.has_role(uuid, app_role) from anon;\nselect 1;")).toEqual([]);
  });
});

describe("M2: a catalogue column without its anon grant", () => {
  it("fails listing_role added with no grant, which was the other half", () => {
    expect(rules("alter table public.listings add column if not exists listing_role text;")).toContain("M2");
  });
  it("passes it with the grant in the same file", () => {
    expect(
      rules(
        "alter table public.listings add column listing_role text;\ngrant select (listing_role) on public.listings to anon;",
      ),
    ).toEqual([]);
  });
  it("does not care about a column the catalogue does not select", () => {
    expect(rules("alter table public.listings add column moderation_note text;")).toEqual([]);
  });
});

describe("M3, M4, M5", () => {
  it("fails a public table with no RLS, and passes it with RLS", () => {
    expect(rules("create table public.things (id uuid);")).toContain("M3");
    expect(rules("create table public.things (id uuid);\nalter table public.things enable row level security;")).toEqual([]);
  });
  it("fails a definer function with no pinned search_path", () => {
    expect(
      rules("create or replace function public.f() returns int language sql security definer as $$ select 1 $$;"),
    ).toContain("M4");
    expect(
      rules(
        "create or replace function public.f() returns int language sql security definer set search_path to '' as $$ select 1 $$;",
      ),
    ).toEqual([]);
  });
  it("fails a badly named file", () => {
    expect(rules("select 1;", "fix.sql")).toContain("M5");
  });
});

describe("the live tree", () => {
  it("reads LISTING_SELECT from the repository rather than a copy", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(join(ROOT, "apps/web/src/lib/listings/supabase-repository.ts"), "utf8");
    const columns = gate.listingColumns(source);
    expect(columns.length).toBeGreaterThan(40);
    expect(columns).toContain("listing_role");
  });
  it("passes today, and every tolerated historic finding is actually hit on its own file", () => {
    const result = gate.scan();
    expect(result.failures).toEqual([]);
    expect([...result.hit].sort()).toEqual([...gate.KNOWN.keys()].sort());
    const out = execFileSync("node", [GATE], { cwd: ROOT, encoding: "utf8" });
    expect(out).toMatch(/migrations: clean/);
  });
});
