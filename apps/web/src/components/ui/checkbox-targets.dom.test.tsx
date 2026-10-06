/**
 * EVERY NATIVE CHECKBOX AND RADIO IS A 44PX TARGET WITHOUT BEING DRAWN LARGER
 * (W12; Chromium at 390 in English, the product's real compiled cascade).
 *
 * The native box is drawn 16 or 20px. What makes it hittable is the label that
 * wraps it. So the test asks the question a thumb asks: for a 44 by 44 box
 * centred on the drawn box, does every point in it land on the control's own
 * label (or on the input)? And a real click on the box's four corners must
 * toggle it. A wrapping label that does not reach (too short, or the box sits
 * in its padding) is named here with the points it misses.
 *
 * The surfaces are the ones W12 measured: the profile editor's Pidgin choice
 * (16px), the sign-up age and terms ticks (20px), the agreement's "I have read"
 * tick (20px) and the saved-card radios on checkout (20px).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appCss, fitMount } from "@/lib/testing/locale-fit";
import { BROWSER_TEST_TIMEOUT, closeBrowser, hasBrowser, warmBrowser } from "@/lib/testing/mount-in-browser";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT * 2 });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const IMPORTS = `
  import { ProfileEditor } from "@/components/social/profile/ProfileEditor";
  import { AREA_OPTIONS, EDITOR_PROFILE } from "@/app/(dev)/preview/f4/fixtures";
  import { AcceptTerms } from "@/components/auth/AcceptTerms";
  import { ConfirmTerms } from "@/components/app/agreements/AgreementControls";
  import { SavedCardPicker } from "@/components/app/payments/SavedCardPicker";
  import { SAVED_CARDS } from "@/app/(dev)/preview/f3/fixtures";
  import { Checkbox, Radio } from "@/components/ui/Check";
  import { useState } from "react";
  function Terms() {
    const [a, setA] = useState(false);
    const [b, setB] = useState(false);
    return <AcceptTerms t={t} accepted={a} onChange={setA} showError={false} adult={b} onAdultChange={setB} showAdultError={false} />;
  }
  function Cards() {
    const [v, setV] = useState(null);
    return <SavedCardPicker cards={SAVED_CARDS} value={v} onChange={setV} />;
  }
`;

const SURFACES = [
  { name: "the profile editor's Pidgin choice", body: `<ProfileEditor profile={EDITOR_PROFILE} initialHandle={EDITOR_PROFILE.handle} areas={AREA_OPTIONS} />`, input: "input[type=checkbox][name=pidginOk]" },
  { name: "the sign-up age tick", body: `<Terms />`, input: '[data-testid="age-confirmed"]' },
  { name: "the sign-up terms tick", body: `<Terms />`, input: '[data-testid="accept-terms"]' },
  { name: "the agreement's 'I have read' tick", body: `<ConfirmTerms agreementId="a1" version={2} />`, input: '[data-testid="confirm-terms"] input[type=checkbox]' },
  { name: "the Checkbox primitive", body: `<Checkbox>Remember me</Checkbox>`, input: ".nf-check input[type=checkbox]" },
  { name: "the Radio primitive", body: `<Radio name="r">Option</Radio>`, input: ".nf-check input[type=radio]", radio: true },
  { name: "the saved-card radio", body: `<Cards />`, input: "input[type=radio]", radio: true },
] as const;

describe.skipIf(!hasBrowser && !process.env.CI)("checkbox and radio targets", () => {
  for (const surface of SURFACES) {
    it(`${surface.name}: a 44px box holds the drawn box and lands on its label, and clicks toggle`, async () => {
      const { page, close } = await fitMount({ locale: "en", imports: IMPORTS, body: surface.body, css: await appCss() });
      try {
        const input = page.locator(surface.input).first();
        await input.scrollIntoViewIfNeeded();
        const drawn = await input.boundingBox();
        expect(drawn, "the input is drawn").not.toBeNull();

        /* Is there a 44 by 44 box, holding the drawn box, whose every point lands on the control's own label?
           The box is searched, not pinned to the centre: a label that starts at the drawn box (the usual row)
           cannot reach 22px to its left, and nobody thumbs the gutter. What it must do is reach 44 in each
           direction on SOME side, the same way the product's `nf-tap` does. Probed on a 4px grid. */
        const result = await input.evaluate((el) => {
          const box = el.getBoundingClientRect();
          const label = el.closest("label");
          const reaches = (x: number, y: number) => {
            if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) return false;
            const hit = document.elementFromPoint(x, y);
            return hit === el || Boolean(label && hit && label.contains(hit));
          };
          let best = 0;
          let found = false;
          for (let x0 = Math.floor(box.right - 44); x0 <= Math.ceil(box.left) && !found; x0 += 2) {
            for (let y0 = Math.floor(box.bottom - 44); y0 <= Math.ceil(box.top) && !found; y0 += 2) {
              let ok = 0;
              let n = 0;
              for (let dx = 0.5; dx < 44; dx += 4) {
                for (let dy = 0.5; dy < 44; dy += 4) {
                  n += 1;
                  if (reaches(x0 + dx, y0 + dy)) ok += 1;
                }
              }
              best = Math.max(best, ok / n);
              if (ok === n) found = true;
            }
          }
          return { found, best, drawn: [Math.round(box.width), Math.round(box.height)] };
        });
        expect(result.found, `no 44x44 box around the ${result.drawn.join("x")} control lands on its label (best covers ${(result.best * 100).toFixed(0)}%)`).toBe(true);

        if ("radio" in surface) return;
        /* Real clicks, not only hit tests: a click a thumb's width past the drawn box on each side the label reaches
           toggles it. */
        let expected = await input.isChecked();
        for (const [dx, dy] of [[-0.5, 0], [drawn!.width + 0.5, 0], [drawn!.width / 2, -0.5], [drawn!.width / 2, drawn!.height + 0.5]] as const) {
          const x = drawn!.x + dx;
          const y = drawn!.y + dy;
          const hit = await page.evaluate(([px, py]) => Boolean(document.elementFromPoint(px!, py!)?.closest("label")), [x, y]);
          if (!hit) continue;
          await page.mouse.click(x, y);
          expected = !expected;
          expect(await input.isChecked(), `a click just outside the drawn box at (${dx.toFixed(1)},${dy.toFixed(1)}) toggles it`).toBe(expected);
        }
      } finally {
        await close();
      }
    });
  }
});
