import { describe, expect, it } from "vitest";

import {
  AUDIT_ENTITY_TYPES,
  actionLabel,
  auditIdExpression,
  auditTextExpression,
  entityTypeIcon,
  entityTypeLabel,
  pickAuditEntityType,
  planAuditQuery,
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
