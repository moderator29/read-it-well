/**
 * THE CODE BOXES, mounted for real in Chromium (U1, 6 October): the sign-in
 * code screen (`CodeSignInForm`, by email) on the product's auth stylesheet,
 * with its two actions staged. What the person does and what they are told:
 *
 *   - a digit lands in the next box and Backspace takes the last one, and a
 *     caret put back in the middle of the invisible value returns to the end
 *     (so the boxes and the input never disagree about where a digit goes);
 *   - a paste of the whole code fills all six and sends the form ONCE;
 *   - a refused code stays, SELECTED, painted as selected on every box, so
 *     typing it again replaces it in one go; nothing marks a single digit,
 *     because the server answers for the whole code;
 *   - a screen reader meets one edit field named by its label, described by
 *     the code's length and how far it has got, and by the refusal when there
 *     is one; the six cells are not in the tree.
 *
 * Fixtures are slot words and a made-up address; the words are the English
 * dictionary's.
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

const CSS = productCss("app/css/auth.css");

const ENTRY = `
  import { getDictionary } from "@vallo/i18n";
  import { forAuth } from "@/components/auth/auth-copy";
  import { CodeSignInForm } from "@/components/auth/CodeSignInForm";
  import { mount } from "@/lib/testing/browser-root";
  mount(
    <main className="nf-auth nf-slate">
      <section className="nf-island nf-auth__island">
        <CodeSignInForm mode="email" t={forAuth(getDictionary("en"))} />
      </section>
    </main>
  );
`;

const ACTIONS = {
  sendEmailSignInCode: `async () => ({ step: "code", target: "slot@example.com", shown: "s***@example.com" })`,
  verifyEmailSignInCode: `async (_prev, form) => {
    window.__checked = (window.__checked || []).concat([String(form.get("code"))]);
    return { step: "code", target: "slot@example.com", shown: "s***@example.com", error: "wrongCode" };
  }`,
};

async function toCodeStep(page: Page): Promise<void> {
  await page.locator("input[name=email]").fill("slot@example.com");
  await page.locator("[data-testid=code-send-email]").click();
  await page.locator("input[name=code]").waitFor();
}

const filled = (page: Page) =>
  page.$$eval(".nf-code__cell", (cells) => cells.map((c) => (c.hasAttribute("data-filled") ? "x" : "-")).join(""));
const waiting = (page: Page) =>
  page.$$eval(".nf-code__cell", (cells) => cells.findIndex((c) => c.hasAttribute("data-next")));
const checked = (page: Page) => page.evaluate(() => (window as unknown as { __checked?: string[] }).__checked ?? []);

describe.skipIf(!hasBrowser && !process.env.CI)("the code boxes", () => {
  it("moves forward on a digit and back on Backspace, with the caret held at the end", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS, actions: ACTIONS });
    try {
      await toCodeStep(page);
      const input = page.locator("input[name=code]");
      await input.focus();
      expect(await waiting(page)).toBe(0);
      await page.keyboard.type("12");
      expect(await filled(page)).toBe("xx----");
      expect(await waiting(page)).toBe(2);
      await page.keyboard.press("Backspace");
      expect(await filled(page)).toBe("x-----");
      expect(await waiting(page)).toBe(1);
      await page.keyboard.type("23");
      /* A caret put back at the start (a tap on the first box, an arrow key)
         returns to the end: the next digit still lands in the next box. */
      await page.keyboard.press("Home");
      expect(await input.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])).toEqual([3, 3]);
      await page.keyboard.type("4");
      expect(await input.inputValue()).toBe("1234");
      await page.keyboard.press("Backspace");
      expect(await input.inputValue()).toBe("123");
      expect(await checked(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("takes a pasted code whole and sends it once", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS, actions: ACTIONS });
    try {
      await toCodeStep(page);
      await page.locator("input[name=code]").focus();
      /* The whole code arriving in ONE input event, as a paste, the phone's
         code suggestion or a password manager delivers it, spaces and all as
         a mail app copies it. (The test page is not a secure origin, so the
         clipboard itself is closed to it; the event is what the field sees.) */
      await page.keyboard.insertText(" 482 913 ");
      await page.waitForFunction(() => ((window as unknown as { __checked?: string[] }).__checked ?? []).length > 0);
      expect(await filled(page)).toBe("xxxxxx");
      /* Let anything that would send it a second time have its chance. */
      await page.waitForTimeout(400);
      expect(await checked(page)).toEqual(["482913"]);
    } finally {
      await close();
    }
  });

  it("keeps a refused code, selected, so it can be typed again in one go, and marks no single digit", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS, actions: ACTIONS });
    try {
      await toCodeStep(page);
      const input = page.locator("input[name=code]");
      await input.focus();
      await page.keyboard.type("111111");
      await page.locator(".nf-code [role=alert]").waitFor();
      expect(await input.inputValue()).toBe("111111");
      await page.waitForFunction(() => {
        const el = document.querySelector<HTMLInputElement>("input[name=code]")!;
        return document.activeElement === el && el.selectionStart === 0 && el.selectionEnd === 6;
      });
      /* Every box is drawn selected; the row is in error; no box alone is. */
      expect(
        await page.$$eval(".nf-code__cell", (cells) => cells.every((c) => c.hasAttribute("data-selected"))),
      ).toBe(true);
      expect(await page.locator(".nf-code[data-error]").count()).toBe(1);
      /* Typing replaces the whole code: one digit, then the rest. */
      await page.keyboard.type("2");
      expect(await input.inputValue()).toBe("2");
      expect(await page.locator(".nf-code__cell[data-selected]").count()).toBe(0);
      await page.keyboard.type("22222");
      await page.waitForFunction(() => ((window as unknown as { __checked?: string[] }).__checked ?? []).length === 2);
      expect(await checked(page)).toEqual(["111111", "222222"]);
    } finally {
      await close();
    }
  });

  it("is one named, described edit field to a screen reader, and the refusal joins its description", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS, actions: ACTIONS });
    try {
      await toCodeStep(page);
      const tree = async () => {
        const cdp = await page.context().newCDPSession(page);
        const { nodes } = (await cdp.send("Accessibility.getFullAXTree")) as {
          nodes: Array<{ ignored?: boolean; role?: { value?: string }; name?: { value?: string }; description?: { value?: string } }>;
        };
        await cdp.detach();
        return nodes.filter((n) => !n.ignored && n.role?.value === "textbox");
      };
      const before = await tree();
      expect(before).toHaveLength(1);
      expect(before[0]!.name?.value).toBe("6-digit code");
      expect(before[0]!.description?.value).toBe("six digit code. 0 of 6 in");
      await page.locator("input[name=code]").focus();
      await page.keyboard.type("123");
      expect((await tree())[0]!.description?.value).toBe("six digit code. 3 of 6 in");
      await page.keyboard.type("456");
      await page.locator(".nf-code [role=alert]").waitFor();
      const after = await tree();
      expect(after).toHaveLength(1);
      expect(after[0]!.description?.value).toContain("6 of 6 in");
      expect(after[0]!.description?.value).toContain(
        await page.locator(".nf-code [role=alert]").textContent().then((t) => t ?? "-"),
      );
    } finally {
      await close();
    }
  });
});
