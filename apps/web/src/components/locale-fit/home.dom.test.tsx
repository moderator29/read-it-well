/**
 * Locale fit, home's lists (13 October 2026): the one card in its three layouts
 * (one per row, the best-match tile with its reason line, the compact new
 * listing), the two best-match empty states and the new-listings empty state,
 * each mounted in Chromium at 390px in English, Hausa, Igbo and Yorùbá, from
 * the real dictionaries and the repository's structural fixtures, on the
 * product's compiled cascade. Nothing sticks out sideways, no label is cut
 * where the design wraps it, every target is 44px (the heart included).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BROWSER_TEST_TIMEOUT, closeBrowser, hasBrowser, warmBrowser } from "@/lib/testing/mount-in-browser";
import { appCss, fitMount } from "@/lib/testing/locale-fit";
import { fitCases } from "./fit-cases";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = () => appCss();

const CARD_IMPORTS = `
  import { HomeListingCard } from "@/components/app/home/HomeListingCard";
  import { homeCardCopyOf } from "@/components/app/home/home-card-copy";
  import { SHELF, EXAMPLE_LISTING } from "@/app/(dev)/preview/f3/fixtures";`;

const LISTS_IMPORTS = `
  import { BestMatchesAsk, BestMatchesNone, BestMatchesRow, NewListings, FeaturedListings } from "@/components/app/home/HomeLists";
  import { SHELF } from "@/app/(dev)/preview/f3/fixtures";`;

describe.skipIf(!hasBrowser && !process.env.CI)("locale fit: home's lists at 390px", () => {
  fitCases({
    name: "Home card, one per row (featured, new)",
    imports: CARD_IMPORTS,
    body: `
      <div style={{ display: "grid", gap: 16 }}>
        {[...SHELF, EXAMPLE_LISTING].map((listing) => <HomeListingCard key={listing.id} listing={listing} locale={locale} copy={homeCardCopyOf(t)} layout="card" />)}
      </div>`,
    css: CSS,
  });

  fitCases({
    name: "Home card, compact with a reason (best match)",
    imports: CARD_IMPORTS,
    body: `
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 17rem)" }}>
        {SHELF.map((listing) => <HomeListingCard key={listing.id} listing={listing} locale={locale} copy={homeCardCopyOf(t)} layout="compact"
          reason={t.homeV2.reasonSearch.replace("{label}", "Three bedroom flats in Lekki Phase 1 under five million")} />)}
      </div>`,
    css: CSS,
  });

  fitCases({
    name: "Home empty states",
    imports: LISTS_IMPORTS,
    body: `
      <div>
        <BestMatchesRow rows={[]} t={t} locale={locale} empty={<BestMatchesAsk t={t} />} />
        <BestMatchesRow rows={[]} t={t} locale={locale} empty={<BestMatchesNone t={t} />} />
        <NewListings listings={[]} t={t} locale={locale} />
      </div>`,
    css: CSS,
  });

  it("the whole card opens one link, with the heart outside it and a 44px heart", async () => {
    const { page, close } = await fitMount({
      locale: "en",
      imports: CARD_IMPORTS,
      body: `<HomeListingCard listing={SHELF[0]} locale={locale} copy={homeCardCopyOf(t)} layout="card" />`,
      css: await CSS(),
    });
    try {
      await page.waitForTimeout(500);
      const facts = await page.evaluate(() => {
        const card = document.querySelector(".nf-sc")!;
        const link = card.querySelector<HTMLAnchorElement>("a.nf-sc__link")!;
        const heart = card.querySelector<HTMLElement>(".nf-sc__heart > button")!;
        const after = getComputedStyle(link, "::after");
        const h = heart.getBoundingClientRect();
        return {
          visibleLinks: [...card.querySelectorAll("a")].filter((a) => a.getAttribute("aria-hidden") !== "true").length,
          heartInsideLink: link.contains(heart),
          nestedInteractive: link.querySelectorAll("button, a").length,
          overlay: { position: after.position },
          heart: { w: h.width, h: h.height },
          chip: card.querySelector(".nf-sc__status")?.textContent ?? null,
        };
      });
      expect(facts.visibleLinks, "one link per card for a screen reader").toBe(1);
      expect(facts.heartInsideLink).toBe(false);
      expect(facts.nestedInteractive).toBe(0);
      expect(facts.overlay.position).toBe("absolute");
      expect(facts.heart.w).toBeGreaterThanOrEqual(44);
      expect(facts.heart.h).toBeGreaterThanOrEqual(44);
      expect(facts.chip, "the status pill says the market in words").toBeTruthy();
    } finally {
      await close();
    }
  });
});
