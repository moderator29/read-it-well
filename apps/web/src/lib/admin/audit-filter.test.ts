import { describe, expect, it } from "vitest";

import {
  AUDIT_ENTITY_TYPES,
  actionLabel,
  auditIdExpression,
  auditTextExpression,
  entityTypeIcon,
  entityTypeLabel,
  forbiddenAuditKey,
  pickAuditEntityType,
  planAuditQuery,
  safeAuditMetadata,
} from "./audit-filter";

/**
 * The one search box has to mean the right thing for the three things an
 * operator pastes into it, and a hand-edited chip must never empty the log.
 */
describe("planAuditQuery", () => {
  it("treats a UUID as an exact id on either side of the row", () => {
    const plan = planAuditQuery({ q: " 6F9619FF-8B86-D011-B42D-00C04FC964FF " });
    expect(plan.exactId).toBe("6f9619ff-8b86-d011-b42d-00c04fc964ff");
    expect(plan.textLike).toBeNull();
  });

  it("treats anything else as a substring of the action or the target", () => {
    const plan = planAuditQuery({ q: "wallet." });
    expect(plan.exactId).toBeNull();
    expect(plan.textLike).toBe("wallet.");
    expect(auditTextExpression(plan.textLike ?? "")).toBe(
      'action.ilike."%wallet.%",entity_id.ilike."%wallet.%"',
    );
  });

  it("quotes the term so a comma or a bracket cannot reshape the query", () => {
    expect(auditTextExpression("a,b)or(id.gt.0")).toBe(
      'action.ilike."%a,b)or(id.gt.0%",entity_id.ilike."%a,b)or(id.gt.0%"',
    );
    expect(auditIdExpression("x")).toBe('actor_id.eq."x",entity_id.eq."x"');
  });

  it("drops an unknown target type rather than emptying the log", () => {
    expect(planAuditQuery({ status: "nonsense" }).entityType).toBeNull();
    expect(planAuditQuery({ status: "wallet_entry" }).entityType).toBe("wallet_entry");
    expect(pickAuditEntityType(undefined)).toBeNull();
  });

  it("anchors the day range to Lagos and pages one past the page", () => {
    const plan = planAuditQuery({ from: "2026-09-18", to: "2026-09-18", offset: 40 });
    expect(plan.fromIso).toBe("2026-09-18T00:00:00+01:00");
    expect(plan.toIso).toBe("2026-09-18T23:59:59.999+01:00");
    expect(plan.range).toEqual({ from: 40, to: 80 });
    expect(plan.pageSize).toBe(40);
  });

  it("caps a pasted wall of text", () => {
    expect(planAuditQuery({ q: "x".repeat(500) }).textLike?.length).toBe(120);
  });

  it("has no empty filter surprises", () => {
    const plan = planAuditQuery(undefined);
    expect(plan).toMatchObject({ exactId: null, textLike: null, entityType: null, fromIso: null, toIso: null });
    expect(plan.range).toEqual({ from: 0, to: 40 });
  });
});

describe("labels", () => {
  it("reads machine tokens as words", () => {
    expect(actionLabel("wallet.funding.posted")).toBe("Wallet funding posted");
    expect(actionLabel("business.verification_check")).toBe("Business verification check");
    expect(entityTypeLabel("wallet_entry")).toBe("Money");
    expect(entityTypeLabel("something_new")).toBe("Something new");
  });

  it("keeps the chip list distinct", () => {
    const values = AUDIT_ENTITY_TYPES.map((type) => type.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("gives every target type a tile glyph and a plain mark to a stranger", () => {
    for (const type of AUDIT_ENTITY_TYPES) {
      expect(entityTypeIcon(type.value)).toBe(type.icon);
      expect(type.icon.length).toBeGreaterThan(0);
    }
    expect(entityTypeIcon("something_new")).toBe("info");
  });
});

/**
 * THE CHIP LIST IS A PROMISE ABOUT THE TABLE, so it is held against the
 * writers rather than against itself.
 *
 * The list below is every `entity_type` a writer in this codebase puts into
 * `audit_log`, read out of the tree:
 *
 *   grep -rho 'entityType: *"[a-z_]*"' apps/web/src | sort -u
 *   plus the two module constants, lib/cron/report.ts ("cron_job") and
 *   lib/wallet/audit.ts ("wallet_entry"), and the two literal `entity_type:`
 *   writers, lib/cron/report.ts and the Paystack webhook route.
 *
 * `cron_job` was the one that mattered and the one that was missing: it is
 * the run history that makes a scheduled job which has STOPPED firing
 * visible, and an operator had no chip to ask for it.
 */
const WRITER_VOCABULARY = [
  "agent",
  "agent_application",
  "area",
  "area_moderator_application",
  "booking",
  "business",
  "cron_job",
  "feature_flag",
  "inventory_drift",
  "listing",
  "local_government",
  "message",
  "message_flag",
  "occupation",
  "paystack_webhook",
  "report",
  "reservation",
  "risk_alert",
  "room_type",
  "support_ticket",
  "user_badge",
  "wallet_entry",
] as const;

describe("the chip list against the writers", () => {
  it("offers a chip for every entity type a writer in this codebase uses", () => {
    const chips = new Set<string>(AUDIT_ENTITY_TYPES.map((type) => type.value));
    const missing = WRITER_VOCABULARY.filter((value) => !chips.has(value));
    expect(missing).toEqual([]);
  });

  it("can ask for the scheduled-job run history, which is how a dead job is seen", () => {
    expect(pickAuditEntityType("cron_job")).toBe("cron_job");
    expect(planAuditQuery({ status: "cron_job" }).entityType).toBe("cron_job");
    expect(entityTypeLabel("cron_job")).toBe("Scheduled job");
  });
});

/**
 * Rule 16 at the reader. The viewer is read by every admin, so a credential or
 * an identity document that a writer somewhere put into the free-form bag must
 * not reach the page, and a name must still reach it or the row is unusable.
 */
describe("safeAuditMetadata", () => {
  it("withholds identity documents and credentials by key", () => {
    for (const key of [
      "nin",
      "customerNIN",
      "bvn",
      "account_number",
      "bank_account_number",
      "card_last4",
      "pan",
      "cvv",
      "auth_token",
      "paystack_secret",
      "x-paystack-signature",
      "password",
      "customerEmail",
      "phone",
      "msisdn",
      "passport_number",
      "iban",
      "authorization",
    ]) {
      expect(forbiddenAuditKey(key)).toBe(true);
    }
  });

  it("keeps the scalars a decision line is made of, including names", () => {
    for (const key of [
      "reason",
      "outcome",
      "amount_minor",
      "reference",
      "tier_before",
      "tier_after",
      "agent_name",
      "business_name",
      "displayName",
      "handle",
    ]) {
      expect(forbiddenAuditKey(key)).toBe(false);
    }
  });

  it("replaces a forbidden value rather than dropping the key, so the row reads honestly", () => {
    const safe = safeAuditMetadata({
      outcome: "approved",
      agent_name: "Ada O.",
      nin: "12345678901",
      amount_minor: 150_000_00,
    }) as Record<string, unknown>;
    expect(safe).toEqual({
      outcome: "approved",
      agent_name: "Ada O.",
      nin: "[withheld]",
      amount_minor: 15_000_000,
    });
    expect(JSON.stringify(safe)).not.toContain("12345678901");
  });

  it("walks one level into a nested bag and stops", () => {
    const safe = safeAuditMetadata({
      applicant: { display_name: "Ada O.", bvn: "22222222222" },
      deep: { a: { b: "buried" } },
    }) as { applicant: Record<string, unknown>; deep: Record<string, unknown> };
    expect(safe.applicant).toEqual({ display_name: "Ada O.", bvn: "[withheld]" });
    expect(safe.deep).toEqual({ a: "[withheld]" });
    expect(JSON.stringify(safe)).not.toContain("22222222222");
  });

  it("leaves a null, a scalar and an array of scalars alone", () => {
    expect(safeAuditMetadata(null)).toBeNull();
    expect(safeAuditMetadata(7)).toBe(7);
    expect(safeAuditMetadata("clean")).toBe("clean");
    expect(safeAuditMetadata(["a", "b"])).toEqual(["a", "b"]);
  });
});
