import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDictionary } from "@vallo/i18n";
import { describe, expect, it } from "vitest";
import {
  considerStrHref,
  lagosTime,
  strCaseFrom,
  strCasesFrom,
  strNextStep,
  strPrefill,
  strRegisterFrom,
  strResultText,
} from "./str";

const copy = getDictionary("en").complianceStr;
const ID = "11111111-1111-4111-8111-111111111111";

const row = {
  id: ID,
  source_kind: "transaction",
  source_id: "22222222-2222-4222-8222-222222222222",
  subject_id: null,
  grounds: "Three payments in a week from different cards.",
  opened_by: "a",
  opened_at: "2026-09-24T10:00:00Z",
  due_at: "2026-09-25T10:00:00Z",
  state: "awaiting_approval",
  overdue: false,
  decision_id: "d",
  decision: "file",
  reasons: "Structuring below the threshold.",
  decided_by: "a",
  decided_at: "2026-09-24T11:00:00Z",
  approved: null,
  approver_id: null,
  links: [{ kind: "transaction", ref: "x" }, { junk: true }],
};

describe("SCUML item 6: reading the STR desk", () => {
  it("reads a case, its decision and its links", () => {
    const c = strCaseFrom(row);
    expect(c?.sourceKind).toBe("transaction");
    expect(c?.decision).toEqual({
      id: "d",
      decision: "file",
      reasons: "Structuring below the threshold.",
      decidedBy: "a",
      decidedAt: "2026-09-24T11:00:00Z",
      approved: null,
      approverId: null,
    });
    expect(c?.links).toEqual([{ kind: "transaction", ref: "x" }]);
    expect(c && strNextStep(c)).toBe("approve");
  });

  it("drops a row it cannot read, and a failed read is null, never an empty desk", () => {
    expect(strCaseFrom({ ...row, source_kind: "gossip" })).toBeNull();
    expect(strCaseFrom({ ...row, state: "done" })).toBeNull();
    expect(strCasesFrom(null)).toBeNull();
    expect(strCasesFrom([row, 7])).toHaveLength(1);
    expect(strRegisterFrom("nope")).toBeNull();
    expect(
      strRegisterFrom([{ case_id: ID, goaml_reference: "G-1", filed_at: "2026-09-24T12:00:00Z", recorded_by: "b", decided_by: "a", approver_id: "b" }]),
    ).toEqual([{ caseId: ID, goamlReference: "G-1", filedAt: "2026-09-24T12:00:00Z", recordedBy: "b", decidedBy: "a", approverId: "b" }]);
  });

  it("offers one next step per state", () => {
    expect(strNextStep({ state: "open" })).toBe("decide");
    expect(strNextStep({ state: "to_file" })).toBe("record");
    expect(strNextStep({ state: "filed" })).toBe("none");
    expect(strNextStep({ state: "not_filed" })).toBe("none");
  });

  it("says every database answer in the desk's words", () => {
    expect(strResultText("same_person", copy)).toEqual({ ok: false, text: copy.results.same_person });
    expect(strResultText({ status: "decided" }, copy)).toEqual({ ok: true, text: copy.results.decided });
    expect(strResultText({ status: "held", until: "2026-09-26T10:00:00Z" }, copy).text).toContain("Sat 26 Sept");
    expect(strResultText("something new", copy)).toEqual({ ok: false, text: copy.results.failed });
    expect(lagosTime("not a date")).toBe("");
  });

  it("links in from the console, and a prefill takes nothing that is not an id", () => {
    expect(considerStrHref("risk_alert", ID)).toBe(`/admin/compliance?tab=str&from=risk_alert&id=${ID}`);
    expect(strPrefill({ from: "report", id: ID })).toEqual({ from: "report", id: ID, subject: "" });
    expect(strPrefill({ from: "nonsense", id: "<script>" })).toEqual({ from: "person", id: "", subject: "" });
  });
});

describe("SCUML item 6: what the database holds to", () => {
  const sql = readFileSync(
    join(__dirname, "../../../../../supabase/migrations/20260924173000_scuml_item_6_suspicious_transaction_reports.sql"),
    "utf8",
  );

  it("names its checklist items", () => {
    expect(sql).toContain("SCUML item 6");
    expect(sql).toContain("SCUML item 19");
  });

  it("needs a second person to approve, in the function and by trigger", () => {
    expect(sql).toContain("if d.decided_by = actor then return 'same_person'; end if;");
    expect(sql).toContain("create trigger str_approvals_second_person");
  });

  it("is append-only, and outlives an account's deletion", () => {
    expect(sql).toContain("before update or delete on private.%I");
    expect(sql).not.toMatch(/references auth\.users/);
  });

  it("tells staff, never the subject, and stops money only by a staff-placed hold", () => {
    expect(sql).toContain("where ur.role in ('admin'::public.app_role, 'super_admin'::public.app_role)");
    expect(sql).not.toMatch(/private\.notify\(\s*v_subject/);
    expect(sql.match(/insert into public\.account_money_holds/g)?.length).toBe(1);
    expect(sql).toContain("create or replace function public.str_place_hold");
  });

  it("keeps the wallet from giving a reason for a staff hold", () => {
    const copyText = getDictionary("en").platform.hold;
    expect(copyText.bodyPlain).not.toMatch(/because|review|report|suspici/i);
    expect(copyText.refusalPlain).not.toMatch(/because|review|report|suspici/i);
  });
});
