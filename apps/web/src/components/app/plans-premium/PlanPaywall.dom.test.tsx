/**
 * The plan screen, mounted for real in Chromium on the product's own
 * stylesheet. Its two honesty rules (D21, north star 14.3):
 *
 *   1. NO TERMS, NO ACTION. Until all four money sentences exist (charged
 *      today, the charge date, the renewal, the cancel path) the foot is not
 *      drawn at all: there is no button to press.
 *   2. PRESELECTION ONLY WITH ALL FOUR. A recommended plan is chosen on arrival
 *      only when every one of the four exists; with any one missing, or blank,
 *      the member chooses.
 *
 * And the anatomy around them: the plans are a radio group with roving focus
 * and arrow keys, the four lines sit directly above the one action in a sticky
 * foot that stays on screen, nothing is priced that the server did not price,
 * and the component cannot draw a countdown, a strike-through, a padlock or
 * confetti.
 *
 * Fixtures are slot names ("The charge today, one line"). The four terms are
 * Session 2's money sentences (W7-R5) and are NOT written here; the plans carry
 * no price because no plan table exists, so the price figure is asserted to be
 * ABSENT rather than present, and no amount is invented to prove otherwise.
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
import { axeViolations } from "@/components/ui/ported-test-css";
import { productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss("components/app/plans-premium/plans-premium.css");

const FOUR = {
  chargeToday: "The charge today, one line",
  chargeOn: "The charge date, one line",
  renewal: "The renewal, one line",
  cancel: "How to cancel, one line",
};

/* `terms` goes on both plans; `annualTerms` overrides the annual plan's alone,
   so the per-plan behaviour can be tested with the monthly plan unchanged. */
function entry(opts: {
  terms: Record<string, string>;
  annualTerms?: Record<string, string>;
  preselectedId?: string | null;
  savingMinor?: number | null;
}): string {
  return `
    import { getDictionary } from "@vallo/i18n";
    import { PlanPaywall } from "@/components/app/plans-premium/PlanPaywall";
    import { mount } from "@/lib/testing/browser-root";
    const f = getDictionary("en").experienceFeatures.plans;
    mount(
      <PlanPaywall
        artefact={<div id="artefact" style={{ height: 160 }}>The plan's artefact slot</div>}
        promise="The promise, one line"
        benefits={[
          { icon: "check", text: "First benefit row" },
          { icon: "check", text: "Second benefit row" },
          { icon: "check", text: "Third benefit row" },
        ]}
        plans={[
          { id: "monthly", period: "monthly", priceMinor: null, terms: ${JSON.stringify(opts.terms)} },
          { id: "annual", period: "annual", priceMinor: null, savingMinor: ${JSON.stringify(opts.savingMinor ?? null)}, terms: ${JSON.stringify(opts.annualTerms ?? opts.terms)} },
        ]}
        preselectedId={${JSON.stringify(opts.preselectedId ?? null)}}
        locale="en"
        copy={{
          choose: f.choose, monthly: f.monthly, annual: f.annual, perMonth: f.perMonth,
          perYear: f.perYear, recommended: f.recommended, saving: f.saving, benefits: f.benefits, termsNotReady: f.termsNotReady,
        }}
        action={(id) => <button id="act" type="button" className="nf-btn nf-btn--primary nf-btn--lg" data-plan-id={id ?? ""}>The one action, slot</button>}
      />,
    );
  `;
}

const plans = (page: Page) => page.getByRole("radio");
const checked = (page: Page) =>
  plans(page).evaluateAll((els) => els.map((el) => el.getAttribute("aria-checked") === "true"));
const chosenByAction = (page: Page) => page.locator("#act").getAttribute("data-plan-id");

describe.skipIf(!hasBrowser && !process.env.CI)("the plan screen", () => {
  it("draws no foot and no action without terms, even with a recommended plan named", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ terms: {}, preselectedId: "annual" }), css: CSS });
    try {
      expect(await page.locator(".nf-paywall__foot").count()).toBe(0);
      expect(await page.locator("#act").count()).toBe(0);
      expect(await page.getByRole("button", { name: "The one action, slot" }).count()).toBe(0);
      expect(await page.locator(".nf-paywall__terms").count()).toBe(0);
      /* The plans themselves are still there to read and to choose. */
      expect(await plans(page).count()).toBe(2);
      expect(await page.getByRole("heading", { level: 1, name: "The promise, one line" }).count()).toBe(1);
      /* Choosing one does not conjure an action out of nothing. */
      await plans(page).nth(0).click();
      expect(await checked(page)).toEqual([true, false]);
      expect(await page.locator("#act").count()).toBe(0);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("refuses the action when any one of the four lines is missing or blank, and each is checked on its own", async () => {
    for (const key of Object.keys(FOUR) as (keyof typeof FOUR)[]) {
      for (const how of ["missing", "blank"] as const) {
        const terms: Record<string, string> = { ...FOUR };
        if (how === "missing") delete terms[key];
        else terms[key] = "   ";
        const { page, close } = await mountInBrowser({ entry: entry({ terms, preselectedId: "annual" }), css: CSS });
        try {
          expect(await page.locator(".nf-paywall__foot").count(), `${key} ${how}`).toBe(0);
          expect(await page.locator("#act").count(), `${key} ${how}`).toBe(0);
          /* And nothing is preselected on the strength of an incomplete set. */
          expect(await checked(page), `${key} ${how}`).toEqual([false, false]);
          expect(await page.locator(".nf-paywall__flag").count(), `${key} ${how}`).toBe(0);
        } finally {
          await close();
        }
      }
    }
  });

  it("preselects and recommends the named plan only with all four lines, and hands the action its id", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ terms: FOUR, preselectedId: "annual" }), css: CSS });
    try {
      expect(await checked(page)).toEqual([false, true]);
      /* The recommendation is on that plan alone, in words. */
      const flags = await plans(page).evaluateAll((els) => els.map((el) => el.querySelector(".nf-paywall__flag")?.textContent ?? null));
      expect(flags).toEqual([null, "Recommended"]);
      expect(await chosenByAction(page)).toBe("annual");
      /* Choosing the other moves the choice and the action's id with it, and the
         recommendation stays where the server put it. */
      await plans(page).nth(0).click();
      expect(await checked(page)).toEqual([true, false]);
      expect(await chosenByAction(page)).toBe("monthly");
      expect(await page.locator(".nf-paywall__flag").count()).toBe(1);
      await page.waitForTimeout(300);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("chooses nothing when no plan is named, or the named one is not on the screen, even with all four lines", async () => {
    for (const preselectedId of [null, "a-plan-that-is-not-here"]) {
      const { page, close } = await mountInBrowser({ entry: entry({ terms: FOUR, preselectedId }), css: CSS });
      try {
        expect(await checked(page)).toEqual([false, false]);
        expect(await page.locator(".nf-paywall__flag").count()).toBe(0);
        /* With nothing chosen there is no plan whose terms could be shown, so
           there is no foot and no action until the member chooses. */
        expect(await page.locator(".nf-paywall__foot").count()).toBe(0);
        expect(await page.locator("#act").count()).toBe(0);
        /* The first plan is the one tab stop while nothing is chosen. */
        expect(await plans(page).evaluateAll((els) => els.map((el) => el.tabIndex))).toEqual([0, -1]);
      } finally {
        await close();
      }
    }
  });

  it("shows the chosen plan's own four lines, and no foot for a plan that has none", async () => {
    const annual = {
      chargeToday: "Annual: the charge today",
      chargeOn: "Annual: the charge date",
      renewal: "Annual: the renewal",
      cancel: "Annual: how to cancel",
    };
    const { page, close } = await mountInBrowser({
      entry: entry({ terms: FOUR, annualTerms: annual, preselectedId: "annual" }),
      css: CSS,
    });
    try {
      const lines = page.locator(".nf-paywall__terms li");
      expect(await lines.allTextContents()).toEqual(Object.values(annual));
      await plans(page).nth(0).click();
      expect(await lines.allTextContents()).toEqual(Object.values(FOUR));
      await plans(page).nth(1).click();
      expect(await lines.allTextContents()).toEqual(Object.values(annual));
    } finally {
      await close();
    }
    /* A plan whose own set is incomplete is not preselected and has no foot,
       however complete the other plan's set is. */
    const gap = await mountInBrowser({
      entry: entry({ terms: FOUR, annualTerms: { chargeToday: "Annual: the charge today" }, preselectedId: "annual" }),
      css: CSS,
    });
    try {
      expect(await checked(gap.page)).toEqual([false, false]);
      await plans(gap.page).nth(1).click();
      /* A chosen plan with no terms offers no action but says why, in words. */
      expect(await gap.page.locator(".nf-paywall__terms").count()).toBe(0);
      expect(await gap.page.locator("#act").count()).toBe(0);
      expect(await gap.page.locator(".nf-paywall__notready").textContent()).toBe(
        "This plan's terms are not ready yet, so it cannot be chosen here.",
      );
      await plans(gap.page).nth(0).click();
      expect(await gap.page.locator(".nf-paywall__notready").count()).toBe(0);
      await plans(gap.page).nth(1).click();
      await plans(gap.page).nth(0).click();
      expect(await gap.page.locator(".nf-paywall__terms li").allTextContents()).toEqual(Object.values(FOUR));
    } finally {
      await gap.close();
    }
  });

  it("puts the four lines directly above the one action, in order, at body size, in a foot that stays in view", async () => {
    const { page, close } = await mountInBrowser({
      entry: entry({ terms: FOUR, preselectedId: "annual" }),
      css: CSS,
      viewport: { width: 390, height: 560 },
    });
    try {
      const lines = page.locator(".nf-paywall__terms li");
      expect(await lines.allTextContents()).toEqual([FOUR.chargeToday, FOUR.chargeOn, FOUR.renewal, FOUR.cancel]);
      const action = page.locator("#act");
      expect(await page.getByRole("button", { name: "The one action, slot" }).count()).toBe(1);
      const last = (await lines.last().boundingBox())!;
      const act = (await action.boundingBox())!;
      expect(last.y + last.height).toBeLessThanOrEqual(act.y);
      /* Legible, never caption: at least the body-small size. */
      expect(await lines.first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
      /* The foot is sticky, so the terms and the action are on screen with the page scrolled to its top. */
      expect(await page.locator(".nf-paywall__foot").evaluate((el) => getComputedStyle(el).position)).toBe("sticky");
      await page.evaluate(() => window.scrollTo(0, 0));
      const first = (await lines.first().boundingBox())!;
      const again = (await action.boundingBox())!;
      expect(first.y).toBeGreaterThanOrEqual(0);
      expect(again.y + again.height).toBeLessThanOrEqual(560);
    } finally {
      await close();
    }
  });

  it("is a radio group of plans with roving focus: arrows wrap and carry focus and the choice", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ terms: FOUR, preselectedId: "annual" }), css: CSS });
    try {
      expect(await page.getByRole("radiogroup", { name: "Choose a plan" }).count()).toBe(1);
      expect(await plans(page).evaluateAll((els) => els.map((el) => el.tabIndex))).toEqual([-1, 0]);
      await plans(page).nth(1).focus();
      await page.keyboard.press("ArrowRight");
      expect(await checked(page)).toEqual([true, false]);
      expect(await plans(page).nth(0).evaluate((el) => el === document.activeElement)).toBe(true);
      expect(await chosenByAction(page)).toBe("monthly");
      await page.keyboard.press("ArrowLeft");
      expect(await checked(page)).toEqual([false, true]);
      await page.keyboard.press("ArrowDown");
      expect(await checked(page)).toEqual([true, false]);
      await page.keyboard.press("ArrowUp");
      expect(await checked(page)).toEqual([false, true]);
      expect(await plans(page).evaluateAll((els) => els.map((el) => el.tabIndex))).toEqual([-1, 0]);
    } finally {
      await close();
    }
  });

  it("prints no price, no saving and no figure for a plan the server has not priced", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ terms: FOUR, preselectedId: "annual", savingMinor: 0 }), css: CSS });
    try {
      expect(await page.locator(".nf-paywall__price, .nf-paywall__saving").count()).toBe(0);
      const text = await page.locator(".nf-paywall__plans").innerText();
      expect(text).not.toMatch(/₦|\d/);
      /* Each card is its period's name and nothing more. */
      expect(await plans(page).evaluateAll((els) => els.map((el) => (el as HTMLElement).innerText.replace(/\s+/g, " ").trim()))).toEqual([
        "Monthly",
        "Annual Recommended",
      ]);
    } finally {
      await close();
    }
  });

  it("cannot draw a countdown, a struck-through price, a padlock or confetti", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ terms: FOUR, preselectedId: "annual" }), css: CSS });
    try {
      expect(await page.locator("s, del, strike, canvas, [role='timer'], time").count()).toBe(0);
      const struck = await page
        .locator(".nf-paywall *")
        .evaluateAll((els) => els.filter((el) => getComputedStyle(el).textDecorationLine.includes("line-through")).length);
      expect(struck).toBe(0);
      const text = (await page.locator(".nf-paywall").innerText()).toLowerCase();
      expect(text).not.toMatch(/off forever|% off|countdown|ends in|hurry|limited time|lock/);
      /* Every benefit row is a line glyph and a sentence, three to five of them. */
      expect(await page.locator(".nf-paywall__benefit").count()).toBe(3);
    } finally {
      await close();
    }
  });
});
