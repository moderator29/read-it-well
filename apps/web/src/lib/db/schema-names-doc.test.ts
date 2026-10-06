import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `docs/schema/NAMES.md` states what several misleading schema names really
 * hold. The names stay (renaming a live object breaks the deployed app), so
 * the page is the fix, and every claim on it is checked here against the
 * generated types and the migrations. If the schema changes under the page,
 * this fails and names the claim.
 */

const ROOT = join(__dirname, "..", "..", "..", "..", "..");
const DOC = readFileSync(join(ROOT, "docs", "schema", "NAMES.md"), "utf8");
const TYPES = readFileSync(join(ROOT, "apps", "web", "src", "lib", "supabase", "database.types.ts"), "utf8");
const MIGRATIONS = readdirSync(join(ROOT, "supabase", "migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => readFileSync(join(ROOT, "supabase", "migrations", name), "utf8"));

/** Tables with a `*_minor` column that hold a price or a setting, not a movement of money. */
const PRICES_NOT_MOVEMENTS = new Set([
  "bookings", // the price of a stay; what was paid is in transactions
  "listings",
  "catalogue_entries",
  "room_types",
  "rate_plans",
  "rate_calendar",
  "fee_rates",
  "price_check_shares",
  "bot_invocations",
  "bot_settings",
  "briefs", // a renter's budget for what they want, not a payment
  "listing_changes", // old and new asking price on a listing edit
  "mandate_invitations", // the asking range an owner offers an agent
  "door_charge_reports", // what a lister asked for at the door, as reported; no money moves through Vallo
  "tenancy_reviews", // an extra charge a renter mentions in a review
  "move_in_quotes", // a frozen quote of the move-in total; the charge is in rent_payments
  "tenancy_renewal_offers", // the rent offered for a renewal, before any agreement or charge
  "deal_agreement_versions", // past terms of an agreement; the live row is deal_agreements
]);

/**
 * The newest definition of a function in each of `private` and `public`,
 * joined. A public wrapper often delegates to its private twin, so the write
 * may be in either. Only a `create function` counts: a later
 * `alter function ... set search_path` is not a definition.
 */
function latestBody(fn: string): string | null {
  const bodies: string[] = [];
  for (const schema of ["private", "public"]) {
    for (let i = MIGRATIONS.length - 1; i >= 0; i -= 1) {
      const sql = MIGRATIONS[i] ?? "";
      const at = sql.search(new RegExp(`create\\s+(?:or\\s+replace\\s+)?function\\s+${schema}\\.${fn}\\s*\\(`, "i"));
      if (at === -1) continue;
      const open = /as\s+(\$[a-z_]*\$)/i.exec(sql.slice(at));
      if (!open) continue;
      const from = at + open.index + open[0].length;
      const close = sql.indexOf(open[1] ?? "$$", from);
      bodies.push(sql.slice(from, close === -1 ? undefined : close));
      break;
    }
  }
  return bodies.length > 0 ? bodies.join("\n") : null;
}

/** The Row block of one public table in the generated types. */
function row(table: string): string {
  const start = TYPES.indexOf(`\n      ${table}: {\n        Row: {`);
  expect(start, `${table} is in database.types.ts`).toBeGreaterThan(-1);
  return TYPES.slice(start, TYPES.indexOf("\n        }", start));
}

describe("docs/schema/NAMES.md matches the schema", () => {
  it("conversations.agent_id is an auth user id, as the page says", () => {
    const fk = MIGRATIONS.flatMap((sql) => [
      ...sql.matchAll(/conversations_agent_id_fkey foreign key \(agent_id\) references ([\w.]+)/g),
      ...sql.matchAll(/\n\s*agent_id\s+uuid not null references ([\w.]+) \(id\)/g),
    ]).map((m) => m[1]);
    expect(fk.at(-1)).toBe("auth.users");
    expect(DOC).toContain("conversations_agent_id_fkey → auth.users(id)");
  });

  it("agents holds owners as well as agents, and listings say which on each", () => {
    expect(row("agents")).toMatch(/role: Database\["public"\]\["Enums"\]\["supply_role"\]/);
    expect(TYPES).toMatch(/supply_role:\s*"owner" \| "agent"|supply_role:\s*"agent" \| "owner"/);
    expect(row("listings")).toMatch(/listing_role: Database\["public"\]\["Enums"\]\["listing_role"\]/);
  });

  it("listing_status and booking_status are shared by exactly the tables the page names", () => {
    for (const table of ["listings", "businesses", "catalogue_entries", "accommodations", "room_types"]) {
      expect(row(table), table).toContain('status: Database["public"]["Enums"]["listing_status"]');
      expect(DOC, table).toContain(`\`${table}\``);
    }
    expect(row("reservations")).toContain('status: Database["public"]["Enums"]["booking_status"]');
    expect(row("booking_state_events")).toContain('to_status: Database["public"]["Enums"]["booking_status"]');
    const listingStatusTables = [...TYPES.matchAll(/\n      (\w+): \{\n        Row: \{[^}]*?\bstatus: Database\["public"\]\["Enums"\]\["listing_status"\]/g)].map((m) => m[1]);
    expect(listingStatusTables.sort()).toEqual(["accommodations", "businesses", "catalogue_entries", "listings", "room_types"]);
  });

  it("names every table that carries money", () => {
    const tables = TYPES.slice(TYPES.indexOf("    Tables: {"), TYPES.indexOf("    Views: {"));
    const carrying = [...tables.matchAll(/\n      (\w+): \{\n        Row: \{([\s\S]*?)\n        \}/g)]
      .filter((m) => /\n\s+\w+_minor: /.test(m[2] ?? ""))
      .map((m) => m[1] ?? "")
      .filter((table) => !PRICES_NOT_MOVEMENTS.has(table));
    const named = [...DOC.matchAll(/^\| `(\w+)` \|/gm)].map((m) => m[1]);
    for (const table of carrying) expect(named, `money table ${table} is on the page`).toContain(table);
  });

  it("each database function the page names as a writer really writes that table", () => {
    const money = DOC.slice(DOC.indexOf("## The money tables"));
    const rows = [...money.matchAll(/^\| `(\w+)` \|[^|]*\|([^|]*)\|$/gm)];
    expect(rows.length).toBeGreaterThanOrEqual(9);
    let checked = 0;
    for (const [, table, writers] of rows) {
      for (const fn of [...(writers ?? "").matchAll(/`([a-z_]+)`/g)].map((m) => m[1] ?? "")) {
        const body = latestBody(fn);
        expect(body, `${fn} is defined in a migration`).not.toBeNull();
        expect(body, `${fn} writes ${table}`).toMatch(new RegExp(`(insert\\s+into|update|delete\\s+from)\\s+(public\\.)?${table}\\b`, "i"));
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("the rent-to-wallet trigger is disabled, as the page says (Track A)", () => {
    expect(MIGRATIONS.some((sql) => /alter table public\.ledger_entries disable trigger ledger_entries_settle_rent_to_lister/i.test(sql))).toBe(true);
    expect(DOC).toContain("`ledger_entries_settle_rent_to_lister`");
  });

  it("the app writes the rows the page says it writes", () => {
    const app = (p: string) => readFileSync(join(ROOT, "apps", "web", "src", p), "utf8");
    expect(app("lib/payments/split-attempt.ts")).toMatch(/from\("transactions"\)\.insert\(/);
    expect(app("lib/bookings/settlement.ts")).toMatch(/markChargeFailed[\s\S]*from\("transactions"\)[\s\S]{0,80}\.update\(/);
  });
});
