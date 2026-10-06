/**
 * The console's detail sections, mounted for real in Chromium and checked with
 * axe (W12 F28). A section used to be one `dl` around everything, so a checklist
 * `ul` (the businesses desk, the listing review's ninth section, the agent
 * documents) sat inside a `dl`. Each row is now its own `dl` of one `dt` and one
 * `dd`, and the section is a plain `div`, so a list can sit between rows.
 *
 * Fixtures are slot names; the labels come from the real dictionary.
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
import { productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const entry = `
  import { getDictionary } from "@vallo/i18n";
  import { adminUi } from "@/app/admin/_components/ui";
  import { mount } from "@/lib/testing/browser-root";
  const ui = adminUi(getDictionary("en"), "en");
  mount(
    <div style={{ width: 480, padding: 16 }}>
      <ui.DetailSection title="A rows section">
        <ui.DetailRow label="A label slot" value="A value slot" />
        <ui.DetailRow label="An empty slot" value={null} />
      </ui.DetailSection>
      <ui.DetailSection title="A checklist section">
        <ul>
          <ui.CheckRow label="A check slot" pass detail="A detail slot" />
          <ui.CheckRow label="Another check slot" pass={false} detail="Another detail slot" />
        </ul>
      </ui.DetailSection>
      <ui.DetailSection title="Rows then a list">
        <ui.DetailRow label="A label slot" value="A value slot" />
        <ul><li>A list item slot</li></ul>
      </ui.DetailSection>
    </div>,
  );
`;

/* The listing review's cost block, in both of its states: with the parts
   the listing stated, and with only a headline price. */
const moneyEntry = `
  import { getDictionary } from "@vallo/i18n";
  import { MoneyBlock } from "@/app/admin/listings/[id]/ListingReview";
  import { mount } from "@/lib/testing/browser-root";
  const t = getDictionary("en");
  const keepers = { moveIn: t.moveIn, purchase: t.purchase, payee: null };
  const parts = [
    { key: "rent", label: "A rent slot", minor: 100 },
    { key: "agency", label: "An agency slot", minor: 50 },
  ];
  const base = { priceMinor: 100, purchase: null };
  mount(
    <div style={{ width: 360, padding: 16 }}>
      <div data-case="parts"><MoneyBlock listing={{ ...base, intent: "rent", moveIn: { parts, totalMinor: 150, totalStated: false } }} locale="en" keepers={keepers} /></div>
      <div data-case="headline"><MoneyBlock listing={{ ...base, intent: "rent", moveIn: null }} locale="en" keepers={keepers} /></div>
    </div>,
  );
`;

describe.skipIf(!hasBrowser && !process.env.CI)("the console's detail sections", () => {
  it("never put a list inside a definition list, and axe finds nothing", async () => {
    const { page, close } = await mountInBrowser({ entry, css: productCss() });
    try {
      const shape = await page.evaluate(() => ({
        listsInDl: document.querySelectorAll("dl ul, dl ol").length,
        sectionChildren: [...document.querySelectorAll("section > div")].map((el) => el.tagName),
        rows: [...document.querySelectorAll("dl")].map((dl) => [...dl.children].map((child) => child.tagName)),
      }));
      expect(shape.listsInDl).toBe(0);
      expect(shape.sectionChildren).toEqual(["DIV", "DIV", "DIV"]);
      expect(shape.rows).toEqual([["DT", "DD"], ["DT", "DD"], ["DT", "DD"]]);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("holds the listing review's cost block as a valid list, its note outside the list, with the layout unchanged", async () => {
    const { page, close } = await mountInBrowser({ entry: moneyEntry, css: productCss("app/admin/_review/review.css") });
    try {
      const shape = await page.evaluate(() =>
        [...document.querySelectorAll("[data-case]")].map((box) => {
          const dl = box.querySelector("dl.nf-rv-money")!;
          const note = box.querySelector(".nf-rv-panel__note")!;
          const dlBox = dl.getBoundingClientRect();
          const noteBox = note.getBoundingClientRect();
          return {
            case: box.getAttribute("data-case"),
            dlChildren: [...dl.children].map((child) => child.tagName),
            noteInDl: dl.contains(note),
            groups: [...dl.children].map((group) => [...group.children].map((child) => child.tagName)),
            noteJustBelow: Math.abs(noteBox.top - dlBox.bottom) <= 1,
          };
        }),
      );
      expect(shape.map((row) => row.dlChildren.every((tag) => tag === "DIV"))).toEqual([true, true]);
      expect(shape.map((row) => row.noteInDl)).toEqual([false, false]);
      expect(shape[0]!.groups).toEqual([["DT", "DD"], ["DT", "DD"], ["DT", "DD"]]);
      expect(shape[1]!.groups).toEqual([["DT", "DD"]]);
      /* The note still sits directly under the last row, as it did inside the grid. */
      expect(shape.map((row) => row.noteJustBelow)).toEqual([true, true]);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });
});
