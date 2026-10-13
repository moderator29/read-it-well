import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BUSINESS_KINDS } from "@/lib/profile/role-line";
import { PASSPORT_LINES } from "./model";

/**
 * THE PASSPORT MIGRATIONS, HELD TO THE APP. pass01 and pass02 were applied to
 * the live database on 13 October 2026 and recorded as
 * `supabase/migrations/<version>_pass0N_*.sql`; this keeps the SQL and the code
 * from drifting apart. What the SQL DOES (hidden lines null, blocks, off,
 * signed out) is held by the probes in `supabase/tests/probes/`.
 */
const REPO = join(__dirname, "../../../../..");
const MIGRATIONS = join(REPO, "supabase/migrations");
/** The recorded file for a migration name: `<14-digit version>_<name>`. */
const sql = (name: string) => {
  const file = readdirSync(MIGRATIONS).find((f) => /^\d{14}_/.test(f) && f.slice(15) === name);
  if (!file) throw new Error(`${name} is not recorded in supabase/migrations`);
  return readFileSync(join(MIGRATIONS, file), "utf8");
};
const SETTINGS = sql("pass01_passport_settings.sql");
const READ = sql("pass02_vallo_passport_read.sql");

/** The SQL a statement-runner would see: comments out. */
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");

describe("the drafts are additive", () => {
  it("contain no DROP and no DELETE statement", () => {
    for (const text of [SETTINGS, READ]) {
      expect(code(text)).not.toMatch(/\bdrop\s+(table|function|policy|column|schema|trigger|view|type|constraint)\b/i);
      expect(code(text)).not.toMatch(/\bdelete\s+from\b/i);
    }
  });

  it("start with the lock timeout and read their own writes back", () => {
    for (const text of [SETTINGS, READ]) {
      expect(code(text)).toMatch(/set lock_timeout = '5s';/);
      expect(code(text)).toMatch(/READ-BACK FAILED/);
    }
  });

  it("each has a probe that raises its own PROBE_OK", () => {
    for (const [file, id] of [
      ["pass01-passport-settings.sql", "pass01-passport-settings"],
      ["pass02-vallo-passport-read.sql", "pass02-vallo-passport-read"],
    ] as const) {
      const path = join(REPO, "supabase/tests/probes", file);
      expect(existsSync(path)).toBe(true);
      const probe = readFileSync(path, "utf8");
      expect(probe).toContain(`raise exception 'PROBE_OK ${id}'`);
      expect(probe).toContain(`PROBE_FAIL ${id}`);
    }
  });
});

describe("the settings table", () => {
  it("is on by default and holds exactly the lines the app has", () => {
    expect(SETTINGS).toContain("enabled      boolean not null default true");
    const listed = /hidden_lines <@ array\[([^\]]+)\]/.exec(SETTINGS)?.[1] ?? "";
    expect([...listed.matchAll(/'([a-z]+)'/g)].map((m) => m[1])).toEqual([...PASSPORT_LINES]);
  });

  it("is protected by row level security with the member's own row only", () => {
    expect(SETTINGS).toContain("enable row level security");
    expect(SETTINGS).toContain("revoke all on public.passport_settings from public, anon, authenticated;");
    expect(SETTINGS).toContain("grant select, insert, update on public.passport_settings to authenticated;");
    expect(SETTINGS).not.toMatch(/grant[^;]*\bdelete\b[^;]*to authenticated/i);
    for (const policy of ["select_own", "insert_own", "update_own"]) expect(SETTINGS).toContain(`passport_settings_${policy}`);
    expect((SETTINGS.match(/user_id = \(select auth\.uid\(\)\)/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it("carries every explicit V-100 choice over, and does not touch the old tables", () => {
    expect(code(SETTINGS)).toMatch(/insert into public\.passport_settings[\s\S]*from public\.renter_passports/);
    expect(code(SETTINGS)).toContain("on conflict (user_id) do nothing");
    expect(code(SETTINGS)).not.toMatch(/(alter|truncate)\s+table\s+public\.(renter_passports|passport_shares)/i);
  });
});

describe("the read model", () => {
  it("returns only the allowed lines: every switchable line is nulled by its own switch", () => {
    for (const line of PASSPORT_LINES) {
      expect(READ, line).toContain(`'${line}' = any(hidden)`);
    }
  });

  it("refuses signed out, off and blocked before it reads anything", () => {
    const fn = READ.slice(READ.indexOf("create or replace function public.passport_read"));
    const guard = fn.slice(0, fn.indexOf("return query"));
    expect(guard).toContain("if me is null or p_subject is null then return; end if;");
    expect(guard).toContain("private.blocked_between(me, p_subject)");
    expect(guard).toContain("if not st.enabled then return; end if;");
  });

  it("is callable by a signed-in member and nobody else, and the assembler by no API role", () => {
    for (const door of ["public.passport_read(uuid)", "public.passport_open(uuid)", "public.my_passport()"]) {
      expect(READ).toContain(`revoke all on function ${door} from public, anon;`);
      expect(READ).toContain(`grant execute on function ${door} to authenticated;`);
    }
    expect(READ).toContain("revoke all on function private.passport_all(uuid) from public, anon, authenticated;");
    for (const fn of READ.split("create or replace function").slice(1)) {
      expect(fn).toMatch(/security definer\s+set search_path = ''/);
    }
  });

  it("reads no phone, email, ID document, birth date or address", () => {
    const body = code(READ);
    expect(body).not.toMatch(/\b(phone|email|date_of_birth|birth|address|nin_number|document_number|confirmed_phones|identity_documents|identity_verifications)\b/i);
  });

  it("counts only from rows: no literal figure stands in for a count", () => {
    const body = code(READ);
    expect(body).not.toMatch(/\b(rentals|stays|review_count)\s*:?=\s*\d/);
    for (const table of ["rent_payments", "bookings", "reviews", "reservation_reviews"]) expect(body).toContain(`public.${table}`);
    /* A hidden review, and one whose weight is withheld, are never counted. */
    expect(body).toContain("rw.hidden_at is null");
    expect(body).toContain("public.weight_withheld");
    expect(body).toContain("rr.hidden_at is null");
  });

  it("maps every business kind the role line knows, in the role line's own order", () => {
    const kinds = /array\['hotel'[^\]]*\]/.exec(READ)?.[0] ?? "";
    expect([...kinds.matchAll(/'([a-z_]+)'/g)].map((m) => m[1])).toEqual([...BUSINESS_KINDS]);
    for (const word of ["landlord", "agent", "hotel", "servicedApartments", "guestHouse", "resort", "shortletHost", "restaurant", "agency", "renter"]) {
      expect(READ).toContain(`'${word}'`);
    }
  });
});
