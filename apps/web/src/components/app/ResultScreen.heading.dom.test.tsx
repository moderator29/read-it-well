/**
 * THE RESULT SCREEN AS A PAGE'S WHOLE CONTENT, MOUNTED FOR REAL (Chromium at 390,
 * the product's tokens and button system, axe).
 *
 * The public doors (a safety share, a landlord's reply link) are a result screen
 * and nothing else, and the verdict was a paragraph, so those pages had no h1.
 * `heading` makes it the one h1; off, it stays a paragraph for the callers that
 * sit under their own heading. On a failure the alert role is on a wrapper, not
 * the heading, so the heading survives. The actions are 44px targets.
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

const entry = (state: string, heading: boolean) => `
  import { ResultScreen } from "@/components/app/ResultSheet";
  import { mount } from "@/lib/testing/browser-root";
  mount(
    <main>
      <ResultScreen
        state="${state}"
        verdict="This link has run out"
        consequence="Ask for a new one and we will send it."
        ${heading ? "heading" : ""}
        actions={[{ label: "Back to Vallo", href: "/", tone: "primary" }]}
        data-testid="result"
      />
    </main>
  );
`;

describe.skipIf(!hasBrowser && !process.env.CI)("ResultScreen heading", () => {
  it("is a paragraph by default, so a page with its own h1 keeps one", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("expired", false), css: PORTED_CSS });
    try {
      expect(await page.getByRole("heading", { level: 1 }).count()).toBe(0);
      expect(await page.getByText("This link has run out").evaluate((el) => el.tagName)).toBe("P");
    } finally {
      await close();
    }
  });

  it("is the page's one h1 when asked, with 44px actions and no axe violation", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("expired", true), css: PORTED_CSS });
    try {
      const h1 = page.getByRole("heading", { level: 1 });
      expect(await h1.count()).toBe(1);
      expect(await h1.textContent()).toBe("This link has run out");
      const action = page.getByRole("link", { name: "Back to Vallo" });
      const box = await action.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("on a failure keeps the h1 and announces through a wrapper", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("failed", true), css: PORTED_CSS });
    try {
      expect(await page.getByRole("heading", { level: 1 }).count()).toBe(1);
      const alert = page.getByRole("alert");
      expect(await alert.count()).toBe(1);
      expect(await alert.getByRole("heading", { level: 1 }).count()).toBe(1);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });
});
