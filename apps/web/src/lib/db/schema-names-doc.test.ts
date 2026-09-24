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

  it("names every money table, and every function it says writes one exists", () => {
    const money = [...TYPES.matchAll(/\n      (\w+): \{\n        Row: \{/g)]
      .map((m) => m[1] ?? "")
      .filter((table) => /ledger|revenue|escrow|^transactions$|wallet_entries/.test(table))
      .filter((table) => !/_(events|disputes|evidence|holds|reviews|rules)$/.test(table));
    for (const table of money) expect(DOC, `money table ${table} is on the page`).toContain(`| \`${table}\``);
    for (const fn of [...DOC.matchAll(/`(settle_booking_charge|pay_booking_from_wallet|settle_rent_charge_to_lister|escrow_settle|escrow_reverse_ruling)`/g)].map((m) => m[1])) {
      expect(MIGRATIONS.some((sql) => new RegExp(`function (public|private)\\.${fn}\\(`).test(sql)), `${fn} is defined in a migration`).toBe(true);
    }
  });
});
