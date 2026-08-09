import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LISTING_SELECTS } from "../listings/supabase-repository";

/**
 * The column rule on `public.listings`, held against the reads it exists for.
 *
 * SEC-6. `listings_select_published` is a ROW rule and RLS has no column half,
 * so table-wide SELECT to `anon` meant a signed-out caller with the publishable
 * key got every column of every published listing: the moderator's private
 * note, the staff account that reviewed it, the exact street address, and what
 * this platform charged the lister. Migration
 * `20260809100105_a_published_listing_is_public_its_moderation_file_is_not`
 * drops the table grant and puts back every column except those eight.
 *
 * ## What this test is actually for
 *
 * The failure it prevents is not the disclosure, which is fixed in the
 * database. It is the OTHER direction, which is the one that reaches a person:
 * somebody adds `address` to `LISTING_SELECT` next month to draw a map pin
 * label, and the browse surface starts answering `permission denied for column`
 * to every signed-out visitor. That is a white screen on the most public page
 * of the product, caused by a grant nobody remembers, in a file nobody would
 * think to open.
 *
 * So this is the pairing check: nothing a signed-out browse read asks for may
 * be on the denied list. If a denied column genuinely becomes public, the fix
 * is a migration granting it and an edit here, and both are then a deliberate
 * decision rather than an accident found in production.
 *
 * The list is read out of the migration rather than duplicated, so the file
 * that grants and the file that checks cannot drift apart.
 */

const MIGRATION = fileURLToPath(
  new URL(
    "../../../../../supabase/migrations/20260809100105_a_published_listing_is_public_its_moderation_file_is_not.sql",
    import.meta.url,
  ),
);

/** The `denied text[] := array[ ... ]` block, as column names. */
function deniedColumns(sql: string): string[] {
  const block = /denied\s+text\[\]\s*:=\s*array\[([^\]]*)\]/i.exec(sql);
  const body = block?.[1];
  if (!body) return [];
  return [...body.matchAll(/'([a-z_]+)'/g)].flatMap((match) => (match[1] ? [match[1]] : []));
}

/** Column and join names from a PostgREST select string. */
function entries(select: string): string[] {
  return select
    .split("\n")
    .map((line) => line.trim().replace(/,$/, ""))
    .map((line) => (line.includes("(") ? line.slice(0, line.indexOf("(")).trim() : line))
    .filter((line) => line.length > 0);
}

describe("what an anonymous caller may read from listings", () => {
  const sql = readFileSync(MIGRATION, "utf8");
  const denied = deniedColumns(sql);

  it("still denies the eight columns the disclosure was about", () => {
    // Named rather than counted, because the value of the migration is which
    // columns it closes and a count would pass on the wrong eight.
    expect(denied.sort()).toEqual(
      [
        "address",
        "landmark",
        "listing_fee_charged_at",
        "listing_fee_minor",
        "listing_fee_rate_id",
        "review_notes",
        "reviewer_id",
        "verified_by",
      ].sort(),
    );
  });

  it("drops the table grant before granting columns, which is the only order that works", () => {
    /*
     * A column level revoke against a role holding table wide SELECT is a
     * no-op with a warning: there is no per-column entry to remove. A migration
     * written the other way round applies cleanly, reads correctly, and changes
     * nothing at all, which is the worst possible outcome for a control.
     */
    const revoke = sql.indexOf("revoke select on table public.listings from anon");
    const grant = sql.indexOf("grant select (%s) on table public.listings to anon");
    expect(revoke).toBeGreaterThan(-1);
    expect(grant).toBeGreaterThan(revoke);
  });

  it("never denies a column the signed-out browse read asks for", () => {
    /*
     * THE CHECK THAT EARNS THIS FILE. Both catalogue selects run under the
     * anon key for a signed-out visitor, so a denied column appearing in either
     * is not a lint failure, it is the search page and every listing page
     * returning an error to everybody who is not signed in.
     */
    const asked = new Set([...entries(LISTING_SELECTS.card), ...entries(LISTING_SELECTS.detail)]);
    const collisions = denied.filter((column) => asked.has(column));
    expect(collisions).toEqual([]);
  });

  it("keeps the columns those selects do ask for out of the denied list", () => {
    // The same property from the other side, so a rename of a select entry
    // cannot silently make the check above vacuous.
    expect(entries(LISTING_SELECTS.card).length).toBeGreaterThan(40);
    for (const column of entries(LISTING_SELECTS.card)) {
      expect(denied).not.toContain(column);
    }
  });
});
