/**
 * NO CARD IS EVER LEFT HELD (auditor A8 on card entry on scroll): a card whose
 * index changes while it waits is released, a sideways rail is never held (a
 * card floated down inside an overflow-x rail made the rail scroll vertically),
 * a held card reached by the keyboard shows at once, and a root motion setting
 * changed after the page loaded shows every held card. Waits are polled, not
 * timed, so a loaded machine does not flake them.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss("app/css/animation.css", "app/css/list-views.css");

const entry = `
  import { useRef, useState } from "react";
  import { mount } from "@/lib/testing/browser-root";
  import { useScrollEntry } from "@/lib/motion/scroll-entry";
  function Card({ index, id }: { index: number; id: number }) {
    const ref = useRef<HTMLElement | null>(null);
    useScrollEntry(ref, index);
    return (
      <article ref={ref} className="nf-pcard" data-card={id}
        style={{ height: 260, margin: "0 0 16px", background: "var(--nf-surface-raised)" }}>
        <a href="#">card {id}</a>
      </article>
    );
  }
  function App() {
    const [shift, setShift] = useState(0);
    (window as unknown as { __shift: (n: number) => void }).__shift = setShift;
    return (
      <div>
        <ul className="nf-scroll-x" data-rail style={{ display: "flex", overflowX: "auto", gap: 16, height: 300, padding: 0 }}>
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} style={{ flex: "0 0 200px" }}><Card index={i} id={100 + i} /></li>
          ))}
        </ul>
        <div style={{ padding: 16 }}>
          {Array.from({ length: 12 }, (_, i) => <Card key={i} index={i + shift} id={i} />)}
        </div>
      </div>
    );
  }
  mount(<App />);
`;

const entryOf = (page: import("playwright-core").Page, id: number) =>
  page.locator(`[data-card="${id}"]`).evaluate((el) => (el as HTMLElement).dataset.entry ?? null);
const opacityOf = (page: import("playwright-core").Page, id: number) =>
  page.locator(`[data-card="${id}"]`).evaluate((el) => getComputedStyle(el).opacity);

describe.skipIf(!hasBrowser && !process.env.CI)("card entry never strands a card", () => {
  it("never holds a card inside a sideways rail, and the rail gains no vertical overflow", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      await expect.poll(() => entryOf(page, 11)).toBe("pending");
      const held = await page.evaluate(() => document.querySelectorAll("[data-rail] [data-entry]").length);
      expect(held).toBe(0);
      const rail = await page.locator("[data-rail]").evaluate((el) => ({ client: el.clientHeight, scroll: el.scrollHeight }));
      expect(rail.scroll).toBeLessThanOrEqual(rail.client);
    } finally {
      await close();
    }
  });

  it("releases a held card whose index changes, and it shows once it is in view", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      await expect.poll(() => entryOf(page, 11)).toBe("pending");
      await page.evaluate(() => (window as unknown as { __shift: (n: number) => void }).__shift(3));
      await page.locator('[data-card="11"]').scrollIntoViewIfNeeded();
      await expect.poll(() => opacityOf(page, 11), { timeout: 5000 }).toBe("1");
    } finally {
      await close();
    }
  });

  it("shows a held card at once when the keyboard reaches it", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      await expect.poll(() => entryOf(page, 11)).toBe("pending");
      /* Focus without scrolling, so only the focus rule can show it. */
      await page.locator('[data-card="11"] a').evaluate((el) => (el as HTMLElement).focus({ preventScroll: true }));
      expect(await opacityOf(page, 11)).toBe("1");
    } finally {
      await close();
    }
  });

  it("shows every held card when Calm or data saving is switched on after load", async () => {
    for (const [name, value] of [["data-motion", "calm"], ["data-save-data", "on"]] as const) {
      const { page, close } = await mountInBrowser({ entry, css: CSS });
      try {
        await expect.poll(() => entryOf(page, 11)).toBe("pending");
        await page.evaluate(([n, v]) => document.documentElement.setAttribute(n, v), [name, value]);
        expect(await opacityOf(page, 11)).toBe("1");
      } finally {
        await close();
      }
    }
  });
});
