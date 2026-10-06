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
});
