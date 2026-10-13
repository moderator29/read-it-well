/**
 * THE FRONT DOOR RAIL AND THE RESULTS SCREEN, MOUNTED IN A REAL CHROMIUM WITH
 * THEIR OWN STYLESHEET (`VALLO_PROMOTION-v2.md` section 11).
 *
 *   - Seven paid inputs draw six cards; three Everywhere draw two; five
 *     Featured draw four; an input without a paid slot id draws nothing.
 *   - Two cards keep the same card width and the same gap as six, measured:
 *     a day that is not sold out shows fewer cards, never stretched ones.
 *   - With no source data the results draw no split and say it is not
 *     recorded; with one, the split is drawn.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Page } from "playwright-core";
import { BROWSER_TEST_TIMEOUT, closeBrowser, hasBrowser, mountInBrowser, warmBrowser } from "@/lib/testing/mount-in-browser";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const WEB = join(__dirname, "..", "..", "..");
const CSS = [
  readFileSync(join(WEB, "..", "..", "packages", "design-tokens", "src", "tokens.css"), "utf8"),
  "*, ::before, ::after { box-sizing: border-box; } body { margin: 0; padding: 16px; }",
  readFileSync(join(__dirname, "promotion.css"), "utf8"),
].join("\n");

/** Mount the rail with `tiers` as paid slots (an empty slot id where the tier is prefixed "-"). */
const railEntry = (tiers: string[]) => `
  import { getDictionary } from "@vallo/i18n";
  import { PromotedRail } from "@/components/promotion/PromotedRail";
  import { mount } from "@/lib/testing/browser-root";
  import { RENTAL, SALE, SHELF } from "@/app/(dev)/preview/f3/fixtures";
  const pool = [RENTAL, SALE, ...SHELF];
  const tiers = ${JSON.stringify(tiers)};
  const slots = tiers.map((tier, i) => ({
    slotId: tier.startsWith("-") ? "" : "slot-" + i,
    tier: tier.replace(/^-/, ""),
    listing: { ...pool[i % pool.length], id: pool[i % pool.length].id + "-" + i },
  }));
  mount(<div id="frame" style={{ width: 1400 }}><PromotedRail slots={slots} locale="en" t={getDictionary("en")} /></div>);
`;

const cards = (page: Page) => page.locator(".nf-promoted-rail__item");

async function geometry(page: Page) {
  return page.locator(".nf-promoted-rail__item").evaluateAll((items) =>
    items.map((item) => {
      const box = item.getBoundingClientRect();
      return { left: box.left, width: box.width };
    }),
  );
}

async function railOf(tiers: string[]) {
  return mountInBrowser({ entry: railEntry(tiers), css: CSS, viewport: { width: 1440, height: 900 } });
}

describe.skipIf(!hasBrowser && !process.env.CI)("the front door rail", () => {
  it("seven paid inputs render six cards, each labelled", async () => {
    const { page, close } = await railOf(["prime", "prime", "featured", "featured", "featured", "featured", "featured"]);
    try {
      expect(await cards(page).count()).toBe(6);
      expect(await page.getByTestId("promoted-label").count()).toBe(6);
    } finally {
      await close();
    }
  });

  it("three Everywhere inputs render two; five Featured render four", async () => {
    const everywhere = await railOf(["prime", "prime", "prime"]);
    try {
      expect(await cards(everywhere.page).count()).toBe(2);
    } finally {
      await everywhere.close();
    }
    const featured = await railOf(["featured", "featured", "featured", "featured", "featured"]);
    try {
      expect(await cards(featured.page).count()).toBe(4);
    } finally {
      await featured.close();
    }
  });

  it("an input without a paid slot id is refused; no paid input, no rail", async () => {
    const one = await railOf(["-featured", "prime"]);
    try {
      expect(await cards(one.page).count()).toBe(1);
      expect(await one.page.locator("[data-promoted-slot]").getAttribute("data-promoted-slot")).toBe("slot-1");
    } finally {
      await one.close();
    }
    const none = await railOf(["-featured", "-prime"]);
    try {
      expect(await none.page.getByTestId("promoted-rail").count()).toBe(0);
    } finally {
      await none.close();
    }
  });

  it("two cards keep the same card width and gap as six, and are not stretched to fill", async () => {
    const six = await railOf(["prime", "prime", "featured", "featured", "featured", "featured"]);
    const two = await railOf(["prime", "featured"]);
    try {
      const g6 = await geometry(six.page);
      const g2 = await geometry(two.page);
      expect(g6).toHaveLength(6);
      expect(g2).toHaveLength(2);
      const widths = new Set([...g6, ...g2].map((c) => Math.round(c.width)));
      expect(widths.size).toBe(1);
      const gap6 = g6[1]!.left - (g6[0]!.left + g6[0]!.width);
      const gap2 = g2[1]!.left - (g2[0]!.left + g2[0]!.width);
      expect(gap2).toBeCloseTo(gap6, 1);
      expect(gap2).toBeGreaterThan(0);
      /* Two cards leave the rest of the rail empty rather than growing into it. */
      const track = await two.page.locator(".nf-promoted-rail__track").evaluate((el) => el.getBoundingClientRect().width);
      expect(g2[1]!.left + g2[1]!.width - g2[0]!.left).toBeLessThan(track - g2[0]!.width);
    } finally {
      await six.close();
      await two.close();
    }
  });
});

const resultsEntry = (bySource: string) => `
  import { getDictionary } from "@vallo/i18n";
  import { PromotionResults } from "@/components/promotion/PromotionResults";
  import { LISTER_GAPS, measurementRows, sourceSplit } from "@/lib/promotion/measurement";
  import { PROMOTION_METRICS } from "@/lib/promotion/tiers";
  import { mount } from "@/lib/testing/browser-root";
  const p = getDictionary("en").experienceFeatures.promotion;
  const values = Object.fromEntries(PROMOTION_METRICS.map((m) => [m, null]));
  const m = { windowDays: 30, values: { ...values, impressions: 400, inquiries: 3 }, gaps: { ...LISTER_GAPS, impressions: undefined }, ${bySource} };
  mount(<PromotionResults rows={measurementRows(m)} split={sourceSplit(m)} copy={p} locale="en" />);
`;

describe.skipIf(!hasBrowser && !process.env.CI)("the results: promoted against organic", () => {
  it("with no source data, draws no split and no sentence claims one", async () => {
    const { page, close } = await mountInBrowser({ entry: resultsEntry(""), css: CSS });
    try {
      expect(await page.getByTestId("promotion-split").count()).toBe(0);
      expect(await page.locator("[data-source]").count()).toBe(0);
      expect(await page.getByTestId("promotion-split-not-recorded").textContent()).toMatch(/not recorded yet/);
      /* Outside the one sentence that says the split is not recorded, nothing
         speaks of a promoted share at all. */
      const note = (await page.getByTestId("promotion-split-not-recorded").textContent()) ?? "";
      const text = ((await page.getByTestId("promotion-results").textContent()) ?? "").replace(note, "");
      expect(note).not.toMatch(/\d/);
      expect(text).not.toMatch(/promoted|organic|ordinary results|came from|percent|%/i);
      /* A figure with nothing behind it is No data, never 0. */
      expect(await page.locator('[data-metric="saves"] .nf-promo-results__value').textContent()).toBe("No data");
      expect(await page.locator('[data-metric="inquiries"] .nf-promo-results__value').textContent()).toBe("3");
    } finally {
      await close();
    }
  });

  it("when the read gains a source dimension, the split slots in", async () => {
    const { page, close } = await mountInBrowser({
      entry: resultsEntry(`bySource: { impressions: { promoted: 270, organic: 130 } }`),
      css: CSS,
    });
    try {
      expect(await page.getByTestId("promotion-split").count()).toBe(1);
      expect(await page.locator('[data-source="promoted"] .nf-promo-results__value').textContent()).toBe("270");
      expect(await page.locator('[data-source="organic"] .nf-promo-results__value').textContent()).toBe("130");
      expect(await page.getByTestId("promotion-split-not-recorded").count()).toBe(0);
    } finally {
      await close();
    }
  });
});
