/**
 * The reset code, mounted for real in Chromium (R3-09): the same cells as
 * every other code on the auth screens, over the one real input the phone
 * fills from the email, sent once the code is whole, and a refused code
 * shaking the row and saying so under it. The action is a stand-in that
 * records what it was sent; the words are the real English dictionary.
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

const CSS = productCss("app/css/auth.css");

const ENTRY = `
  import { getDictionary } from "@vallo/i18n";
  import { forAuth } from "@/components/auth/auth-copy";
  import { ResetCodeForm } from "@/components/auth/ResetCodeForm";
  import { mount } from "@/lib/testing/browser-root";
  window.__sent = [];
  const verify = async (_prev, form) => {
    window.__sent.push([form.get("email"), form.get("code")]);
    return { ok: false, fieldErrors: { code: "That code did not work." } };
  };
  mount(
    <div className="nf-auth nf-slate">
      <ResetCodeForm t={forAuth(getDictionary("en"))} verify={verify} initialEmail="ada@example.com" />
    </div>
  );
`;

describe.skipIf(!hasBrowser && !process.env.CI)("ResetCodeForm", () => {
  it("draws the code as six cells over one real one-time-code input", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await page.locator(".nf-code").waitFor();
      expect(await page.locator(".nf-code__cell").count()).toBe(6);
      const input = page.locator("input[name=code]");
      expect(await input.count()).toBe(1);
      expect(await input.getAttribute("autocomplete")).toBe("one-time-code");
      expect(await input.getAttribute("inputmode")).toBe("numeric");
      /* The cells are a picture of the value; the label names the field. */
      expect(await page.getByLabel("Code", { exact: true }).count()).toBe(1);
    } finally {
      await close();
    }
  });

  it("sends itself once the code is whole, and a refusal shakes the row and says so under it", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await page.locator("input[name=code]").fill("123456");
      await page.waitForFunction(() => (window as unknown as { __sent: unknown[] }).__sent.length === 1);
      expect(await page.evaluate(() => (window as unknown as { __sent: unknown[] }).__sent)).toEqual([
        ["ada@example.com", "123456"],
      ]);
      await page.locator(".nf-code__box[data-shake]").waitFor();
      const error = page.locator(".nf-code .nf-slate-field__error");
      expect(await error.textContent()).toBe("That code did not work.");
      expect(await page.locator("input[name=code]").getAttribute("aria-invalid")).toBe("true");
    } finally {
      await close();
    }
  });
});
