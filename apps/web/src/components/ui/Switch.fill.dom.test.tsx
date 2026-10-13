/**
 * THE SWITCH FADES ITS FILL IN; IT DOES NOT SNAP (auditor A8), MOUNTED FOR REAL
 * (Chromium, the product's tokens and controls.css).
 *
 * The "on" fill lives on the `::before` layer so that only that layer's
 * opacity transitions. An older rule had set `background` on the element
 * itself when it was on, which cannot interpolate, so the track jumped to the
 * fill while the layer faded in over it. The test reads the element's OWN
 * background at the moment the `::before` fade is created and asks that it is
 * still the off track, then that the layer arrives at full opacity.
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

const CSS = productCss("app/css/controls.css");

const entry = `
  import { useState } from "react";
  import { mount } from "@/lib/testing/browser-root";
  import { Switch } from "@/components/ui/Switch";
  function Harness() {
    const [on, setOn] = useState(false);
    return <Switch checked={on} onCheckedChange={setOn} aria-label="Alerts" />;
  }
  mount(<div style={{ padding: 16 }}><Harness /></div>);
`;

describe.skipIf(!hasBrowser && !process.env.CI)("the switch's on fill", () => {
  it("keeps the element's own background as the off track while the fill fades in", async () => {
    for (const theme of ["dark", "light"]) {
      const { page, close } = await mountInBrowser({ entry, css: CSS });
      try {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        const toggle = page.getByRole("switch", { name: "Alerts" });
        const off = await toggle.evaluate((el) => {
          const style = getComputedStyle(el);
          return { image: style.backgroundImage, colour: style.backgroundColor };
        });
        expect(await toggle.getAttribute("aria-checked")).toBe("false");
        expect(await toggle.evaluate((el) => getComputedStyle(el, "::before").opacity)).toBe("0");

        /* Turn it on, and read the element when the layer's fade is created. */
        const duringFade = toggle.evaluate(
          (el) =>
            new Promise<{ image: string; colour: string }>((resolve) => {
              el.addEventListener(
                "transitionrun",
                (event) => {
                  if ((event as TransitionEvent).pseudoElement !== "::before") return;
                  const style = getComputedStyle(el);
                  resolve({ image: style.backgroundImage, colour: style.backgroundColor });
                },
                { once: false },
              );
            }),
        );
        await toggle.click();
        const during = await duringFade;
        expect(await toggle.getAttribute("aria-checked")).toBe("true");
        expect(during, `${theme}: the element's own background does not jump to the fill`).toEqual(off);
        await expect
          .poll(() => toggle.evaluate((el) => getComputedStyle(el, "::before").opacity), { message: theme })
          .toBe("1");
        /* And it still has not been painted onto the element itself. */
        expect(
          await toggle.evaluate((el) => {
            const style = getComputedStyle(el);
            return { image: style.backgroundImage, colour: style.backgroundColor };
          }),
          theme,
        ).toEqual(off);
      } finally {
        await close();
      }
    }
  });
});
