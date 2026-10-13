import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { StatusChip, chipLook, type ChipState } from "./StatusChip";

/* Never colour alone (north star section 3): each state differs from every
   other by its mark or its colour AND carries a word; failed is the only red. */
const STATES: ChipState[] = ["success", "pending", "failed", "protected", "disputed", "neutral"];

describe("StatusChip", () => {
  it("gives every state a distinct colour-and-shape pair", () => {
    const pairs = STATES.map((s) => `${chipLook(s).tone}/${chipLook(s).shape}`);
    expect(new Set(pairs).size).toBe(STATES.length);
  });

  it("separates states that share a colour by their shape", () => {
    expect(chipLook("pending").tone).toBe(chipLook("disputed").tone);
    expect(chipLook("pending").shape).not.toBe(chipLook("disputed").shape);
  });

  it("is red only for a failure", () => {
    for (const state of STATES) {
      if (state !== "failed") expect(chipLook(state).tone, state).not.toBe("danger");
    }
  });

  it("renders the shared badge with its word and a mark, and does not animate on first render", () => {
    const html = renderToString(<StatusChip state="protected">Protected</StatusChip>);
    expect(html).toContain("nf-badge nf-badge--brand");
    expect(html).toContain("Protected");
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("nf-status-swap");
  });
});
