/**
 * The credential fan, mounted for real in Chromium on the product's own
 * stylesheet: the stack IS the selector, so it must be a radio group with
 * roving focus, arrows, Home and End, and a tap or a swipe that brings one
 * forward; a single credential is drawn flat with no selector; and, the one
 * hard limit of 14.4, nothing a credential draws can be read as a payment
 * card (no chip, no number, no expiry, not the bank-card proportion).
 *
 * Fixtures are slot names ("First slot"), the same structural kind the
 * component gallery uses: no tier name, count or wording is invented here.
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

const CSS = productCss("components/app/artefact/artefact.css");

const SLOTS = [
  { id: "a", material: "navy", eyebrow: "First slot", title: "Matte navy", line: "The quiet material.", glyph: "check" },
  { id: "b", material: "royal", eyebrow: "Second slot", title: "Royal", line: "One step up.", glyph: "check" },
  { id: "c", material: "edge", eyebrow: "Third slot", title: "Navy, warm edge", line: "The one warm line.", glyph: "check" },
];

function entry(opts: { count?: number; initialId?: string; detail?: boolean; states?: boolean } = {}): string {
  return `
    import { getDictionary } from "@vallo/i18n";
    import { CredentialFan } from "@/components/app/artefact/CredentialFan";
    import { mount } from "@/lib/testing/browser-root";
    const f = getDictionary("en").experienceFeatures.artefact;
    const items = ${JSON.stringify(
      SLOTS.slice(0, opts.count ?? SLOTS.length).map((slot, i) => (opts.states ? { ...slot, state: i === 0 ? "Held" : "Not yet" } : slot)),
    )};
    window.__changes = [];
    mount(
      <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
        <button id="before" type="button">before</button>
        <CredentialFan
          items={items}
          ${opts.initialId ? `initialId=${JSON.stringify(opts.initialId)}` : ""}
          label={f.selector}
          positionLabel={f.position}
          onChange={(id) => window.__changes.push(id)}
          ${opts.detail === false ? "" : "detail={(item) => <p>{item.line}</p>}"}
        />
        <button id="after" type="button">after</button>
      </div>,
    );
  `;
}

const radios = (page: Page) => page.getByRole("radio");
/* Which radio is checked, by index. */
const checkedIndex = (page: Page) =>
  radios(page).evaluateAll((els) => els.findIndex((el) => el.getAttribute("aria-checked") === "true"));
const focusedIndex = (page: Page) =>
  radios(page).evaluateAll((els) => els.findIndex((el) => el === document.activeElement));
const changes = (page: Page) => page.evaluate(() => (window as unknown as { __changes: string[] }).__changes);

async function tapEdge(page: Page, index: number) {
  /* The forward card sits on top, so a receding one is tapped on the part of it
     that stands clear: its outer edge. */
  const box = (await radios(page).nth(index).boundingBox())!;
  const outer = index < (await checkedIndex(page));
  await page.mouse.click(outer ? box.x + 6 : box.x + box.width - 6, box.y + box.height / 2);
}

async function swipe(page: Page, dx: number) {
  await page.locator(".nf-fan__stage").evaluate((stage, distance) => {
    const box = stage.getBoundingClientRect();
    const x0 = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const fire = (type: string, x: number) =>
      stage.dispatchEvent(
        new PointerEvent(type, { bubbles: true, pointerId: 3, pointerType: "touch", clientX: x, clientY: y, isPrimary: true }),
      );
    fire("pointerdown", x0);
    fire("pointermove", x0 + distance);
    fire("pointerup", x0 + distance);
  }, dx);
}

describe.skipIf(!hasBrowser && !process.env.CI)("the credential fan", () => {
  it("puts a credential's spoken state in its name, with the selection in aria-checked", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ states: true }), css: CSS });
    try {
      expect(await radios(page).evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")))).toEqual([
        "Matte navy, Held, 1 of 3",
        "Royal, Not yet, 2 of 3",
        "Navy, warm edge, Not yet, 3 of 3",
      ]);
      expect(await checkedIndex(page)).toBe(0);
    } finally {
      await close();
    }
  });

  it("is a named radio group of radios, the chosen one forward and the only tab stop", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ initialId: "b" }), css: CSS });
    try {
      const group = page.getByRole("radiogroup", { name: "Choose one" });
      expect(await group.count()).toBe(1);
      expect(await radios(page).count()).toBe(3);
      /* Each radio is named by its credential and where it sits. */
      expect(await radios(page).evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")))).toEqual([
        "Matte navy, 1 of 3",
        "Royal, 2 of 3",
        "Navy, warm edge, 3 of 3",
      ]);
      expect(await checkedIndex(page)).toBe(1);
      /* Roving focus: exactly one radio is in the tab order. */
      expect(await radios(page).evaluateAll((els) => els.map((el) => el.tabIndex))).toEqual([-1, 0, -1]);
      expect(await radios(page).evaluateAll((els) => els.map((el) => el.hasAttribute("data-forward")))).toEqual([
        false,
        true,
        false,
      ]);
      /* The forward credential stands on top of the others. */
      const z = await radios(page).evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).zIndex)));
      expect(z[1]).toBeGreaterThan(z[0]!);
      expect(z[1]).toBeGreaterThan(z[2]!);
      /* Its explanation is announced politely beneath the fan. */
      const detail = page.locator(".nf-fan__detail");
      expect(await detail.getAttribute("aria-live")).toBe("polite");
      expect(await detail.textContent()).toBe("One step up.");
    } finally {
      await close();
    }
  });

  it("opens on the first credential when no initial one is named, or the named one is not there", async () => {
    const first = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      expect(await checkedIndex(first.page)).toBe(0);
    } finally {
      await first.close();
    }
    const unknown = await mountInBrowser({ entry: entry({ initialId: "not-a-slot" }), css: CSS });
    try {
      expect(await checkedIndex(unknown.page)).toBe(0);
    } finally {
      await unknown.close();
    }
  });

  it("Tab enters on the chosen radio and leaves the group in one more Tab", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ initialId: "b" }), css: CSS });
    try {
      await page.locator("#before").focus();
      await page.keyboard.press("Tab");
      expect(await focusedIndex(page)).toBe(1);
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => document.activeElement?.id)).toBe("after");
    } finally {
      await close();
    }
  });

  it("moves with the arrows, Home and End, brings focus with it and stops at the ends", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ initialId: "b" }), css: CSS });
    try {
      await radios(page).nth(1).focus();
      await page.keyboard.press("ArrowRight");
      expect(await checkedIndex(page)).toBe(2);
      expect(await focusedIndex(page)).toBe(2);
      /* No wrap at the end: the credential stays and nothing more is reported. */
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowDown");
      expect(await checkedIndex(page)).toBe(2);
      await page.keyboard.press("ArrowLeft");
      expect(await checkedIndex(page)).toBe(1);
      await page.keyboard.press("Home");
      expect(await checkedIndex(page)).toBe(0);
      expect(await focusedIndex(page)).toBe(0);
      await page.keyboard.press("ArrowUp");
      expect(await checkedIndex(page)).toBe(0);
      await page.keyboard.press("End");
      expect(await checkedIndex(page)).toBe(2);
      expect(await focusedIndex(page)).toBe(2);
      /* Roving: the tab stop travelled with the choice. */
      expect(await radios(page).evaluateAll((els) => els.map((el) => el.tabIndex))).toEqual([-1, -1, 0]);
      /* One report per real change, in order, and none for a press at an end. */
      expect(await changes(page)).toEqual(["c", "b", "a", "c"]);
      expect(await page.locator(".nf-fan__detail").textContent()).toBe("The one warm line.");
    } finally {
      await close();
    }
  });

  it("brings a tapped credential forward, and a tap on the forward one changes nothing", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ initialId: "b" }), css: CSS });
    try {
      await page.waitForTimeout(500);
      await tapEdge(page, 0);
      expect(await checkedIndex(page)).toBe(0);
      expect(await radios(page).nth(0).evaluate((el) => el.hasAttribute("data-forward"))).toBe(true);
      expect(await page.locator(".nf-fan__detail").textContent()).toBe("The quiet material.");
      await page.waitForTimeout(500);
      await radios(page).nth(0).click();
      expect(await checkedIndex(page)).toBe(0);
      expect(await changes(page)).toEqual(["a"]);
    } finally {
      await close();
    }
  });

  it("steps one on a swipe past 40px and not on a shorter one", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ initialId: "b" }), css: CSS });
    try {
      await swipe(page, -20);
      expect(await checkedIndex(page)).toBe(1);
      await swipe(page, -60);
      expect(await checkedIndex(page)).toBe(2);
      await swipe(page, 60);
      expect(await checkedIndex(page)).toBe(1);
      expect(await changes(page)).toEqual(["c", "b"]);
    } finally {
      await close();
    }
  });

  it("draws a single credential flat, with no selector of any kind", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ count: 1 }), css: CSS });
    try {
      expect(await page.getByRole("radiogroup").count()).toBe(0);
      expect(await radios(page).count()).toBe(0);
      expect(await page.locator(".nf-fan__stage button").count()).toBe(0);
      expect(await page.locator(".nf-fan").getAttribute("class")).toContain("nf-fan--single");
      /* Flat: the card is not tilted, turned or dimmed, and its words are plain text. */
      const card = page.locator(".nf-fan__card");
      expect(await card.count()).toBe(1);
      const style = await card.evaluate((el) => {
        const s = getComputedStyle(el);
        return { transform: s.transform, opacity: s.opacity };
      });
      expect(style).toEqual({ transform: "none", opacity: "1" });
      expect(await card.textContent()).toContain("Matte navy");
      /* A fan of one has nothing to announce changing. */
      expect(await page.locator(".nf-fan__detail").getAttribute("aria-live")).toBeNull();
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("draws nothing at all for no credentials", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ count: 0 }), css: CSS });
    try {
      expect(await page.locator(".nf-fan").count()).toBe(0);
      expect(await page.locator(".nf-cred").count()).toBe(0);
    } finally {
      await close();
    }
  });

  it("never draws a chip, a number, an expiry or the bank-card proportion on any credential", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ initialId: "c" }), css: CSS });
    try {
      /* Every credential, forward or not: the guard is on what the DOM holds. */
      const found = await page.locator(".nf-cred").evaluateAll((cards) =>
        cards.map((card) => {
          const parts = [card, ...card.querySelectorAll("*")];
          return {
            /* The only parts a face has: top, eyebrow, glyph, foot, title, line, state. */
            classes: [...card.querySelectorAll("*")]
              .map((el) => el.getAttribute("class") ?? "")
              .filter((c) => c.startsWith("nf-cred"))
              .map((c) => c.split(" ")[0]),
            /* Anything named for a card's furniture. */
            furniture: parts.filter((el) =>
              /chip|contactless|nfc|emv|network|visa|mastercard|verve|expir|valid-?thru|holder|pan\b|card-?number/i.test(
                `${el.getAttribute("class") ?? ""} ${el.id} ${el.getAttribute("data-testid") ?? ""} ${el.getAttribute("aria-label") ?? ""}`,
              ),
            ).length,
            /* A drawn mark that is not the single line glyph. */
            images: card.querySelectorAll("img, canvas, picture, video").length,
            svgs: card.querySelectorAll("svg").length,
            /* A run of four digits, or a card-style number group, in any text. */
            numberLike: /\d{4}|(\d{2,4}[\s-]){2,}\d|\d{2}\s*\/\s*\d{2}/.test(card.textContent ?? ""),
            /* A chip painted in CSS rather than markup: a pseudo-element is allowed
               only as the edge material's own outline on the card itself (no fill,
               no image), and never on any part inside the face. */
            pseudo: parts.flatMap((el) =>
              ["::before", "::after"].flatMap((which) => {
                const s = getComputedStyle(el, which);
                if (s.content === "none" || s.content === "normal") return [];
                const outlineOnly = el === card && which === "::before" && s.backgroundImage === "none" && /,\s*0\)$/.test(s.backgroundColor) /* alpha 0: no fill */;
                return outlineOnly ? [] : [`${el.className} ${which}`];
              }),
            ).length,
            ratio: card.getBoundingClientRect().width / card.getBoundingClientRect().height,
            eyebrowAndTitle: [card.querySelector(".nf-cred__eyebrow")?.textContent, card.querySelector(".nf-cred__title")?.textContent],
          };
        }),
      );
      expect(found).toHaveLength(3);
      for (const card of found) {
        expect(card.furniture).toBe(0);
        expect(card.images).toBe(0);
        /* At most the one line glyph the face takes. */
        expect(card.svgs).toBeLessThanOrEqual(1);
        expect(card.numberLike).toBe(false);
        expect(card.pseudo).toBe(0);
        /* Only the face's own parts are present. */
        const allowed = new Set([
          "nf-cred__top",
          "nf-cred__eyebrow",
          "nf-cred__glyph",
          "nf-cred__foot",
          "nf-cred__title",
          "nf-cred__line",
          "nf-cred__state",
        ]);
        expect(card.classes.every((c) => allowed.has(c!))).toBe(true);
        /* 7 by 5 (1.4), plainly not the bank card's 1.586. The fan tilts the
           forward one, which only ever narrows it, so a band is asserted. */
        expect(card.ratio).toBeGreaterThan(1.2);
        expect(card.ratio).toBeLessThan(1.5);
      }
    } finally {
      await close();
    }
  });

  it("draws the warm edge line on a face only for the edge material, as the one pseudo-element", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      const marks = await page
        .locator(".nf-cred")
        .evaluateAll((cards) => cards.map((card) => getComputedStyle(card, "::before").content));
      expect(marks).toEqual(["none", "none", '""']);
    } finally {
      await close();
    }
  });

  it("passes axe with three credentials", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ initialId: "b" }), css: CSS });
    try {
      await page.waitForTimeout(500);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("settles a new pose on the spring when motion is allowed", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      const duration = await radios(page).nth(0).evaluate((el) => getComputedStyle(el).transitionDuration);
      expect(duration).toContain("0.38s");
    } finally {
      await close();
    }
  });

  it("shows the new pose at once under reduced motion, and under Calm and Off", async () => {
    for (const mode of [{ reducedMotion: true }, { motion: "calm" as const }, { motion: "off" as const }]) {
      const { page, close } = await mountInBrowser({ entry: entry({ initialId: "b" }), css: CSS, ...mode });
      try {
        const slotTransition = await radios(page).evaluateAll((els) =>
          els.map((el) => getComputedStyle(el).transitionDuration),
        );
        expect(slotTransition.every((d) => d === "0s")).toBe(true);
        await radios(page).nth(1).focus();
        await page.keyboard.press("ArrowRight");
        /* No frame in between: the chosen credential is already at rest, with no tilt wait. */
        expect(await radios(page).nth(2).evaluate((el) => getComputedStyle(el).transform)).toBe("matrix(1, 0, 0, 1, 0, 0)");
        expect(await radios(page).nth(2).evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1);
      } finally {
        await close();
      }
    }
  });
});
