/**
 * AIResponse, mounted for real in Chromium: each of its five states is a real
 * thing with no spinner, only the thinking state loops, the streaming answer is
 * not read token by token, and the state is announced once.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { PORTED_CSS, axeViolations } from "./ported-test-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const entry = (status: string) => `
  import { AIResponse } from "@/components/ui/AIResponse";
  import { mount } from "@/lib/testing/browser-root";
  window.__stops = 0;
  window.__acted = [];
  mount(
    <div style={{ padding: 16, width: 360 }}>
      <AIResponse
        status="${status}"
        label="Assistant"
        thinkingLabel="Thinking"
        statusLabels={{ done: "Answer complete", stopped: "Stopped", error: "Failed" }}
        stopLabel="Stop"
        onStop={() => { window.__stops += 1; }}
        errorMessage="The reason, in the caller's words."
        actions={[{ id: "copy", label: "Copy", icon: "document", onSelect: () => window.__acted.push("copy") }]}
        data-testid="ai"
      >
        <p>The answer so far.</p>
      </AIResponse>
    </div>
  );
`;

describe.skipIf(!hasBrowser && !process.env.CI)("AIResponse", () => {
  it("thinking: a shaped skeleton that breathes (the one loop), the label, Stop, and no children", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("thinking"), css: PORTED_CSS });
    try {
      const card = page.getByTestId("ai");
      expect(await card.getAttribute("aria-busy")).toBe("true");
      expect(await card.getByText("Thinking").first().isVisible()).toBe(true);
      expect(await page.locator(".nf-ai__skeleton > span").count()).toBe(3);
      expect(await page.getByText("The answer so far.").count()).toBe(0);
      const anim = await page.locator(".nf-ai__skeleton > span").first().evaluate((el) => {
        const a = getComputedStyle(el);
        return { name: a.animationName, count: a.animationIterationCount };
      });
      expect(anim).toEqual({ name: "nf-ai-breathe", count: "infinite" });
      await page.getByRole("button", { name: "Stop" }).click();
      expect(await page.evaluate(() => (window as unknown as { __stops: number }).__stops)).toBe(1);
      expect(await page.getByRole("status").textContent()).toBe("Thinking");
    } finally {
      await close();
    }
  });

  it("streaming: the words so far with a still caret, Stop offered, the answer not live", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("streaming"), css: PORTED_CSS });
    try {
      expect(await page.getByText("The answer so far.").isVisible()).toBe(true);
      expect(await page.locator(".nf-ai__caret").count()).toBe(1);
      expect(await page.locator(".nf-ai__caret").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
      expect(await page.getByRole("button", { name: "Stop" }).isVisible()).toBe(true);
      /* The answer itself is not a live region: it would be read token by token. */
      expect(await page.locator(".nf-ai__body").getAttribute("aria-live")).toBeNull();
      expect(await page.getByRole("button", { name: "Copy" }).count()).toBe(0);
    } finally {
      await close();
    }
  });

  it("done: the full answer, its actions, no Stop, and one polite announcement", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("done"), css: PORTED_CSS });
    try {
      expect(await page.getByRole("button", { name: "Stop" }).count()).toBe(0);
      expect(await page.locator(".nf-ai__caret").count()).toBe(0);
      expect(await page.getByTestId("ai").getAttribute("aria-busy")).toBeNull();
      await page.getByRole("button", { name: "Copy" }).click();
      expect(await page.evaluate(() => (window as unknown as { __acted: string[] }).__acted)).toEqual(["copy"]);
      expect(await page.getByRole("status").textContent()).toBe("Answer complete");
    } finally {
      await close();
    }
  });

  it("stopped keeps what arrived; error shows the caller's own words as an alert", async () => {
    const stopped = await mountInBrowser({ entry: entry("stopped"), css: PORTED_CSS });
    try {
      expect(await stopped.page.getByText("The answer so far.").isVisible()).toBe(true);
      expect(await stopped.page.getByRole("status").textContent()).toBe("Stopped");
    } finally {
      await stopped.close();
    }
    const error = await mountInBrowser({ entry: entry("error"), css: PORTED_CSS });
    try {
      expect(await error.page.getByRole("alert").textContent()).toBe("The reason, in the caller's words.");
      expect(await error.page.locator(".nf-plate--danger").count()).toBe(1);
    } finally {
      await error.close();
    }
  });

  it("has no spinner in any state, and only thinking has an infinite animation", async () => {
    for (const status of ["thinking", "streaming", "done", "stopped", "error"]) {
      const { page, close } = await mountInBrowser({ entry: entry(status), css: PORTED_CSS });
      try {
        const loops = await page.getByTestId("ai").evaluate((root) => {
          const found: string[] = [];
          for (const el of [root, ...root.querySelectorAll("*")]) {
            for (const a of el.getAnimations()) {
              const timing = a.effect?.getComputedTiming();
              if (timing?.iterations === Infinity) found.push((a as CSSAnimation).animationName);
            }
          }
          return found;
        });
        if (status === "thinking") expect(new Set(loops)).toEqual(new Set(["nf-ai-breathe"]));
        else expect(loops, status).toEqual([]);
        expect(await page.locator("[class*=spin], svg animateTransform").count(), status).toBe(0);
      } finally {
        await close();
      }
    }
  });

  it("is a still skeleton under reduced motion", async () => {
    const { page, close } = await mountInBrowser({ entry: entry("thinking"), css: PORTED_CSS, reducedMotion: true });
    try {
      expect(await page.locator(".nf-ai__skeleton > span").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    } finally {
      await close();
    }
  });

  it("passes axe in both themes, in every state", async () => {
    for (const status of ["thinking", "streaming", "done", "stopped", "error"]) {
      for (const theme of ["dark", "light"]) {
        const { page, close } = await mountInBrowser({ entry: entry(status), css: PORTED_CSS });
        try {
          await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
          expect(await axeViolations(page), `${status} ${theme}`).toEqual([]);
        } finally {
          await close();
        }
      }
    }
  });
});
