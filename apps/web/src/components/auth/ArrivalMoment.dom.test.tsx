/**
 * The arrival moment, mounted for real in Chromium (audit A5):
 *
 *   - focus lands on its title, not on <body>, once the form that held it is
 *     gone;
 *   - it never covers the screen forever: the harness's router records
 *     `replace` and never navigates (the stuck navigation the audit named),
 *     and the moment then loads its target outright after its bounded life.
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
import { ARRIVAL_ESCAPE_MS } from "./ArrivalMoment";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const entry = (to: string | null) => `
  import { getDictionary } from "@vallo/i18n";
  import { ArrivalMoment } from "@/components/auth/ArrivalMoment";
  import { mount } from "@/lib/testing/browser-root";
  mount(<ArrivalMoment t={getDictionary("en")} name="Ada" ${to ? `to=${JSON.stringify(to)}` : ""} />);
`;

describe.skipIf(!hasBrowser && !process.env.CI)("the arrival moment, in a browser", () => {
  it("is bounded: the hold, the door and the startup's four-second ceiling", () => {
    expect(ARRIVAL_ESCAPE_MS).toBe(1100 + 1500 + 4000);
  });

  it("takes focus on its title", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(null), url: "http://vallo.test/verify" });
    try {
      await page.waitForSelector('[data-testid="arrival-moment"]');
      await page.waitForFunction(() => document.activeElement?.getAttribute("data-testid") === "arrival-title");
    } finally {
      await close();
    }
  });

  it("is announced once, by the focused title and its description, not by a live region as well", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(null), url: "http://vallo.test/verify" });
    try {
      await page.waitForFunction(() => document.activeElement?.getAttribute("data-testid") === "arrival-title");
      /* No live region anywhere in the moment: focus is the one announcement. */
      expect(await page.locator('[data-testid="arrival-moment"] [aria-live], [data-testid="arrival-moment"][aria-live], [data-testid="arrival-moment"] [role="status"], [data-testid="arrival-moment"][role="status"]').count()).toBe(0);
      /* The line under the title is read with it, as its description. */
      const described = await page.evaluate(() => {
        const t = document.activeElement as HTMLElement;
        return document.getElementById(t.getAttribute("aria-describedby") ?? "")?.textContent ?? "";
      });
      expect(described.length).toBeGreaterThan(0);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("loads its target outright when the client navigation never lands", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("/home?welcome=1"), url: "http://vallo.test/verify" });
    try {
      await page.waitForSelector('[data-testid="arrival-moment"]');
      await page.waitForTimeout(ARRIVAL_ESCAPE_MS - 1500);
      expect(new URL(page.url()).pathname).toBe("/verify");
      await page.waitForURL("http://vallo.test/home?welcome=1", { timeout: 5000 });
    } finally {
      await close();
    }
  });
});
