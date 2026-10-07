import { describe, expect, it } from "vitest";
import { planOdometer } from "./odometer";

/* Only the digits that changed move (north star motion 5). */
describe("the odometer plan", () => {
  it("rolls one wheel when one digit changes", () => {
    const plan = planOdometer("₦1,250,000", "₦1,260,000");
    const rolling = plan.cells.filter((c) => c.order !== undefined);
    expect(rolling).toEqual([{ char: "6", from: "5", order: 0 }]);
    expect(plan.direction).toBe("up");
  });

  it("rolls nothing when nothing changed", () => {
    expect(planOdometer("₦4,500", "₦4,500").cells.every((c) => c.order === undefined)).toBe(true);
  });

  it("orders the stagger left to right among the rolling digits only", () => {
    const plan = planOdometer("1,099", "1,100");
    expect(plan.cells.filter((c) => c.order !== undefined).map((c) => [c.char, c.order])).toEqual([
      ["1", 0],
      ["0", 1],
      ["0", 2],
    ]);
  });

  it("lines figures up by place value, so a new digit arrives on the left from blank", () => {
    const plan = planOdometer("₦950", "₦1,000");
    expect(plan.cells.map((c) => c.char).join("")).toBe("₦1,000");
    const first = plan.cells.find((c) => c.order === 0);
    expect(first?.char).toBe("1");
    expect(plan.direction).toBe("up");
  });

  it("never rolls a separator or a symbol", () => {
    const plan = planOdometer("₦12,500", "₦9,800");
    for (const cell of plan.cells) if (!/\d/.test(cell.char)) expect(cell.order).toBeUndefined();
    expect(plan.direction).toBe("down");
  });
});
