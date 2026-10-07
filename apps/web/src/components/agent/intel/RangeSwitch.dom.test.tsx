/**
 * Space Analytics' figure card, mounted for real in Chromium: it offers only
 * the periods it was handed, a change of period changes the figure and the
 * rows in the same frame and writes the period into the address (replacing,
 * not pushing), a figure with one period draws words instead of a control,
 * and a figure that could not be counted says so rather than printing zero.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { PORTED_CSS, axeViolations } from "@/components/ui/ported-test-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

/* Structural fixtures only: words that name their slot, figures that are
   plainly fixtures. Nothing here is a claim about anybody's listings. */
const entry = (single = false) => `
  import { RangeSwitch } from "@/components/agent/intel/RangeSwitch";
  import { mount } from "@/lib/testing/browser-root";
  const day = (key, value) => ({ key, tick: key.slice(8), label: "Day " + key, value, ...(value === null ? {} : { display: String(value) }) });
  const chart = (values) => ({
    kind: "bars",
    points: values.map((v, i) => day("2026-10-0" + (i + 1), v)),
    yTicks: [{ value: 0, label: "0" }, { value: 2, label: "2" }],
    label: "Slot chart",
    periodHead: "Period head",
    valueHead: "Value head",
    nullLabel: "Null label",
    empty: "Empty words",
  });
  const views = [
    { range: "7d", tab: "Tab A", span: "Span A", figure: "3", chart: chart([1, 0, 2]), rows: [{ key: "r", title: "Row A", value: "3", href: "/x" }] },
    { range: "30d", tab: "Tab B", span: "Span B", figure: null, figureAbsent: "Absent words", chart: chart([null, null, null]), note: "Note B", rows: [{ key: "r", title: "Row A", value: null, absent: "Row absent" }] },
  ];
  window.history.replaceState(null, "", "/agent/analytics");
  mount(<div style={{ width: 390, padding: 16 }}><RangeSwitch views={${single ? "views.slice(0, 1)" : "views"}} initial="7d" periodLabel="Period name" caption="Caption words" rowsLabel="Rows words" /></div>);
`;

describe.skipIf(!hasBrowser && !process.env.CI)("RangeSwitch", () => {
  it("offers the periods it was handed and switches figure, rows and address together", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      const tabs = page.getByRole("tab");
      expect(await tabs.count()).toBe(2);
      expect(await page.getByText("Span A").isVisible()).toBe(true);
      const before = await page.evaluate(() => window.history.length);

      await page.getByRole("tab", { name: "Tab B" }).click();
      await page.getByText("Absent words").waitFor();
      expect(await page.getByText("Row absent").isVisible()).toBe(true);
      expect(await page.getByText("Note B").isVisible()).toBe(true);
      expect(await page.evaluate(() => window.location.search)).toBe("?range=30d");
      /* Replaced, not pushed: back leaves the page rather than walking taps. */
      expect(await page.evaluate(() => window.history.length)).toBe(before);
    } finally {
      await close();
    }
  });

  it("draws one period as words, with no control of one segment", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(true), css: PORTED_CSS });
    try {
      expect(await page.getByRole("tab").count()).toBe(0);
      expect(await page.getByText("Span A").isVisible()).toBe(true);
    } finally {
      await close();
    }
  });

  it("passes axe", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });
});
