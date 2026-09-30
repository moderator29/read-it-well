import { describe, expect, it } from "vitest";
import { internalNotIn, mergeInternalIds } from "./internal-ids";
import { QA_ACCOUNT_IDS } from "./reads/shapes";

describe("the internal accounts list (C10)", () => {
  it("keeps the QA accounts and adds staff and marked people, once each", () => {
    const staff = "29f84a34-7a09-431b-aabb-af3048e0fb2b";
    const ids = mergeInternalIds(QA_ACCOUNT_IDS, [staff, staff, QA_ACCOUNT_IDS[0], null, "not-an-id"]);
    expect(ids).toHaveLength(3);
    expect(ids).toContain(staff);
    for (const qa of QA_ACCOUNT_IDS) expect(ids).toContain(qa);
  });

  it("is a PostgREST list that is never empty", () => {
    expect(internalNotIn([])).toBe("(00000000-0000-0000-0000-000000000000)");
    expect(internalNotIn(["03f3dd52-ea28-4852-9abe-e5b0a67c2a43"])).toBe("(03f3dd52-ea28-4852-9abe-e5b0a67c2a43)");
  });
});
