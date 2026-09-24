import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  isMandateRefusal,
  looksLikeNin,
  readActingFor,
  readActingForParams,
  readMandateForm,
  readMyMandate,
  readOwnershipDesk,
  ID_DOCUMENT_KINDS,
  RELATIONSHIPS,
  VERIFIED_HOW,
} from "./beneficial-ownership";

const form = {
  kind: "letting",
  principalName: " Ada Owner ",
  principalPhone: "0803 123 4567",
  relationship: "owner",
  exclusive: "yes" as const,
  signedOn: "2026-09-01",
  expiresOn: "2027-09-01",
};

describe("SCUML item 17: the mandate form", () => {
  it("reads a good form into the shape the database takes", () => {
    const read = readMandateForm(form);
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
    const read = readMandateForm({ ...form, principalPhone: "", signedOn: "", expiresOn: "", exclusive: "unknown" });
    expect(read.ok && read.value.principalPhone).toBe(null);
    expect(read.ok && read.value.exclusive).toBe(null);
  });

  it("names the field that is wrong", () => {
    expect(readMandateForm({ ...form, kind: "rent" })).toEqual({ ok: false, field: "kind" });
    expect(readMandateForm({ ...form, principalName: "A" })).toEqual({ ok: false, field: "principalName" });
    expect(readMandateForm({ ...form, principalPhone: "12345" })).toEqual({ ok: false, field: "principalPhone" });
    expect(readMandateForm({ ...form, relationship: "cousin" })).toEqual({ ok: false, field: "relationship" });
    expect(readMandateForm({ ...form, expiresOn: "2026-08-01" })).toEqual({ ok: false, field: "dates" });
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
    expect(readMyMandate({ state: "not_yours" })).toEqual({ state: "not_yours" });
    expect(readMyMandate("nope")).toEqual({ state: "failed" });
  });

  it("reads the desk, and a count that is missing fails the whole read", () => {
    const counts = { live_intermediary: 3, live_with_mandate: 1, live_without_mandate: 2, taken_down: 0, mandates_waiting: 1 };
    const desk = readOwnershipDesk({ counts, needs: [{ id: "l1", title: "Flat", status: "PUBLISHED" }], grace_ends: "2026-10-23T23:00:00Z" });
    expect(desk?.counts.liveWithoutMandate).toBe(2);
    expect(desk?.needs[0]?.lastMandate).toBe(null);
    expect(readOwnershipDesk({ counts: { ...counts, taken_down: undefined }, needs: [] })).toBe(null);
    expect(readOwnershipDesk({ counts })).toBe(null);
  });
});

describe("SCUML item 17: the closed sets match the migration", () => {
  const dir = join(__dirname, "../../../../../supabase/migrations");
  const file = readdirSync(dir).find((f) => f.startsWith("20260924171000_scuml_item_17"));
  const sql = file ? readFileSync(join(dir, file), "utf8") : "";

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
