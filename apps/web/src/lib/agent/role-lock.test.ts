import { describe, expect, it } from "vitest";
import { LOCALES, getDictionary } from "@vallo/i18n";
import { heldOtherSide, otherSideMessage, sideOf } from "./role-lock";

/* One account, one supply side (founder ruling, 13 October 2026). */

describe("one account, one side", () => {
  it("counts the professional and firm forms as the agent side", () => {
    expect(sideOf("owner")).toBe("owner");
    for (const role of ["agent", "firm", null, undefined]) expect(sideOf(role)).toBe("agent");
  });

  it("refuses an agent application on an owner's account, approved or pending", () => {
    expect(heldOtherSide("agent", "owner", [])).toBe("owner");
    expect(heldOtherSide("agent", null, [{ status: "SUBMITTED", supply_role: "owner" }])).toBe("owner");
    expect(heldOtherSide("agent", null, [{ status: "APPROVED", supply_role: "owner" }])).toBe("owner");
  });

  it("refuses an owner application on an agent's account, including the professional form", () => {
    expect(heldOtherSide("owner", "agent", [])).toBe("agent");
    expect(heldOtherSide("owner", null, [{ status: "UNDER_REVIEW", supply_role: null }])).toBe("agent");
  });

  it("lets a refused, suspended or draft application go, and never blocks the same side", () => {
    for (const status of ["REJECTED", "SUSPENDED", "DRAFT"]) {
      expect(heldOtherSide("agent", null, [{ status, supply_role: "owner" }])).toBeNull();
    }
    expect(heldOtherSide("owner", "owner", [{ status: "APPROVED", supply_role: "owner" }])).toBeNull();
  });

  it("says how to proceed, and every locale carries its own words for the notice", () => {
    expect(otherSideMessage("owner")).toMatch(/different email address/);
    const en = getDictionary("en").supply.register;
    for (const locale of LOCALES.filter((l) => l !== "en")) {
      const r = getDictionary(locale).supply.register;
      expect(r.ownerNotAgent, locale).not.toBe(en.ownerNotAgent);
      expect(r.agentNotOwner, locale).not.toBe(en.agentNotOwner);
      expect(r.owner.proof.seenMark, locale).not.toBe(en.owner.proof.seenMark);
      expect(getDictionary(locale).supply.register.agent.fees.agencyMeaning, locale).not.toBe(
        getDictionary("en").supply.register.agent.fees.agencyMeaning,
      );
    }
  });
});
