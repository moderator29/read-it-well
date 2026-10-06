/**
 * DragToConfirm, mounted for real in Chromium with the product's own
 * stylesheet: the slide, the keyboard path, the rules that make it safe for
 * money, and what a person who asked for less motion is shown.
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
import { PORTED_CSS, axeViolations, withoutFeatures } from "./ported-test-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

/* `behaviour` is function source: what onConfirm does in this test. */
function entry(opts: { money?: boolean; autoResetDelay?: number; behaviour?: string; tone?: string } = {}): string {
  return `
    import { DragToConfirm } from "@/components/ui/DragToConfirm";
    import { MotionProvider } from "@/components/app/MotionProvider";
    import { mount } from "@/lib/testing/browser-root";
    window.__confirms = 0;
    const onConfirm = ${opts.behaviour ?? "() => { window.__confirms += 1; }"};
    const extra = ${JSON.stringify({
      ...(opts.money ? { money: true } : {}),
      ...(opts.autoResetDelay ? { autoResetDelay: opts.autoResetDelay } : {}),
      ...(opts.tone ? { tone: opts.tone } : {}),
    })};
    mount(
      <MotionProvider><div style={{ width: 340, padding: 16 }}>
        <DragToConfirm
          label="Slide to confirm"
          confirmingLabel="Confirming"
          confirmedLabel="Confirmed"
          keyboardLabel="Confirm the action"
          errorLabel="Not confirmed"
          onConfirm={() => { window.__confirms += 0; return onConfirm(); }}
          data-testid="dtc"
          {...extra}
        />
      </div></MotionProvider>
    );
  `;
}

async function slide(page: Page, fraction: number) {
  const handle = page.getByRole("button", { name: "Confirm the action" });
  const box = (await handle.boundingBox())!;
  const track = (await page.getByTestId("dtc").boundingBox())!;
  const travel = track.width - 2 * 4 - 2 - 48;
  const y = box.y + box.height / 2;
  const x = box.x + box.width / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + (travel * fraction) / 2, y, { steps: 4 });
  await page.mouse.move(x + travel * fraction, y, { steps: 4 });
  await page.mouse.up();
}

/* The handle's x, as the browser draws it. */
const handleX = (page: Page) =>
  page.getByRole("button", { name: "Confirm the action" }).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
const state = (page: Page) => page.getByTestId("dtc").getAttribute("data-state");
const confirms = (page: Page) => page.evaluate(() => (window as unknown as { __confirms: number }).__confirms);

describe.skipIf(!hasBrowser && !process.env.CI)("DragToConfirm", () => {
  it("rests with its prompt, a labelled focusable handle and nothing confirmed", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      expect(await state(page)).toBe("idle");
      const handle = page.getByRole("button", { name: "Confirm the action" });
      expect(await handle.isVisible()).toBe(true);
      expect(await page.getByTestId("dtc").textContent()).toContain("Slide to confirm");
      expect(await confirms(page)).toBe(0);
      /* At least the 44px touch floor, and radius 14 on the track. */
      const box = (await handle.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      const radius = await page.getByTestId("dtc").evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
      expect(radius).toBe("14px");
    } finally {
      await close();
    }
  });

  it("confirms once on a full slide, and stays confirmed", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      await slide(page, 1);
      await page.waitForFunction(() => document.querySelector("[data-testid=dtc]")?.getAttribute("data-state") === "confirmed");
      expect(await confirms(page)).toBe(1);
      expect(await page.getByTestId("dtc").textContent()).toContain("Confirmed");
      expect(await page.locator('[role="status"]').textContent()).toBe("Confirmed");
      expect(await page.getByRole("button", { name: "Confirm the action" }).getAttribute("aria-disabled")).toBe("true");
      /* It does not drift back, and a second slide does nothing. */
      await page.waitForTimeout(600);
      expect(await state(page)).toBe("confirmed");
      await slide(page, 1);
      expect(await confirms(page)).toBe(1);
    } finally {
      await close();
    }
  });

  it("springs back and confirms nothing when let go short of the end", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      await slide(page, 0.6);
      await page.waitForFunction(() => document.querySelector("[data-testid=dtc]")?.getAttribute("data-state") === "idle");
      expect(await confirms(page)).toBe(0);
      await page.waitForTimeout(700);
      expect(Math.abs(await handleX(page))).toBeLessThan(0.5);
    } finally {
      await close();
    }
  });

  it("is fully usable with framer-motion's features never loaded: follows the finger, confirms, and works from the keyboard", async () => {
    const { page, close } = await mountInBrowser({ entry: withoutFeatures(entry()), css: PORTED_CSS });
    try {
      const handle = page.getByRole("button", { name: "Confirm the action" });
      const box = (await handle.boundingBox())!;
      await page.mouse.move(box.x + 24, box.y + 24);
      await page.mouse.down();
      await page.mouse.move(box.x + 24 + 100, box.y + 24, { steps: 5 });
      expect(Math.abs((await handleX(page)) - 100)).toBeLessThan(1);
      expect(Number(await page.locator(".nf-dtc__fill").evaluate((el) => getComputedStyle(el).opacity))).toBe(1);
      await page.mouse.up();
      await page.waitForTimeout(700);
      expect(Math.abs(await handleX(page))).toBeLessThan(0.5);
      await slide(page, 1);
      await page.waitForFunction(() => document.querySelector("[data-testid=dtc]")?.getAttribute("data-state") === "confirmed");
      expect(await confirms(page)).toBe(1);
      expect(await page.getByTestId("dtc").textContent()).toContain("Confirmed");
    } finally {
      await close();
    }
    const kb = await mountInBrowser({ entry: withoutFeatures(entry()), css: PORTED_CSS });
    try {
      await kb.page.getByRole("button", { name: "Confirm the action" }).focus();
      await kb.page.keyboard.press("Enter");
      await kb.page.waitForFunction(() => document.querySelector("[data-testid=dtc]")?.getAttribute("data-state") === "confirmed");
    } finally {
      await kb.close();
    }
  });

  it("follows the finger one to one while dragged, fill and all", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      const handle = page.getByRole("button", { name: "Confirm the action" });
      const box = (await handle.boundingBox())!;
      await page.mouse.move(box.x + 24, box.y + 24);
      await page.mouse.down();
      await page.mouse.move(box.x + 24 + 100, box.y + 24, { steps: 5 });
      expect(Math.abs((await handleX(page)) - 100)).toBeLessThan(1);
      /* The fill's leading edge rides with it, and is opaque. */
      const fill = await page.locator(".nf-dtc__fill").evaluate((el) => ({ o: Number(getComputedStyle(el).opacity), r: el.getBoundingClientRect().right }));
      expect(fill.o).toBe(1);
      /* Under the handle's centre, widened by the last 24px as it nears the end. */
      const track = (await page.getByTestId("dtc").boundingBox())!;
      const max = track.width - 2 - 8 - 48;
      expect(Math.abs(fill.r - (box.x - 4 + 100 + 28 + 24 * (100 / max)))).toBeLessThan(2);
      await page.mouse.up();
    } finally {
      await close();
    }
  });

  it("can be grabbed again while it is springing back, and picks up where it is", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      const handle = page.getByRole("button", { name: "Confirm the action" });
      /*
       * The press has to land on the handle WHILE it is mid-return, and a moving
       * target read over CDP can be somewhere else by the time the press arrives
       * when the machine is busy. So an attempt only counts once the component
       * itself says it was grabbed (`data-state="dragging"`, set by its own
       * pointerdown) with the handle still away from rest; any attempt that
       * missed (the spring had finished, or carried the handle out from under
       * the press) is released and made again. Nothing below is loosened: the
       * assertions run, with the same tolerances, only on a genuine mid-flight
       * grab.
       */
      let grabAt: { x: number; y: number } | null = null;
      let held = 0;
      for (let attempt = 0; attempt < 12 && !grabAt; attempt += 1) {
        const start = (await handle.boundingBox())!;
        await page.mouse.move(start.x + 24, start.y + 24);
        await page.mouse.down();
        await page.mouse.move(start.x + 24 + 150, start.y + 24, { steps: 4 });
        await page.waitForTimeout(150);
        await page.mouse.up();
        /* Mid-return: somewhere between the drop point and the start. */
        const box = (await handle.boundingBox())!;
        await page.mouse.move(box.x + 24, box.y + 24);
        await page.mouse.down();
        const grabbed = (await page.getByTestId("dtc").getAttribute("data-state")) === "dragging";
        const x = await handleX(page);
        if (grabbed && x > 0.5 && x < 150) {
          grabAt = { x: box.x, y: box.y };
          held = x;
        } else {
          await page.mouse.up();
          await page.waitForFunction(
            () => new DOMMatrix(getComputedStyle(document.querySelector(".nf-dtc__handle")!).transform).m41 < 0.5,
          );
        }
      }
      expect(grabAt, "never managed a mid-flight grab").not.toBeNull();
      const at = grabAt!;
      /* Grabbed: the return stops dead where it was, neither jumping to the
         start nor carrying on. */
      await page.waitForTimeout(120);
      expect(Math.abs((await handleX(page)) - held)).toBeLessThan(0.5);
      expect(held).toBeGreaterThan(0.5);
      expect(held).toBeLessThan(150);
      /* And the drag continues from there, one to one. */
      await page.mouse.move(at.x + 24 + 10, at.y + 24, { steps: 2 });
      expect(Math.abs((await handleX(page)) - (held + 10))).toBeLessThan(1);
      await page.mouse.up();
    } finally {
      await close();
    }
  });

  it("nudges along its track on a plain click, to show the way, and does not confirm", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      const handle = page.getByRole("button", { name: "Confirm the action" });
      await handle.click();
      expect(await confirms(page)).toBe(0);
      await page.waitForFunction(() => {
        const h = document.querySelector(".nf-dtc__handle") as HTMLElement;
        return new DOMMatrix(getComputedStyle(h).transform).m41 > 3;
      });
      await page.waitForTimeout(900);
      expect(Math.abs(await handleX(page))).toBeLessThan(0.5);
    } finally {
      await close();
    }
  });

  it("confirms from the keyboard", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS });
    try {
      const handle = page.getByRole("button", { name: "Confirm the action" });
      await handle.focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => document.querySelector("[data-testid=dtc]")?.getAttribute("data-state") === "confirmed");
      expect(await confirms(page)).toBe(1);
    } finally {
      await close();
    }
  });

  it("returns to rest and says so when the action did not happen", async () => {
    const { page, close } = await mountInBrowser({
      entry: entry({ behaviour: "async () => false" }),
      css: PORTED_CSS,
    });
    try {
      await slide(page, 1);
      await page.waitForFunction(() => document.querySelector("[data-testid=dtc]")?.hasAttribute("data-failed"));
      expect(await state(page)).toBe("idle");
      expect(await page.getByTestId("dtc").textContent()).toContain("Not confirmed");
      expect(await page.locator('[role="status"]').textContent()).toBe("Not confirmed");
    } finally {
      await close();
    }
  });

  it("is not confirmed while the action is still pending (no spinner, a real label)", async () => {
    const { page, close } = await mountInBrowser({
      entry: entry({ behaviour: "() => new Promise(() => {})" }),
      css: PORTED_CSS,
    });
    try {
      await slide(page, 1);
      await page.waitForFunction(() => document.querySelector("[data-testid=dtc]")?.getAttribute("data-state") === "confirming");
      expect(await page.getByTestId("dtc").getAttribute("aria-busy")).toBe("true");
      expect(await page.getByTestId("dtc").textContent()).toContain("Confirming");
      expect(await page.getByTestId("dtc").locator("svg animate, svg animateTransform").count()).toBe(0);
    } finally {
      await close();
    }
  });

  it("auto-resets a non-money action when asked to", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ autoResetDelay: 150 }), css: PORTED_CSS });
    try {
      await slide(page, 1);
      await page.waitForFunction(() => document.querySelector("[data-testid=dtc]")?.getAttribute("data-state") === "confirmed");
      await page.waitForFunction(() => document.querySelector("[data-testid=dtc]")?.getAttribute("data-state") === "idle");
    } finally {
      await close();
    }
  });

  it("NEVER auto-resets money, even if a reset delay is passed", async () => {
    const { page, close } = await mountInBrowser({
      entry: entry({ money: true, autoResetDelay: 150 }),
      css: PORTED_CSS,
    });
    try {
      expect(await page.getByTestId("dtc").getAttribute("data-money")).toBe("true");
      await slide(page, 1);
      await page.waitForFunction(() => document.querySelector("[data-testid=dtc]")?.getAttribute("data-state") === "confirmed");
      await page.waitForTimeout(700);
      expect(await state(page)).toBe("confirmed");
    } finally {
      await close();
    }
  });

  it("still works under reduced motion, and settles instantly", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: PORTED_CSS, reducedMotion: true });
    try {
      await slide(page, 0.5);
      /* Let go short of the end: it is back at rest on the very next frame. */
      await page.waitForTimeout(60);
      expect(Math.abs(await handleX(page))).toBeLessThan(0.5);
      await slide(page, 1);
      await page.waitForFunction(() => document.querySelector("[data-testid=dtc]")?.getAttribute("data-state") === "confirmed");
      const max = (await page.getByTestId("dtc").boundingBox())!.width - 2 - 8 - 48;
      expect(Math.abs((await handleX(page)) - max)).toBeLessThan(1.5);
    } finally {
      await close();
    }
  });

  it("passes axe in both themes and both tones once the action has been refused, the refusal on the track", async () => {
    for (const tone of ["brand", "danger"]) {
      for (const theme of ["dark", "light"]) {
        const { page, close } = await mountInBrowser({
          entry: entry({ tone, behaviour: "async () => false" }),
          css: PORTED_CSS,
        });
        try {
          await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
          await slide(page, 1);
          await page.waitForFunction(() => document.querySelector("[data-testid=dtc]")?.hasAttribute("data-failed"));
          expect(await page.getByTestId("dtc").textContent()).toContain("Not confirmed");
          /* Past the settle, so axe reads the resting colours, not a blend. */
          await page.waitForTimeout(700);
          expect(await axeViolations(page), `${tone} ${theme} refused`).toEqual([]);
          /* The failure is carried by the edge as well as the words. */
          const edge = await page.getByTestId("dtc").evaluate((el) => {
            const probe = document.createElement("i");
            probe.style.color = "var(--nf-state-error)";
            document.body.append(probe);
            const want = getComputedStyle(probe).color;
            probe.remove();
            return getComputedStyle(el).borderTopColor === want;
          });
          expect(edge, `${tone} ${theme} edge`).toBe(true);
        } finally {
          await close();
        }
      }
    }
  });

  it("passes axe in both themes and both tones, rested and confirmed", async () => {
    for (const tone of ["brand", "danger"]) {
      for (const theme of ["dark", "light"]) {
        const { page, close } = await mountInBrowser({ entry: entry({ tone }), css: PORTED_CSS });
        try {
          await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
          expect(await axeViolations(page), `${tone} ${theme} rested`).toEqual([]);
          await slide(page, 1);
          await page.waitForFunction(() => document.querySelector("[data-testid=dtc]")?.getAttribute("data-state") === "confirmed");
          /* Past the settle, so axe reads the resting colours, not a blend. */
          await page.waitForTimeout(700);
          expect(await axeViolations(page), `${tone} ${theme} confirmed`).toEqual([]);
        } finally {
          await close();
        }
      }
    }
  });
});
