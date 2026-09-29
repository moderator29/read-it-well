import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PaymentMethod } from "@/lib/payments/methods";
import { SavedCardPicker } from "./SavedCardPicker";

/**
 * L-1 (E2E audit, 29 September 2026): at 390 the saved-card row broke into
 * four lines ("Visa ••••" / "4081" / "Expires" / "09/28"), because a Default
 * pill on the right squeezed the name inside the option's text column. The
 * pill now rides on the meta line, and the last four never part from their
 * mask.
 */
const card: PaymentMethod = {
  id: "c1",
  cardType: "visa",
  last4: "4081",
  expMonth: 9,
  expYear: 2099,
  bank: null,
  reusable: true,
  isDefault: true,
  createdAt: "2026-09-01T00:00:00.000Z",
};

describe("the saved-card row", () => {
  const html = renderToStaticMarkup(<SavedCardPicker cards={[card]} value="c1" onChange={() => {}} />);

  it("keeps the mask and the last four on one unbreakable run", () => {
    expect(html).toMatch(/<span class="whitespace-nowrap">•+ 4081<\/span>/);
  });

  it("puts Default on the meta line, beside the expiry, not in a third column", () => {
    const name = html.indexOf('data-testid="saved-card-name"');
    const expiry = html.indexOf("Expires 09/99");
    const pill = html.indexOf("Default");
    expect(name).toBeGreaterThan(-1);
    expect(expiry).toBeGreaterThan(name);
    expect(pill).toBeGreaterThan(expiry);
    /* Both inside one wrapping meta line. */
    expect(html).toMatch(/flex flex-wrap[^"]*"><span>Expires 09\/99<\/span>[\s\S]*Default[\s\S]*<\/span><\/span><\/span><\/label>/);
  });
});
