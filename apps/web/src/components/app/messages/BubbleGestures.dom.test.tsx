/**
 * SWIPE TO REPLY AND HOLD FOR THE MENU, IN CHROMIUM (founder, 11 October 2026).
 *
 * The real `BubbleGestures` on the product's own thread stylesheet, driven by
 * real pointer events with a touch pointer type, the shape a phone delivers.
 * `navigator.vibrate` is recorded so the light tap is checked where it lands:
 * on the release that commits the reply, and nowhere else.
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

const CSS = productCss("app/css/threads.css");

const entry = `
  import { mount } from "@/lib/testing/browser-root";
  import { BubbleGestures } from "@/components/app/messages/BubbleGestures";
  window.__log = [];
  const log = (what) => () => window.__log.push(what);
  mount(
    <div className="nf-thread" style={{ height: 600, width: 390 }}>
      <div className="nf-thread__scroll" data-testid="scroller">
        <div className="nf-msg">
          <div className="nf-msg__stack">
            <BubbleGestures side="theirs" className="nf-bubble nf-bubble--theirs" onLongPress={log("menu:theirs")} onSwipeReply={log("reply:theirs")}>
              <p className="nf-bubble__body" data-testid="theirs">Is the flat still available?</p>
              <a href="/listing/x" data-testid="link">Open</a>
            </BubbleGestures>
          </div>
        </div>
        <div className="nf-msg nf-msg--mine">
          <div className="nf-msg__stack">
            <BubbleGestures side="mine" className="nf-bubble nf-bubble--mine" onLongPress={log("menu:mine")} onSwipeReply={log("reply:mine")}>
              <p className="nf-bubble__body" data-testid="mine">Yes, it is.</p>
            </BubbleGestures>
          </div>
        </div>
      </div>
    </div>,
  );
`;

const init = `
  window.__buzz = [];
  navigator.vibrate = (pattern) => { window.__buzz.push(pattern); return true; };
  document.addEventListener("click", (event) => {
    const a = event.target.closest && event.target.closest("a");
    if (a) { event.preventDefault(); window.__log.push("open:" + a.getAttribute("href")); }
  });
`;

type Win = { __log: string[]; __buzz: unknown[] };

/** Pointer events as a finger delivers them, on the bubble that holds `testId`. */
async function gesture(
  page: Page,
  testId: string,
  path: [number, number][],
  opts: { type?: "touch" | "mouse"; holdMs?: number; end?: "up" | "cancel" } = {},
) {
  await page.evaluate(
    ({ testId, path, type, holdMs, end }) =>
      new Promise<void>((resolve) => {
        /* Fired at the element itself (a word, a link) and bubbling to the
           bubble, which is where a finger lands. */
        const target = document.querySelector(`[data-testid="${testId}"]`)!;
        const bubble = target.closest(".nf-bubble")!;
        const box = target.getBoundingClientRect();
        const x0 = box.left + Math.min(20, box.width / 2);
        const y0 = box.top + box.height / 2;
        const fire = (kind: string, dx: number, dy: number) =>
          target.dispatchEvent(
            new PointerEvent(kind, {
              bubbles: true,
              cancelable: true,
              pointerId: 7,
              pointerType: type,
              isPrimary: true,
              button: 0,
              clientX: x0 + dx,
              clientY: y0 + dy,
            }),
          );
        fire("pointerdown", 0, 0);
        for (const [dx, dy] of path) fire("pointermove", dx, dy);
        window.setTimeout(() => {
          /* Where the bubble is drawn with the finger still down. */
          (window as unknown as { __mid: string }).__mid = (bubble as HTMLElement).style.transform;
          const last = path[path.length - 1] ?? [0, 0];
          fire(end === "cancel" ? "pointercancel" : "pointerup", last[0], last[1]);
          if (end !== "cancel" && type === "touch") fire("click", last[0], last[1]);
          resolve();
        }, holdMs);
      }),
    { testId, path, type: opts.type ?? "touch", holdMs: opts.holdMs ?? 30, end: opts.end ?? "up" },
  );
}

const state = (page: Page) => page.evaluate(() => {
  const w = window as unknown as Win & { __mid: string };
  return { log: [...w.__log], buzz: [...w.__buzz], mid: w.__mid };
});

const steps = (to: number, axis: "x" | "y" = "x"): [number, number][] =>
  Array.from({ length: 8 }, (_, i) => {
    const v = Math.round((to * (i + 1)) / 8);
    return axis === "x" ? [v, 1] : [1, v];
  });

describe.skipIf(!hasBrowser && !process.env.CI)("swipe to reply", () => {
  it("sets the reply when a received bubble is swiped right about 56px, with one light tap on the release", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS, init });
    try {
      await gesture(page, "theirs", steps(70));
      const { log, buzz, mid } = await state(page);
      expect(mid).toMatch(/^translateX\(\d+(\.\d+)?px\)$/);
      expect(log).toEqual(["reply:theirs"]);
      expect(buzz).toEqual([6]);
      /* The bubble settles back, and the thread never scrolled sideways. */
      expect(await page.evaluate(() => document.querySelector<HTMLElement>(".nf-bubble--theirs")!.style.transform)).toBe("");
      expect(await page.getByTestId("scroller").evaluate((el) => el.scrollLeft)).toBe(0);
      expect(await page.getByTestId("scroller").evaluate((el) => getComputedStyle(el).overflowX)).toBe("hidden");
    } finally {
      await close();
    }
  });

  it("sets the reply when a sent bubble is swiped left, and not for the wrong way or a short swipe", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS, init });
    try {
      await gesture(page, "mine", steps(40));
      await gesture(page, "theirs", steps(-70));
      await gesture(page, "theirs", steps(40));
      expect((await state(page)).log).toEqual([]);
      await gesture(page, "mine", steps(-70));
      const { log, buzz } = await state(page);
      expect(log).toEqual(["reply:mine"]);
      expect(buzz).toEqual([6]);
    } finally {
      await close();
    }
  });

  it("never opens the menu from a swipe, and a swipe does not open a link inside the bubble", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS, init });
    try {
      /* Moved 20px sideways and then held well past the hold time. */
      await gesture(page, "theirs", steps(20), { holdMs: 700 });
      expect((await state(page)).log).toEqual([]);
      await gesture(page, "link", steps(70));
      expect((await state(page)).log).toEqual(["reply:theirs"]);
    } finally {
      await close();
    }
  });

  it("keeps the hold: 450ms without moving opens the menu, and a right click opens it at once", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS, init });
    try {
      await gesture(page, "theirs", [], { holdMs: 600 });
      expect((await state(page)).log).toEqual(["menu:theirs"]);
      await page.getByTestId("mine").click({ button: "right" });
      const { log, buzz } = await state(page);
      expect(log).toEqual(["menu:theirs", "menu:mine"]);
      expect(buzz).toEqual([]);
    } finally {
      await close();
    }
  });

  it("leaves a vertical drag to the scroll and a mouse drag to text selection", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS, init });
    try {
      await gesture(page, "theirs", steps(70, "y"), { end: "cancel" });
      await gesture(page, "theirs", steps(70), { type: "mouse" });
      const { log, mid } = await state(page);
      expect(log).toEqual([]);
      expect(mid).toBe("");
      expect(
        await page.evaluate(() => getComputedStyle(document.querySelector(".nf-bubble--theirs")!).touchAction),
      ).toBe("pan-y pinch-zoom");
    } finally {
      await close();
    }
  });
});
