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

/*
 * The same list with the realtime echo wired as `ThreadView` wires it: one
 * `mergeEcho` on the items, and an `openedWith` that is the real, live set the
 * thread opened with (read by `arrivalClass` on every render, and never added
 * to for an echo). `__echo` is the row the realtime channel delivers.
 */
const echoEntry = `
  import { Fragment, useState } from "react";
  import { mount } from "@/lib/testing/browser-root";
  import { adoptBubble, arrivalClass, bubbleKey, mergeEcho } from "@/app/(app)/messages/[id]/thread-arrival";

  const history = [
    { id: "m1", mine: false, body: "Hello", imageUrl: null },
    { id: "m2", mine: true, body: "Hi", imageUrl: null },
  ];
  function Thread() {
    const [items, setItems] = useState(history);
    const [openedWith] = useState(() => new Set(history.map((m) => m.id)));
    window.__openedWith = openedWith;
    window.__send = (tempId, body) =>
      setItems((prev) => [...prev, { id: tempId, mine: true, body, imageUrl: null, state: "sending" }]);
    window.__adopt = (tempId, realId) => setItems((prev) => adoptBubble(prev, tempId, realId, "10:02"));
    window.__echo = (row) => setItems((prev) => mergeEcho(prev, { imageUrl: null, ...row }));
    window.__fail = (id) => setItems((prev) => prev.map((m) => (m.id === id ? { ...m, state: "failed" } : m)));
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

type Hooks = {
  __send: (id: string, body: string) => void;
  __adopt: (temp: string, real: string) => void;
  __echo: (row: { id: string; mine: boolean; body: string }) => void;
  __fail: (id: string) => void;
  __node: Element | null;
};
const hooks = (page: Page) => ({
  send: (id: string, body: string) =>
    page.evaluate(([a, b]) => (window as unknown as Hooks).__send(a!, b!), [id, body]),
  adopt: (temp: string, real: string) =>
    page.evaluate(([a, b]) => (window as unknown as Hooks).__adopt(a!, b!), [temp, real]),
  echo: (row: { id: string; mine: boolean; body: string }) =>
    page.evaluate((r) => (window as unknown as Hooks).__echo(r), row),
  fail: (id: string) => page.evaluate((m) => (window as unknown as Hooks).__fail(m), id),
  hold: (id: string) =>
    page.evaluate((m) => {
      (window as unknown as Hooks).__node = document.querySelector(`[data-msg-id="${m}"]`);
    }, id),
  /** Is the held node the one now on screen under this id, still attached? */
  sameAs: (id: string) =>
    page.evaluate((m) => {
      const held = (window as unknown as Hooks).__node;
      return { identical: held === document.querySelector(`[data-msg-id="${m}"]`), attached: Boolean(held?.isConnected) };
    }, id),
});

const frames = (page: Page) =>
  page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));

/*
 * THE ARRIVALS ARE READ FROM `animationstart`, NOT FROM `getAnimations()`.
 * The log is installed before the thread mounts and records every CSS
 * animation that STARTS on a bubble, so a short arrival that has already
 * finished on a loaded machine is still counted, and a restart is a second
 * event rather than a start time to compare.
 */
const LOG = `
  window.__starts = [];
  document.addEventListener("animationstart", (event) => {
    const id = event.target instanceof Element ? event.target.getAttribute("data-msg-id") : null;
    if (id) window.__starts.push({ id, name: event.animationName });
  }, true);
`;

/** The arrival animations that have started on the bubble with this id (or these ids). */
const arrivals = (page: Page, ...ids: string[]) =>
  page.evaluate(
    (list) =>
      (window as unknown as { __starts: { id: string; name: string }[] }).__starts.filter((start) =>
        list.includes(start.id),
      ),
    ids,
  );

describe.skipIf(!hasBrowser && !process.env.CI)("a sent message arrives once", () => {
  it("carries the arrival class optimistically, stays the same node when the real id lands, and does not restart", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS, init: LOG });
    try {
      /* The history the thread opened with carries no arrival class. */
      for (const id of ["m1", "m2"]) {
        const cls = await page.locator(`[data-msg-id="${id}"]`).getAttribute("class");
        expect(cls, id).not.toContain("nf-msg-in");
        expect(await arrivals(page, id), id).toEqual([]);
      }

      /* Send: the optimistic bubble arrives with the class, and one animation. */
      await page.evaluate(() => (window as unknown as { __send: (id: string) => void }).__send("local-1"));
      await expect.poll(() => arrivals(page, "local-1")).toHaveLength(1);
      const optimistic = await page.locator('[data-msg-id="local-1"]').getAttribute("class");
      expect(optimistic).toContain("nf-msg-in--mine");
      expect((await arrivals(page, "local-1"))[0]!.name).toBe("nf-msg-in-right");

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

      /* Same single animation, never restarted: the adopted bubble has started
         no second animation, under either of its ids. */
      await frames(page);
      expect(await arrivals(page, "local-1", "db-9")).toHaveLength(1);
      expect(await page.locator('[data-msg-id="db-9"]').getAttribute("class")).toBe(optimistic);
    } finally {
      await close();
    }
  });

  it("result first, then the echo: the same node, the class kept, the arrival not cut short or restarted", async () => {
    const { page, close } = await mountInBrowser({ entry: echoEntry, css: CSS, init: LOG });
    try {
      const h = hooks(page);
      await h.send("local-1", "Sent");
      await expect.poll(() => arrivals(page, "local-1")).toHaveLength(1);
      const playing = await page.locator('[data-msg-id="local-1"]').getAttribute("class");
      expect(playing).toContain("nf-msg-in--mine");
      await h.hold("local-1");
      await h.adopt("local-1", "db-9");
      /* The echo lands inside the arrival (well under its 240ms). */
      await h.echo({ id: "db-9", mine: true, body: "Sent" });
      await frames(page);
      expect(await h.sameAs("db-9")).toEqual({ identical: true, attached: true });
      expect(await page.locator('[data-msg-id="db-9"]').count()).toBe(1);
      /* The class is still on, so the animation was not removed mid-flight. */
      expect(await page.locator('[data-msg-id="db-9"]').getAttribute("class")).toBe(playing);
      expect(await arrivals(page, "local-1", "db-9")).toHaveLength(1);
      /* The set the thread opened with was not touched by the echo. */
      expect(await page.evaluate(() => [...(window as unknown as { __openedWith: Set<string> }).__openedWith])).toEqual([
        "m1",
        "m2",
      ]);
    } finally {
      await close();
    }
  });

  it("echo first, then the result: the row takes the temporary bubble's node, and nothing jumps", async () => {
    const { page, close } = await mountInBrowser({ entry: echoEntry, css: CSS, init: LOG });
    try {
      const h = hooks(page);
      await h.send("local-1", "Sent");
      await expect.poll(() => arrivals(page, "local-1")).toHaveLength(1);
      const playing = await page.locator('[data-msg-id="local-1"]').getAttribute("class");
      await h.hold("local-1");
      await h.echo({ id: "db-9", mine: true, body: "Sent" });
      await frames(page);
      expect(await h.sameAs("db-9"), "the echo row is the optimistic bubble's own node").toEqual({
        identical: true,
        attached: true,
      });
      expect(await page.locator('[data-msg-id="local-1"]').count()).toBe(0);
      expect(await page.locator('[data-msg-id="db-9"]').getAttribute("class")).toBe(playing);
      /* The late result finds the real id present: still one bubble, same node. */
      await h.adopt("local-1", "db-9");
      await frames(page);
      expect(await page.locator(".nf-msg").count()).toBe(3);
      expect(await h.sameAs("db-9")).toEqual({ identical: true, attached: true });
      expect(await arrivals(page, "local-1", "db-9")).toHaveLength(1);
    } finally {
      await close();
    }
  });

  it("a message of mine from another device arrives normally, with its own arrival", async () => {
    const { page, close } = await mountInBrowser({ entry: echoEntry, css: CSS, init: LOG });
    try {
      const h = hooks(page);
      await h.echo({ id: "db-12", mine: true, body: "From my phone" });
      await expect.poll(() => arrivals(page, "db-12")).toHaveLength(1);
      expect(await page.locator('[data-msg-id="db-12"]').getAttribute("class")).toContain("nf-msg-in--mine");
      expect(await page.locator(".nf-msg").count()).toBe(3);
    } finally {
      await close();
    }
  });

  it("a send that failed client-side after the row was inserted: the echo makes that very bubble delivered", async () => {
    const { page, close } = await mountInBrowser({ entry: echoEntry, css: CSS, init: LOG });
    try {
      const h = hooks(page);
      await h.send("local-1", "Sent");
      await expect.poll(() => arrivals(page, "local-1")).toHaveLength(1);
      await h.hold("local-1");
      await h.fail("local-1");
      await h.echo({ id: "db-9", mine: true, body: "Sent" });
      await frames(page);
      /* One bubble, the same node, under the row's id; no failed copy beside a delivered one. */
      expect(await h.sameAs("db-9")).toEqual({ identical: true, attached: true });
      expect(await page.locator(".nf-msg").count()).toBe(3);
      expect(await page.locator('[data-msg-id="local-1"]').count()).toBe(0);
      expect(await arrivals(page, "local-1", "db-9")).toHaveLength(1);
    } finally {
      await close();
    }
  });
});
