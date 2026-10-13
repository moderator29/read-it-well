import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it } from "vitest";
import { axe, closeAxe, hasBrowser } from "@/lib/a11y/axe";
import { HELD_UNTIL_YOU_CONFIRM, RAIL_COPY } from "@/lib/money/copy";
import { TransactionCheckout, type TransactionCheckoutProps } from "./TransactionCheckout";

afterAll(closeAxe);

/* Structural test values only: no real name, place or reference. */
const base: TransactionCheckoutProps = {
  rail: "direct",
  space: { title: "Space title", location: "Area, City", href: "/listing/x" },
  agreement: { id: "agreement-id", status: "approved" },
  payeeName: "Payee name",
  amountMinor: 90_000_00,
  currency: "NGN",
  locale: "en",
  conditions: ["Condition one."],
  references: [
    { kind: "agreement", value: "agreement-id", href: "/agreements/agreement-id" },
    { kind: "space", value: "space-id", href: "/listing/x" },
  ],
};

const html = (over: Partial<TransactionCheckoutProps> = {}) => renderToStaticMarkup(<TransactionCheckout {...base} {...over} />);

describe("the checkout that understands the transaction", () => {
  it("states the space, agreement, parties, amount, standing, conditions and release, in that order", () => {
    const out = html();
    const order = ["For", "Agreement", "Paid by", "Paid to", "Amount", "What stands behind it", "Conditions", "When the owner or agent receives it"];
    const at = order.map((label) => out.indexOf(`>${label}<`));
    expect(at.every((i) => i > -1)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it("speaks the live direct rail's words, never 'held'", () => {
    const out = html();
    expect(out).toContain(RAIL_COPY.direct.standing.replace(/'/g, "&#x27;"));
    expect(out).not.toContain("held by");
  });

  it("speaks the protected rail's words when handed that rail", () => {
    expect(html({ rail: "protected" })).toContain(HELD_UNTIL_YOU_CONFIRM.replace(/'/g, "&#x27;"));
  });

  it("names the payee's role, never an invented name, when the name could not be read", () => {
    expect(html({ payeeName: null })).toContain("The owner or agent on the agreement");
  });

  it("carries no fee line and no footnote about fees (D51)", () => {
    expect(html()).not.toMatch(/fee|commission|guarantee/i);
  });

  it("draws no chain hash on a fiat checkout", () => {
    expect(html({ references: [...base.references, { kind: "chain", value: "0xabc" }] })).not.toContain("0xabc");
  });
});

describe.skipIf(!hasBrowser && !process.env.CI)("the transaction checkout (axe)", () => {
  it("has no axe violations", async () => {
    expect(await axe(`<h1>Checkout</h1>${html()}`)).toEqual([]);
  });
});
