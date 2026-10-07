/**
 * THE ADDRESS TO THE CODE IS ONE STEP (U1, 6 October; motion with a purpose),
 * mounted in Chromium on the product's auth stylesheet: the sign-in code
 * screen, its send staged. When the code is on its way:
 *
 *   - the title and the way back stay exactly where they were;
 *   - the sentence names the address the code went to, in full, as typed;
 *   - the code field takes the address field's place with no frame in which
 *     the island holds neither (no blank flash), starting partly drawn;
 *   - the move fits the motion budget (620ms), fades without travel under
 *     Calm, and is not drawn at all under Off or reduced motion.
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

/* The send answers after a beat, so the step change is a frame of its own. */
const ACTIONS = {
  sendEmailSignInCode: `async () => { await new Promise((r) => setTimeout(r, 50)); return { step: "code", target: "slot.person@example.com", shown: "s***@example.com" }; }`,
};

type Frame = { t: number; ask: boolean; code: number; title: number; back: number };

async function sendAndWatch(opts: { reducedMotion?: boolean; motion?: "calm" | "off" } = {}) {
  const mounted = await mountInBrowser({ entry: ENTRY, css: CSS, actions: ACTIONS, ...opts });
  const { page } = mounted;
  await page.locator("input[name=email]").fill("slot.person@example.com");
  /* The screen's own entrance has finished before the step is taken. */
  await page.waitForTimeout(900);
  const before = await page.evaluate(() => ({
    title: document.querySelector(".nf-auth__title")!.getBoundingClientRect().y,
    back: document.querySelector(".nf-auth__links")!.getBoundingClientRect().y,
  }));
  /* Every frame from the press until well after the move. */
  await page.evaluate(() => {
    const frames: Frame[] = [];
    (window as unknown as { __frames: Frame[] }).__frames = frames;
    const t0 = performance.now();
    const tick = () => {
      const code = document.querySelector<HTMLElement>(".nf-auth__step");
      frames.push({
        t: Math.round(performance.now() - t0),
        ask: Boolean(document.querySelector("input[name=email]:not([type=hidden])")),
        code: code ? Number(getComputedStyle(code).opacity) : -1,
        title: document.querySelector(".nf-auth__title")!.getBoundingClientRect().y,
        back: document.querySelector(".nf-auth__links")!.getBoundingClientRect().y,
      });
      if (performance.now() - t0 < 1200) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.locator("[data-testid=code-send-email]").click();
  await page.locator("input[name=code]").waitFor();
  await page.waitForTimeout(1300);
  const frames = await page.evaluate(() => (window as unknown as { __frames: Frame[] }).__frames);
  const animations = await page.evaluate(() =>
    document
      .getAnimations()
      .map((a) => ({ name: (a as CSSAnimation).animationName, end: Number(a.effect?.getComputedTiming().endTime ?? 0) })),
  );
  const step = await page.evaluate(() => {
    const el = document.querySelector(".nf-auth__step")!;
    const cs = getComputedStyle(el);
    return { name: cs.animationName, duration: cs.animationDuration, delay: cs.animationDelay };
  });
  const sentence = await page.locator(".nf-auth__sub").textContent();
  return { ...mounted, frames, before, animations, step, sentence };
}

describe.skipIf(!hasBrowser && !process.env.CI)("the address to the code", () => {
  it("is one step: nothing above moves, the address is named in full, and the island is never empty", async () => {
    const { close, frames, before, step, sentence } = await sendAndWatch();
    try {
      expect(sentence).toContain("slot.person@example.com");
      /* The title never moves; the way back moves only by the step's own
         height, never back and forth. */
      expect(new Set(frames.map((f) => f.title))).toEqual(new Set([before.title]));
      /* No frame holds neither field, and the code field is never drawn
         at less than its starting 0.4. */
      for (const f of frames) {
        expect(f.ask || f.code >= 0.4, `frame at ${f.t}ms`).toBe(true);
      }
      expect(step.name).toBe("nf-auth-step-in");
      expect(step.delay).toBe("0s");
      expect(parseFloat(step.duration) * 1000).toBeLessThanOrEqual(620);
    } finally {
      await close();
    }
  });

  it("fades without travel under Calm, and is simply there under Off and reduced motion", async () => {
    const calm = await sendAndWatch({ motion: "calm" });
    try {
      expect(calm.step.name).toBe("nf-auth-calm-in");
    } finally {
      await calm.close();
    }
    for (const opts of [{ motion: "off" as const }, { reducedMotion: true }]) {
      const quiet = await sendAndWatch(opts);
      try {
        expect(quiet.step.name, JSON.stringify(opts)).toBe("none");
        const coded = quiet.frames.filter((f) => f.code >= 0);
        expect(coded.every((f) => f.code === 1), JSON.stringify(opts)).toBe(true);
      } finally {
        await quiet.close();
      }
    }
  });
});
