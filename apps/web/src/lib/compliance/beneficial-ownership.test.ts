import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isMandateRefusal,
  isMandateRetentionRefusal,
  looksLikeNin,
  readActingFor,
  readActingForParams,
  readMandateForm,
  readMyMandate,
  readOwnershipDesk,
  ACTING_FOR_KINDS,
  ID_DOCUMENT_KINDS,
  RELATIONSHIPS,
  VERIFIED_HOW,
} from "./beneficial-ownership";

const TODAY = "2026-09-24";

const form = {
  kind: "letting",
  principalName: " Ada Owner ",
  principalPhone: "0803 123 4567",
  relationship: "owner",
  exclusive: "yes" as const,
  signedOn: "2026-09-01",
  expiresOn: "2027-09-01",
};


/*
 * The LIVE migration for SCUML item 17 (20260924171000 to 171200 were never
 * applied; see supabase/migrations/superseded/README.md). readFileSync throws
 * when the file is missing, so a renamed or moved file fails the suite.
 */
const LIVE_17 = join(__dirname, "../../../../../supabase/migrations/20260929001007_scuml_17_beneficial_ownership_on_live_tables.sql");
const live17 = () => readFileSync(LIVE_17, "utf8");
/** One function's text, from its create to its closing dollar quote. */
function functionText(sql: string, name: string): string {
  const start = sql.indexOf(`create or replace function ${name}(`);
  if (start < 0) throw new Error(`${name} is not in the migration`);
  const end = sql.indexOf("\n$function$;", start);
  if (end < 0) throw new Error(`${name} has no end`);
  return sql.slice(start, end);
}

describe("SCUML item 17: the mandate form", () => {
  it("reads a good form into the shape the database takes", () => {
    const read = readMandateForm(form, TODAY);
    expect(read).toEqual({
      ok: true,
      value: {
        kind: "letting",
        principalName: "Ada Owner",
        principalPhone: "+2348031234567",
        relationship: "owner",
        exclusive: true,
        signedOn: "2026-09-01",
        expiresOn: "2027-09-01",
      },
    });
  });

  it("lets the number and the dates be empty, and 'not sure' is null, not no", () => {
    const read = readMandateForm({ ...form, principalPhone: "", signedOn: "", expiresOn: "", exclusive: "unknown" }, TODAY);
    expect(read.ok && read.value.principalPhone).toBe(null);
    expect(read.ok && read.value.exclusive).toBe(null);
  });

  it("names the field that is wrong", () => {
    expect(readMandateForm({ ...form, kind: "rent" }, TODAY)).toEqual({ ok: false, field: "kind" });
    expect(readMandateForm({ ...form, principalName: "A" }, TODAY)).toEqual({ ok: false, field: "principalName" });
    expect(readMandateForm({ ...form, principalPhone: "12345" }, TODAY)).toEqual({ ok: false, field: "principalPhone" });
    expect(readMandateForm({ ...form, relationship: "cousin" }, TODAY)).toEqual({ ok: false, field: "relationship" });
    expect(readMandateForm({ ...form, expiresOn: "2026-08-01" }, TODAY)).toEqual({ ok: false, field: "dates" });
    expect(readMandateForm({ ...form, signedOn: "2025-01-01", expiresOn: "2026-09-23" }, TODAY)).toEqual({ ok: false, field: "endsInThePast" });
    expect(readMandateForm({ ...form, signedOn: "2025-01-01", expiresOn: TODAY }, TODAY).ok).toBe(true);
  });
});

describe("SCUML item 17: never a raw NIN", () => {
  it("refuses eleven digits however they are written", () => {
    for (const ref of ["12345678901", "123 4567 8901", "123-4567-8901", "123.4567.8901"]) {
      expect(looksLikeNin(ref)).toBe(true);
    }
  });
  it("lets a passport, licence or CAC number through", () => {
    for (const ref of ["A12345678", "ABC12345AA11", "RC 1234567", "1234567890"]) {
      expect(looksLikeNin(ref)).toBe(false);
    }
  });

  it("refuses any run of eleven or more digits, even inside letters (the review's rule)", () => {
    expect(looksLikeNin("AB-1234-5678-9012")).toBe(true);
    expect(looksLikeNin("X123456789012Y")).toBe(true);
  });

  it("refuses digits from another script, which a regex on 0-9 would miss", () => {
    expect(looksLikeNin("A１２３４５６７８")).toBe(true);
    expect(looksLikeNin("١٢٣٤٥٦٧٨٩٠١")).toBe(true);
  });
  it("offers no NIN document kind at all", () => {
    expect(ID_DOCUMENT_KINDS.some((k) => /nin/i.test(k))).toBe(false);
  });
});

describe("SCUML item 17: the gate's refusal", () => {
  it("is recognised by its code and its item number", () => {
    expect(isMandateRefusal({ code: "23514", message: "SCUML item 17: an agent or firm listing needs..." })).toBe(true);
    expect(isMandateRefusal({ code: "23514", message: "a closed listing stays closed" })).toBe(false);
    expect(isMandateRefusal({ code: "42501", message: "SCUML item 17" })).toBe(false);
    expect(isMandateRefusal(null)).toBe(false);
    expect(isMandateRetentionRefusal({ code: "42501", message: "SCUML item 17: this listing holds a mandate record" })).toBe(true);
    expect(isMandateRetentionRefusal({ code: "23514", message: "SCUML item 17" })).toBe(false);
  });
});

describe("SCUML item 17: acting for", () => {
  const ok = {
    state: "ok",
    acting: "principal",
    listing: { id: "l1", reference: "VL-ABC", title: "Flat", role: "agent", status: "PUBLISHED", closed_at: null },
    lister: { agent_id: "a1", user_id: "u1", name: "Tunde Homes" },
    mandates: [
      {
        id: "m1",
        kind: "letting",
        review_status: "approved",
        principal_name: "Ada Owner",
        principal_phone_last4: "4567",
        relationship: "owner",
        verified_how: "call_back",
        verified_at: "2026-09-24T10:00:00Z",
        verified_by_name: "Kemi",
        id_document_kind: "international_passport",
        id_document_ref: "A12345678",
        has_document: true,
      },
    ],
  };

  it("reads the answer, the principal and the check", () => {
    const read = readActingFor(ok);
    expect(read.state).toBe("ok");
    if (read.state !== "ok") return;
    expect(read.acting).toBe("principal");
    expect(read.lister.name).toBe("Tunde Homes");
    expect(read.mandates[0]).toMatchObject({
      principalName: "Ada Owner",
      principalPhoneLast4: "4567",
      verifiedHow: "call_back",
      idDocumentKind: "international_passport",
    });
  });

  it("never turns a broken answer into 'no mandate'", () => {
    expect(readActingFor(null)).toEqual({ state: "failed" });
    expect(readActingFor({ ...ok, acting: "who knows" })).toEqual({ state: "failed" });
    expect(readActingFor({ ...ok, mandates: [{ id: "m1" }] })).toEqual({ state: "failed" });
    expect(readActingFor({ state: "no_listing" })).toEqual({ state: "no_listing" });
    expect(readActingFor({ state: "not_found" })).toEqual({ state: "not_found" });
  });

  it("reads the lookup params with a default kind", () => {
    expect(readActingForParams({}, "transaction")).toEqual({ kind: "transaction", id: "" });
    expect(readActingForParams({ actingKind: "booking", actingId: " x " }, "transaction")).toEqual({ kind: "booking", id: "x" });
    expect(readActingForParams({ actingKind: "wallet" }, "listing").kind).toBe("listing");
  });
});

describe("SCUML item 17: the lister's own view and the lane", () => {
  it("reads the lister's mandate and leaves out who checked it", () => {
    const read = readMyMandate({
      state: "ok",
      role: "agent",
      is_demo: false,
      status: "PUBLISHED",
      needs_mandate_since: null,
      mandate: { id: "m1", kind: "letting", principal_name: "Ada", review_status: "pending" },
    });
    expect(read.state === "ok" && read.mandate?.status).toBe("pending");
    expect(read.state === "ok" && read.current).toBe(null);
    expect(read.state === "ok" && read.renewalOpen).toBe(false);
    expect(readMyMandate({ state: "not_yours" })).toEqual({ state: "not_yours" });
    expect(readMyMandate("nope")).toEqual({ state: "failed" });
  });

  it("reads the desk, and a count that is missing fails the whole read", () => {
    const counts = { live_intermediary: 3, live_with_mandate: 1, live_without_mandate: 2, awaiting_decision: 1, taken_down: 0, mandates_waiting: 1 };
    const desk = readOwnershipDesk({ counts, needs: [{ id: "l1", title: "Flat", status: "PUBLISHED" }], grace_ends: "2026-10-23T23:00:00Z" });
    expect(desk?.counts.liveWithoutMandate).toBe(2);
    expect(desk?.needs[0]?.lastMandate).toBe(null);
    expect(readOwnershipDesk({ counts: { ...counts, taken_down: undefined }, needs: [] })).toBe(null);
    expect(readOwnershipDesk({ counts })).toBe(null);
  });
});

describe("SCUML item 17: renewal", () => {
  it("reads the current mandate beside a waiting renewal", () => {
    const read = readMyMandate({
      state: "ok",
      role: "agent",
      renewal_open: true,
      mandate: { id: "m2", kind: "letting", principal_name: "Ada", review_status: "pending" },
      current: { id: "m1", kind: "letting", principal_name: "Ada", review_status: "approved", expires_on: "2026-10-01" },
    });
    expect(read.state).toBe("ok");
    if (read.state !== "ok") return;
    expect(read.renewalOpen).toBe(true);
    expect(read.mandate?.status).toBe("pending");
    expect(read.current).toMatchObject({ id: "m1", status: "approved", expiresOn: "2026-10-01" });
  });

  it("fails the read on a malformed current mandate rather than hiding it", () => {
    expect(readMyMandate({ state: "ok", current: { id: "m1" } })).toEqual({ state: "failed" });
  });

  it("carries when a mandate was replaced into the lookup", () => {
    const read = readActingFor({
      state: "ok",
      acting: "principal",
      listing: { id: "l1", title: "Flat", status: "PUBLISHED" },
      lister: {},
      mandates: [
        { id: "m2", review_status: "approved", principal_name: "Ada" },
        { id: "m1", review_status: "approved", principal_name: "Ada", superseded_at: "2026-09-24T10:00:00Z" },
      ],
    });
    expect(read.state === "ok" && read.mandates.map((m) => m.supersededAt)).toEqual([null, "2026-09-24T10:00:00Z"]);
  });

  const sql = live17();

  it("splits the one-live index, supersedes on approval, and reminds at 30 and 7 days", () => {
    expect(sql.startsWith("-- SCUML item 17")).toBe(true);
    expect(sql).toContain("drop index if exists public.listing_mandates_one_live");
    expect(sql).toContain("listing_mandates_one_waiting");
    expect(sql).toContain("listing_mandates_one_current");
    expect(sql).toContain("set superseded_at = now(), superseded_by = m.id");
    expect(sql).toContain("check (days_before in (30, 7))");
  });
});

describe("SCUML item 17: the review, as live (20260929001007)", () => {
  const sql = live17();

  it("uses the same NIN rule as looksLikeNin, and drops the national ID card", () => {
    expect(sql).toContain("regexp_replace(principal_id_document_ref, '[^[:alnum:]]', '', 'g') !~ '[0-9]{11}'");
    expect(sql).toContain("principal_id_document_ref ~ '^[ -~]+$'");
    expect(sql).not.toMatch(/in\s*\([^)]*'national_id_card'/);
  });

  it("freezes a decided mandate, restores only on the mandate note, and gates is_demo and role", () => {
    expect(sql).toContain("listing_mandates_frozen_once_decided");
    expect(sql).toContain("l.review_notes is not distinct from private.mandate_needed_note()");
    expect(sql).toContain("before insert or update of status, is_demo, listing_role on public.listings");
  });

  it("reads acting_for as of the record, on the live money records only, with not_found", () => {
    const actingFor = functionText(sql, "public.acting_for");
    expect(actingFor).not.toContain("'escrow'");
    for (const kind of ACTING_FOR_KINDS) expect(actingFor).toContain(`'${kind}'`);
    expect(actingFor).toContain("'not_found'");
    expect(sql).toContain("'in_force'");
  });

  it("stops a number on any withdrawal, locks the number, and carries consent only to the same name", () => {
    expect(sql).toContain("o.principal_consent_withdrawn_at > m.principal_consented_at");
    expect(sql).toContain("pg_advisory_xact_lock(hashtext('principal_number:' || p_phone))");
    expect(sql).toContain("private.principal_name_key(r.principal_name) = private.principal_name_key(new.principal_name)");
    expect(sql).toContain("listing_mandates_no_consent_on_history");
  });

  it("reads a refused renewal's reason back to the lister", () => {
    const read = readMyMandate({
      state: "ok",
      last_refusal: { reason: "The owner says they never instructed you.", reviewed_at: "2026-09-24T10:00:00Z" },
    });
    expect(read.state === "ok" && read.lastRefusal?.reason).toBe("The owner says they never instructed you.");
  });

  it("never promises a phone call or a listing that goes back by itself", () => {
    expect(sql.replace(/--.*$/gm, "")).not.toMatch(/ring them|by itself/);
  });
});

describe("SCUML item 17: the closed sets match the migration", () => {
  const sql = live17();

  it("names SCUML item 17 in its header", () => {
    expect(sql.startsWith("-- SCUML item 17")).toBe(true);
  });

  it("carries every relationship, check and document kind the forms offer", () => {
    for (const value of [...RELATIONSHIPS, ...VERIFIED_HOW, ...ID_DOCUMENT_KINDS]) {
      expect(sql).toContain(`'${value}'`);
    }
  });

  it("refuses an eleven-digit reference, keeps mandates five years, and gates the publish", () => {
    expect(sql).toContain("listing_mandates_id_ref_is_never_a_nin");
    expect(sql).toContain("interval '5 years'");
    expect(sql).toContain("before delete on public.listing_mandates");
    expect(sql).toContain("before delete on public.listings");
    expect(sql).toMatch(/raise exception 'SCUML item 17: an agent or firm listing needs an approved mandate/);
  });
});
