/**
 * A LEAVING SHEET STILL SHOWS WHAT IT SHOWED (Chromium; auditor A8). Callers
 * clear the state a sheet reads in the same update that closes it, the way
 * `{asking ? <Panel/> : null}` does; the sheet's 240ms leave must slide away
 * the card the person was looking at, not an empty one. The closing state
 * and its content are read in one evaluate straight after the close, so a
 * loaded machine cannot let the leave finish first.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { PORTED_CSS } from "@/components/ui/ported-test-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const entry = `
  import { useState } from "react";
  import { flushSync } from "react-dom";
  import { mount } from "@/lib/testing/browser-root";
  import { Sheet } from "@/components/ui/Sheet";
  function Harness() {
    const [asking, setAsking] = useState<string | null>(null);
    (window as unknown as { __close: () => void }).__close = () => flushSync(() => setAsking(null));
    return (
      <div>
        <button type="button" id="opener" onClick={() => setAsking("Room 4")}>Open it</button>
        <Sheet
          open={asking !== null}
          onOpenChange={(next) => { if (!next) setAsking(null); }}
          title={asking ? "Accept " + asking : ""}
          closeLabel="Close"
          testId="the-sheet"
          apply={asking ? { label: "Accept", onClick: () => {} } : undefined}
        >
          {asking ? <p id="held">The total for {asking}</p> : null}
        </Sheet>
      </div>
    );
  }
  mount(<Harness />);
`;

describe.skipIf(!hasBrowser && !process.env.CI)("a leaving sheet's content", () => {
  it("keeps its title, content and actions while it leaves, though the caller cleared them", async () => {
    const { page, close } = await mountInBrowser({ entry, css: PORTED_CSS });
    try {
      await page.locator("#opener").click();
      await page.locator('[data-testid="the-sheet"]').waitFor();
      const during = await page.evaluate(() => {
        (window as unknown as { __close: () => void }).__close();
        const el = document.querySelector('[data-testid="the-sheet"]');
        return {
          closing: el?.getAttribute("data-closing") ?? null,
          text: el?.textContent ?? "",
        };
      });
      expect(during.closing).toBe("true");
      expect(during.text).toContain("Accept Room 4");
      expect(during.text).toContain("The total for Room 4");
      expect(during.text).toContain("Accept");
      await page.locator('[data-testid="the-sheet"]').waitFor({ state: "detached" });
    } finally {
      await close();
    }
  });
});
