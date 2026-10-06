/**
 * The lock, mounted for real in Chromium, for what only a live page shows
 * (the independent audit of 6 October 2026):
 *
 *   - a digit typed on the biometric door is the person choosing the keypad,
 *     and it lands as the code's first digit (the keypad's own listener does
 *     not exist until the keypad is drawn, so it used to do nothing);
 *   - choosing "Enter your passcode instead" puts focus on the first key,
 *     not on <body> inside a modal;
 *   - on a locked cold start the lock waits for the startup's door before it
 *     takes the top layer (D32), and holds focus while it waits.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const entry = (passkey: boolean) => `
  import { getDictionary } from "@vallo/i18n";
  import { PasscodeLock } from "@/components/passcode/PasscodeLock";
  import { mount } from "@/lib/testing/browser-root";
  mount(
    <PasscodeLock
      copy={getDictionary("en").passcode}
      locale="en"
      mode="code"
      length={4}
      name="Ada"
      passkey={${passkey}}
      verify={() => new Promise(() => {})}
    />,
  );
`;

const modal = `document.querySelector('[data-testid="passcode-lock"]').matches(":modal")`;

describe.skipIf(!hasBrowser && !process.env.CI)("the passcode lock, in a browser", () => {
  it("a digit typed on the biometric door switches to the keypad and lands as the first digit", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(true) });
    try {
      expect(await page.locator('[data-testid="passcode-keypad"]').count()).toBe(0);
      await page.keyboard.press("3");
      await page.waitForSelector('[data-testid="passcode-keypad"]');
      expect(await page.locator(".nf-passcode__dot--on").count()).toBe(1);
      /* Focus stays inside the lock, never on <body>. */
      expect(await page.evaluate(() => document.activeElement?.closest('[data-testid="passcode-lock"]') !== null)).toBe(true);
    } finally {
      await close();
    }
  });

  it("choosing the keypad puts focus on its first key", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(true) });
    try {
      await page.getByTestId("passcode-use-keypad").focus();
      await page.keyboard.press("Enter");
      await page.waitForSelector('[data-testid="passcode-keypad"]');
      await page.waitForFunction(() => document.activeElement?.textContent === "1");
    } finally {
      await close();
    }
  });

  it("becomes modal at once when there is no startup on screen", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(false) });
    try {
      await page.waitForFunction(modal);
    } finally {
      await close();
    }
  });

  it("on a locked cold start, waits for the startup's door before taking the top layer, holding focus meanwhile", async () => {
    const { page, close } = await mountInBrowser({
      entry: entry(false),
      init: `
        document.documentElement.dataset.splash = "on";
        const outside = document.createElement("button");
        outside.id = "outside";
        outside.textContent = "Rail";
        document.body.prepend(outside);
      `,
    });
    try {
      await page.waitForTimeout(300);
      /* Drawn and open (it covers the screen), but not yet in the top layer,
         so the startup's overlay stays above it. */
      expect(await page.evaluate(`document.querySelector('[data-testid="passcode-lock"]').open`)).toBe(true);
      expect(await page.evaluate(modal)).toBe(false);
      /* The shell beside it is inert, so a screen reader's double-tap cannot
         reach a dock link behind a lock that is not modal yet. */
      expect(await page.evaluate(() => (document.getElementById("outside") as HTMLElement).inert)).toBe(true);
      /* Focus that strays to the shell behind is brought back. */
      await page.focus("#outside");
      expect(await page.evaluate(() => document.activeElement?.id === "outside")).toBe(false);
      expect(await page.evaluate(() => document.activeElement?.closest('[data-testid="passcode-lock"]') !== null)).toBe(true);
      /* The door has opened and the startup lets go: the lock is modal. */
      await page.evaluate(() => {
        document.documentElement.dataset.splash = "done";
      });
      await page.waitForFunction(modal);
      /* ...and the shell is given back: what the lock shelved, it returns. */
      expect(await page.evaluate(() => (document.getElementById("outside") as HTMLElement).inert)).toBe(false);
    } finally {
      await close();
    }
  });
});
