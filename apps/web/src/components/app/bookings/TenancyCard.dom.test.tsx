/**
 * The tenancy card, mounted for real in Chromium and checked with axe (W12
 * F28). The card is an `li`, so it needs a list around it: `/bookings` and the
 * dev preview drew it inside a `div`, an `li` with no `ul` (axe: listitem).
 * This mounts the card inside the `ul` those two callers now draw, in the due
 * and the settled state, and holds that the list is a real one.
 *
 * Fixtures are slot names; the card's own words come from the real dictionary.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { axeViolations } from "@/components/ui/ported-test-css";
import { GLASS_CSS, productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss(GLASS_CSS);

const TENANCY = {
  id: "tenancy-slot",
  inspectionId: "inspection-slot",
  listingId: "listing-slot",
  title: "A place name slot",
  area: "An area slot",
  city: "A city slot",
  photo: null,
  moveIn: "2026-01-01",
  moveInLabel: "A move-in day slot",
  rentPeriod: "yearly",
  periodLabel: "Yearly",
  totalDisplay: "A total slot",
  status: "PENDING",
  paid: false,
  payable: true,
  href: "/rent/pay/inspection-slot",
  fileHref: "/tenancy/tenancy-slot",
};

const entry = (rows: unknown[]) => `
  import { TenancyCard } from "@/components/app/bookings/TenancyCard";
  import { mount } from "@/lib/testing/browser-root";
  mount(
    <ul className="flex flex-col gap-md" style={{ width: 360, padding: 16, listStyle: "none", margin: 0 }}>
      {${JSON.stringify(rows)}.map((row) => <TenancyCard key={row.id} tenancy={row} locale="en" />)}
    </ul>,
  );
`;

describe.skipIf(!hasBrowser && !process.env.CI)("the tenancy card", () => {
  it("sits in a real list in both states, and axe finds nothing", async () => {
    const { page, close } = await mountInBrowser({
      entry: entry([TENANCY, { ...TENANCY, id: "tenancy-two", paid: true, payable: false, status: "CONFIRMED" }]),
      css: CSS,
    });
    try {
      const cards = page.getByTestId("tenancy-card");
      expect(await cards.count()).toBe(2);
      expect(await cards.evaluateAll((els) => els.map((el) => [el.tagName, el.parentElement?.tagName]))).toEqual([
        ["LI", "UL"],
        ["LI", "UL"],
      ]);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });
});
