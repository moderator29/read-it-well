/**
 * The pay stage, mounted in Chromium with the product's stylesheets, read from
 * computed animations rather than a clock (round 5, money being committed):
 *
 *   - one container: the dialog element the tap opened is the one that says
 *     "paid" or "failed";
 *   - the sequence: grows out of the tapped control (land 620), each new
 *     verdict fades in, the payoff holds the halo and the amount still, pops
 *     at 620ms for 180ms, and prints the receipt at 800ms;
 *   - a failure is a cut, with one error pattern and nothing animating;
 *   - haptics: nothing while waiting, one success at the seal, one error;
 *   - the quiet answer: a 160ms fade per face, the payoff settled;
 *   - and, through the real PayPanel, that the success face cannot appear
 *     until the server's answer says the charge settled against this booking.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Page } from "playwright-core";
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

const WEB = join(__dirname, "..", "..", "..", "..");
const css = (...p: string[]) => readFileSync(join(WEB, ...p), "utf8");
const CSS = [
  css("..", "..", "packages", "design-tokens", "src", "tokens.css"),
  "*, ::before, ::after { box-sizing: border-box; } body { margin: 0; font-family: sans-serif; background: var(--nf-surface-canvas); color: var(--nf-content-primary); }",
  ".sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}",
  css("src", "app", "css", "overlays.css"),
  css("src", "app", "css", "buttons.css"),
  css("src", "app", "css", "money-surface.css"),
  css("src", "app", "css", "success.css"),
  css("src", "app", "css", "pay-stage.css"),
].join("\n");

/* Every vibration the page asks for, in order (Android web's channel). */
const BUZZ = `
  Object.defineProperty(navigator, "vibrate", { configurable: true, value: (p) => { (window.__buzz = window.__buzz || []).push(p); return true; } });
`;

const STAGE = `
  import { useState } from "react";
  import { mount } from "@/lib/testing/browser-root";
  import { PaymentStage, stageOrigin } from "@/components/app/payments/PaymentStage";
  const steps = (a, b) => [
    { key: "o", label: "Opening your payment page", state: a },
    { key: "c", label: "Confirming your payment", state: b },
    { key: "r", label: "Payment received", state: "waiting" },
  ];
  const FACES = {
    committing: { at: "committing", verdict: "Opening your payment page", consequence: "Nothing has been charged yet.", steps: steps("active", "waiting"), note: "A payment is only ever recorded once." },
    processing: { at: "processing", verdict: "Confirming your payment", consequence: "Checking with the payment service.", steps: steps("done", "active"), note: "A payment is only ever recorded once." },
    paid: { at: "paid", settled: true, moment: { title: "Stay paid", body: "Your payment is in and these dates are confirmed.", details: [{ label: "Reference", value: "rm-book-7f3a9c21e4", mono: true }], primary: { label: "See your stays", href: "/bookings" } } },
    failed: { at: "failed", verdict: "Payment not completed", consequence: "Nothing has been taken from your card or your account.", actions: [{ label: "Try again", tone: "primary", onClick: () => { window.__retried = true; } }] },
  };
  function Harness() {
    const [at, setAt] = useState(null);
    const [origin, setOrigin] = useState(null);
    window.__go = setAt;
    return (
      <>
        <button id="pay" style={{ position: "fixed", right: 16, bottom: 24, width: 140, height: 48 }}
          onClick={(e) => { setOrigin(stageOrigin(e.currentTarget)); setAt("committing"); }}>Pay</button>
        <PaymentStage face={at ? FACES[at] : null} amount={{ minorUnits: 36000000 }} origin={origin} onClose={() => setAt(null)} />
      </>
    );
  }
  mount(<Harness />);
`;

type Motion = { name: string; duration: string; delay: string; iterations: string };
const motion = (page: Page, sel: string) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      name: cs.animationName,
      duration: cs.animationDuration,
      delay: cs.animationDelay,
      iterations: cs.animationIterationCount,
    } as Motion;
  }, sel);
const go = (page: Page, at: string) => page.evaluate((a) => (window as unknown as { __go(a: string): void }).__go(a), at);
const buzz = (page: Page) => page.evaluate(() => (window as unknown as { __buzz?: unknown[] }).__buzz ?? []);
/* Tag the dialog the tap opened; the same tag must still be there later. */
const tagDialog = (page: Page) =>
  page.evaluate(() => {
    (document.querySelector("[role=dialog]") as HTMLElement).dataset.firstOpened = "yes";
  });
const sameDialog = (page: Page) =>
  page.evaluate(() => (document.querySelector("[role=dialog]") as HTMLElement | null)?.dataset.firstOpened === "yes");

describe.skipIf(!hasBrowser && !process.env.CI)("PaymentStage", () => {
  it("is one container: committing grows out of the button, processing ticks, paid pops and prints, in that order", async () => {
    const { page, close } = await mountInBrowser({ entry: STAGE, css: CSS, init: BUZZ });
    try {
      await page.locator("#pay").click();
      await page.waitForSelector('.nf-pay-stage__face[data-at="committing"]');
      await tagDialog(page);

      /* COMMITTING: the face grows from the tapped control, deliberately. */
      expect(await motion(page, ".nf-pay-stage__face")).toMatchObject({ name: "nf-pay-grow", duration: "0.62s", iterations: "1" });
      const grownFrom = await page.evaluate(() => {
        const face = document.querySelector(".nf-pay-stage__face") as HTMLElement;
        const [, y] = getComputedStyle(face).transformOrigin.split(" ").map(parseFloat);
        return { y: y!, half: face.offsetHeight / 2 };
      });
      /* The button sits at the foot of the screen, so the growth's origin is
         in the lower half of the face, not its centre. */
      expect(grownFrom.y).toBeGreaterThan(grownFrom.half);
      expect(await motion(page, ".nf-pay-stage__title")).toMatchObject({ name: "nf-pay-fade", duration: "0.24s" });
      expect(await page.locator(".nf-success__seal").count()).toBe(0);

      /* PROCESSING: the same card; step one ticks because it completed. */
      await go(page, "processing");
      await page.waitForSelector('.nf-pay-stage__face[data-at="processing"]');
      expect(await sameDialog(page)).toBe(true);
      expect((await motion(page, ".nf-pay-stage__face"))!.name).toBe("none");
      expect((await motion(page, ".nf-pay-stage__title"))!.name).toBe("nf-pay-fade");
      expect((await motion(page, '.nf-paysteps__step[data-state="done"] .nf-paysteps__mark > *'))!.name).toBe("nf-paysteps-tick");
      const amountBefore = await page.getByTestId("pay-stage-amount").textContent();

      /* PAID: the same card again. Animated from its first frame (no flash
         of the settled picture), the halo and the amount still. */
      await go(page, "paid");
      await page.waitForSelector(".nf-success[data-staged]");
      expect(await sameDialog(page)).toBe(true);
      expect(await page.locator(".nf-success[data-staged]").getAttribute("data-quiet")).toBe("false");
      expect((await motion(page, ".nf-success__halo"))!.name).toBe("none");
      expect((await motion(page, ".nf-success__amount"))!.name).toBe("none");
      expect(await page.locator(".nf-success__amount").textContent()).toBe(amountBefore);
      expect(await motion(page, ".nf-success__pop")).toMatchObject({ name: "nf-success-land", duration: "0.62s" });
      expect(await motion(page, ".nf-success__payoff")).toEqual({ name: "nf-success-payoff", duration: "0.18s", delay: "0.62s", iterations: "1" });
      expect((await motion(page, ".nf-success__title"))!.name).toBe("nf-pay-fade");
      expect(await motion(page, ".nf-success__facts")).toMatchObject({ name: "nf-pay-print", delay: "0.8s", duration: "0.38s" });
      expect((await motion(page, ".nf-success__actions"))!.delay).toBe("0.86s");

      /* Haptics: nothing while committed or processing; ONE success pattern,
         felt with the seal at 620ms. */
      expect(await buzz(page)).toEqual([]);
      await page.waitForFunction(() => ((window as unknown as { __buzz?: unknown[] }).__buzz ?? []).length > 0, null, { timeout: 3000 });
      await page.waitForTimeout(300);
      expect(await buzz(page)).toEqual([[14, 70, 28]]);
      /* And the answer takes focus: what to do next. */
      await page.waitForFunction(() => document.activeElement?.textContent === "See your stays");
    } finally {
      await close();
    }
  });

  it("cuts to a failure: nothing animates, the card does not travel, one error pattern, the next action first", async () => {
    const { page, close } = await mountInBrowser({ entry: STAGE, css: CSS, init: BUZZ });
    try {
      await page.locator("#pay").click();
      await page.waitForSelector('.nf-pay-stage__face[data-at="committing"]');
      await tagDialog(page);
      await go(page, "failed");
      await page.waitForSelector('.nf-pay-stage__face[data-at="failed"]');
      expect(await sameDialog(page)).toBe(true);
      expect((await motion(page, ".nf-pay-stage__title"))!.name).toBe("none");
      const surface = await page.evaluate(() => {
        const d = document.querySelector("[role=dialog]")!;
        const cs = getComputedStyle(d);
        return { cut: d.classList.contains("nf-pay-stage--cut"), transform: cs.transform, property: cs.transitionProperty, duration: cs.transitionDuration };
      });
      expect(surface).toEqual({ cut: true, transform: "none", property: "opacity", duration: "0.16s" });
      expect(await page.getByRole("alert").textContent()).toContain("Payment not completed");
      expect(await page.locator(".nf-success__halo").count()).toBe(0);
      await page.waitForFunction(() => document.activeElement?.textContent === "Try again");
      expect(await buzz(page)).toEqual([[40, 60, 40, 60, 40]]);
    } finally {
      await close();
    }
  });

  it("under reduced motion tells the same order quietly: no growth, a 160ms fade per face, the payoff settled", async () => {
    const { page, close } = await mountInBrowser({ entry: STAGE, css: CSS, init: BUZZ, reducedMotion: true });
    try {
      await page.locator("#pay").click();
      await page.waitForSelector('.nf-pay-stage__face[data-at="committing"]');
      expect((await motion(page, ".nf-pay-stage__face"))!.name).toBe("none");
      expect(await motion(page, ".nf-pay-stage__title")).toMatchObject({ name: "nf-pay-fade", duration: "0.16s" });
      expect(
        await page.evaluate(() => getComputedStyle(document.querySelector("[role=dialog]")!).transitionDuration),
      ).toBe("0.16s");
      await go(page, "processing");
      await page.waitForSelector('.nf-pay-stage__face[data-at="processing"]');
      expect(await motion(page, ".nf-pay-stage__title")).toMatchObject({ name: "nf-pay-fade", duration: "0.16s" });
      await go(page, "paid");
      await page.waitForSelector(".nf-success[data-staged]");
      expect(await page.locator(".nf-success[data-staged]").getAttribute("data-quiet")).toBe("true");
      expect((await motion(page, ".nf-success__payoff"))!.name).toBe("none");
      expect((await motion(page, ".nf-success__pop"))!.name).toBe("none");
      expect(await motion(page, ".nf-success__title")).toMatchObject({ name: "nf-pay-fade", duration: "0.16s" });
      /* The seal is there, settled: "done" is still said. */
      expect(await page.locator(".nf-success__seal").count()).toBe(1);
      /* Felt at once rather than at 620ms, and only the outcome. */
      await page.waitForFunction(() => ((window as unknown as { __buzz?: unknown[] }).__buzz ?? []).length > 0, null, { timeout: 1000 });
      expect(await buzz(page)).toEqual([[14, 70, 28]]);
    } finally {
      await close();
    }
  });
});

/* ---------------------------------------------------------------- PayPanel */

const PANEL = `
  import { mount } from "@/lib/testing/browser-root";
  import { getDictionary } from "@vallo/i18n";
  import { CopyScope } from "@/lib/i18n/copy-scope";
  import { copyScopeOf } from "@/lib/i18n/copy-scope-of";
  import { PayPanel } from "@/app/(app)/checkout/[bookingId]/PayPanel";
  import { CHECKOUT, SAVED_CARDS } from "@/app/(dev)/preview/f3/fixtures";
  mount(
    <CopyScope copy={copyScopeOf(getDictionary("en"), ["checkout", "success"])}>
      <PayPanel
        view={CHECKOUT}
        savedCards={SAVED_CARDS}
        chargeSavedCard={() => new Promise((resolve) => { window.__answer = resolve; })}
        plansAction={{ label: "See your stays", href: "/bookings" }}
      />
    </CopyScope>
  );
`;

const answer = (page: Page, value: unknown) =>
  page.evaluate((v) => (window as unknown as { __answer(v: unknown): void }).__answer(v), value);
const successDrawn = (page: Page) =>
  page.evaluate(() => document.querySelectorAll(".nf-success__seal, .nf-success[data-staged], [data-testid=success-title]").length);

async function payWithSavedCard(page: Page) {
  await page.getByRole("button", { name: "Pay with this card" }).first().click();
  await page.waitForSelector('.nf-pay-stage__face[data-at="committing"]');
  await tagDialog(page);
}

describe.skipIf(!hasBrowser && !process.env.CI)("PayPanel on the pay stage", () => {
  it("never draws the success before the server says the charge settled against this booking", async () => {
    const { page, close } = await mountInBrowser({ entry: PANEL, css: CSS, init: BUZZ });
    try {
      await payWithSavedCard(page);
      /* The charge is in flight: committed, nothing celebrated, for as long
         as the server takes. */
      await page.waitForTimeout(900);
      expect(await successDrawn(page)).toBe(0);
      /* Charged but not applied to this booking: still not a success. */
      await answer(page, { ok: true, data: { kind: "charged", reference: "rm-pay-1", settled: false } });
      await page.waitForSelector('.nf-pay-stage__face[data-at="unknown"]');
      await page.waitForTimeout(900);
      expect(await successDrawn(page)).toBe(0);
      expect(await sameDialog(page)).toBe(true);
    } finally {
      await close();
    }
  });

  it("turns the card the tap opened into the receipt once the server says settled", async () => {
    const { page, close } = await mountInBrowser({ entry: PANEL, css: CSS, init: BUZZ });
    try {
      await payWithSavedCard(page);
      expect(await page.getByTestId("pay-stage-amount").textContent()).toContain("360,000");
      await answer(page, { ok: true, data: { kind: "charged", reference: "rm-pay-2", settled: true } });
      await page.waitForSelector(".nf-success[data-staged] .nf-success__seal");
      expect(await sameDialog(page)).toBe(true);
      expect(await page.locator(".nf-success__mono").textContent()).toBe("rm-pay-2");
      expect(await page.locator(".nf-success__amount").textContent()).toContain("360,000");
    } finally {
      await close();
    }
  });

  it("cuts the same card to the failure when the charge is refused", async () => {
    const { page, close } = await mountInBrowser({ entry: PANEL, css: CSS, init: BUZZ });
    try {
      await payWithSavedCard(page);
      await answer(page, { ok: false, error: "Your card was declined." });
      await page.waitForSelector('.nf-pay-stage__face[data-at="failed"]');
      expect(await sameDialog(page)).toBe(true);
      expect(await successDrawn(page)).toBe(0);
      expect(await page.getByRole("alert").textContent()).toContain("Payment not completed");
      /* The waiting felt like nothing; the refusal is the one error pattern. */
      expect(await buzz(page)).toEqual([[40, 60, 40, 60, 40]]);
    } finally {
      await close();
    }
  });
});

/* ------------------------------------------------------- the return trip */

const RETURN = `
  import { mount } from "@/lib/testing/browser-root";
  import { PaymentReturn } from "@/app/(app)/checkout/[bookingId]/PaymentReturn";
  mount(<PaymentReturn reference="rm-book-abc123" bookingId="bk-1" amountMinor={48500000} locale="en"
    retryHref="/checkout/bk-1" plansAction={{ label: "See your stays", href: "/bookings" }} />);
`;
const SETTLE_LATER = { settleCardPayment: "() => new Promise((resolve) => { window.__settle = resolve; })" };
const settle = (page: Page, value: unknown) =>
  page.evaluate((v) => (window as unknown as { __settle(v: unknown): void }).__settle(v), value);

describe.skipIf(!hasBrowser && !process.env.CI)("PaymentReturn on the pay stage", () => {
  it("confirms on the stage with the payment page's step really done, silent while it waits, and answers in the same card", async () => {
    const { page, close } = await mountInBrowser({ entry: RETURN, css: CSS, init: BUZZ, actions: SETTLE_LATER });
    try {
      await page.waitForSelector('.nf-pay-stage__face[data-at="processing"]');
      await tagDialog(page);
      expect(await page.locator('.nf-paysteps__step[data-state="done"]').count()).toBe(1);
      expect(await page.locator('.nf-paysteps__step[data-state="active"]').textContent()).toBe("Confirming your payment");
      await page.waitForTimeout(600);
      expect(await successDrawn(page)).toBe(0);
      /* A wait is passive: it does not vibrate. */
      expect(await buzz(page)).toEqual([]);
      await settle(page, { ok: true, data: { bookingId: "bk-1", amountMinor: 48500000, confirmed: true, outcome: "settled" } });
      await page.waitForSelector(".nf-success[data-staged] .nf-success__seal");
      expect(await sameDialog(page)).toBe(true);
      expect(await page.locator(".nf-success__amount").textContent()).toContain("485,000");
      expect(await page.locator(".nf-success__mono").textContent()).toBe("rm-book-abc123");
    } finally {
      await close();
    }
  });

  it("cuts the same card to the failure when the settlement is refused", async () => {
    const { page, close } = await mountInBrowser({ entry: RETURN, css: CSS, init: BUZZ, actions: SETTLE_LATER });
    try {
      await page.waitForSelector('.nf-pay-stage__face[data-at="processing"]');
      await tagDialog(page);
      await settle(page, { ok: false, error: "The bank declined the charge." });
      await page.waitForSelector('.nf-pay-stage__face[data-at="failed"]');
      expect(await sameDialog(page)).toBe(true);
      expect((await motion(page, ".nf-pay-stage__title"))!.name).toBe("none");
      expect(await successDrawn(page)).toBe(0);
      expect(await buzz(page)).toEqual([[40, 60, 40, 60, 40]]);
    } finally {
      await close();
    }
  });
});
