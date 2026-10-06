/**
 * A SENT MESSAGE ARRIVES ONCE, IN CHROMIUM (the motion stylesheet and the real
 * keying helpers; auditor A7 S2).
 *
 * `ThreadView` itself is not mounted here, and the reason is practical rather
 * than convenient: it imports the thread's server actions, the Supabase
 * client, the realtime hooks, the outbox and a dozen cards, none of which the
 * browser harness can stand in for, so a whole mount would test the stubs.
 * What decides whether a bubble arrives once is three pure functions
 * (`bubbleKey`, `arrivalClass`, `adoptBubble` in `thread-arrival.ts`) that
 * `ThreadView` calls in exactly this arrangement (a keyed Fragment, a `div`
 * whose class is `nf-msg` plus the arrival class, an adopt step on the state),
 * which `member-motion.test.ts` pins in `ThreadView`'s own source. So this
 * mounts a list built the same way, with the real functions and the real
 * `motion.css` rules, and asks the browser what happened to the DOM node.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Page } from "playwright-core";
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

const CSS = productCss("app/css/motion.css");

const entry = `
  import { Fragment, useState } from "react";
  import { mount } from "@/lib/testing/browser-root";
  import { adoptBubble, arrivalClass, bubbleKey } from "@/app/(app)/messages/[id]/thread-arrival";

  const history = [
    { id: "m1", mine: false, body: "Hello" },
    { id: "m2", mine: true, body: "Hi" },
  ];
  function Thread() {
    const [items, setItems] = useState(history);
    const [openedWith] = useState(() => new Set(history.map((m) => m.id)));
    window.__send = (tempId) => setItems((prev) => [...prev, { id: tempId, mine: true, body: "Sent" }]);
    window.__adopt = (tempId, realId) => setItems((prev) => adoptBubble(prev, tempId, realId, "10:02"));
    return (
      <div>
        {items.map((m) => (
          <Fragment key={bubbleKey(m)}>
            <div data-msg-id={m.id} className={"nf-msg " + (m.mine ? "nf-msg--mine" : "") + arrivalClass(openedWith, m)}>
              {m.body}
            </div>
          </Fragment>
        ))}
      </div>
    );
  }
  mount(<Thread />);
`;

const frames = (page: Page) =>
  page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));

/** The arrival animations running or filled on the bubble with this id. */
const arrivals = (page: Page, id: string) =>
  page.evaluate(
    (msg) =>
      document
        .querySelector(`[data-msg-id="${msg}"]`)!
        .getAnimations()
        .map((a) => ({ name: (a as CSSAnimation).animationName, start: a.startTime })),
    id,
  );

describe.skipIf(!hasBrowser && !process.env.CI)("a sent message arrives once", () => {
  it("carries the arrival class optimistically, stays the same node when the real id lands, and does not restart", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      /* The history the thread opened with carries no arrival class. */
      for (const id of ["m1", "m2"]) {
        const cls = await page.locator(`[data-msg-id="${id}"]`).getAttribute("class");
        expect(cls, id).not.toContain("nf-msg-in");
        expect(await arrivals(page, id), id).toEqual([]);
      }

      /* Send: the optimistic bubble arrives with the class, and one animation. */
      await page.evaluate(() => (window as unknown as { __send: (id: string) => void }).__send("local-1"));
      await frames(page);
      const optimistic = await page.locator('[data-msg-id="local-1"]').getAttribute("class");
      expect(optimistic).toContain("nf-msg-in--mine");
      const before = await arrivals(page, "local-1");
      expect(before).toHaveLength(1);
      expect(before[0]!.name).toBe("nf-msg-in-right");

      /* Hold the node, then adopt the real id mid-flight. */
      await page.evaluate(() => {
        const w = window as unknown as { __node: Element | null; __adopt: (a: string, b: string) => void };
        w.__node = document.querySelector('[data-msg-id="local-1"]');
        w.__adopt("local-1", "db-9");
      });
      await frames(page);
      const same = await page.evaluate(() => {
        const w = window as unknown as { __node: Element | null };
        const now = document.querySelector('[data-msg-id="db-9"]');
        return { identical: w.__node === now, attached: Boolean(w.__node?.isConnected) };
      });
      expect(same, "the bubble is the same DOM node after adoption").toEqual({ identical: true, attached: true });
      expect(await page.locator('[data-msg-id="local-1"]').count()).toBe(0);

      /* Same single animation, never restarted: the start time is unchanged. */
      const after = await arrivals(page, "db-9");
      expect(after).toHaveLength(1);
      expect(after[0]!.start).toBe(before[0]!.start);
      expect(await page.locator('[data-msg-id="db-9"]').getAttribute("class")).toBe(optimistic);
    } finally {
      await close();
    }
  });
});
