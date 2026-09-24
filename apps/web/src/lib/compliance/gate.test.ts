import { describe, expect, it } from "vitest";
import { eddGateMessage, isEddGateRefusal } from "./gate";

/** SCUML item 15: the gate refusal is recognised and worded for each audience. */
describe("the EDD gate refusal", () => {
  it("recognises RM175 only", () => {
    expect(isEddGateRefusal({ code: "RM175" })).toBe(true);
    expect(isEddGateRefusal({ code: "23505" })).toBe(false);
    expect(isEddGateRefusal(null)).toBe(false);
  });

  it("tells the admin where to act and tells the member nothing about risk", () => {
    expect(eddGateMessage("admin")).toMatch(/compliance desk/);
    const member = eddGateMessage("member");
    expect(member).not.toMatch(/risk|PEP|compliance|money laundering|EDD/i);
  });
});
