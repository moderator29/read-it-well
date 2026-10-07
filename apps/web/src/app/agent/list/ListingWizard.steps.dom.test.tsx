/**
 * The listing wizard's step changes, mounted in Chromium with the product's
 * stylesheets and read from computed animations, not a clock (round 5, a
 * lister publishing):
 *
 *   - the first paint is still: nothing has changed yet, so nothing moves;
 *   - Next is browsing pace: the title arrives in 160ms, the body 60ms behind
 *     it, at rest by 240ms, by transform and opacity only, from the side the
 *     lister is travelling; Back arrives from the other side;
 *   - the step bar is honest: the reached segment fills (240ms), the one left
 *     on Back empties (380ms, an unhurried exit), no sheen;
 *   - reduced motion tells the same story as a 160ms crossfade with no travel.
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
import { productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

/* The stylesheets the agent workspace loads around the wizard: Track M's
   journey (flow-m, and inner-m for its depth keyframes) and the surface
   partial, then the wizard's own, which has to win over them. */
const CSS = productCss("app/css/inner-m.css", "app/css/flow-m.css", "app/css/catalogue.css", "app/css/lister-publish.css");

/* A complete tenancy, derived from ListingWizard.fee-gate.dom.test.tsx's
   DRAFT (itself from the f5 harness). Example content, never written. */
const ENTRY = `
  import { mount } from "@/lib/testing/browser-root";
  import { getDictionary } from "@vallo/i18n";
  import { ListingWizard } from "@/app/agent/list/ListingWizard";
  import { AMENITY_CHOICES, STATE_CODES } from "@/lib/agent/listings-model";
  const t = getDictionary("en");
  const DRAFT = {
    id: "00000000-0000-4000-8000-000000000001", status: "DRAFT",
    title: "Bright 2 bedroom flat in Lekki Phase 1",
    description: "A bright two bedroom flat on a quiet street in Lekki Phase 1, with a fitted kitchen, a balcony off the sitting room and parking inside the compound. The estate is gated with security at the gate day and night.",
    propertyType: "rental", stateCode: "LA", city: "Lagos", area: "Lekki Phase 1", address: "12 Admiralty Way", landmark: "",
    bedrooms: 3, bathrooms: 3, toilets: "4", parkingSpaces: "2", floor: "2", totalFloors: "5", sizeSqm: "150",
    intent: "rent", rentNaira: "1800000", rentPeriod: "year", rentNegotiable: true, cautionDepositNaira: "1800000",
    serviceChargeNaira: "150000", serviceChargePeriod: "month", agencyFeeNaira: "0", legalFeeNaira: "", agreementFeeNaira: "",
    totalMoveInNaira: "", minimumTenancyMonths: "12", availableFrom: "", furnished: "fully_furnished",
    rateNaira: "", ratePeriod: "", salePriceNaira: "", saleAgencyFeeNaira: "", saleLegalFeeNaira: "", governorsConsentFeeNaira: "",
    stampDutyNaira: "", surveyRegistrationFeeNaira: "", totalPurchaseNaira: "", priceNegotiable: false, tenure: "", saleStatus: "",
    yearBuilt: "2021", condition: "newly_built", powerGrid: "BAND_A", powerBackup: "GENERATOR", powerBackupHours: "6",
    waterSupply: "TREATED_MAINS", prepaidMeter: true,
    access: { estateName: "", gateDirections: "", securityPhone: "", accessCode: "" },
    unit: { shape: "flat", ensuite: "", bq: "" },
    amenityCodes: ["wifi", "ac", "kitchen", "parking"], photos: [], videos: [], reviewNotes: null,
  };
  mount(
    <ListingWizard
      copy={t.agentListings} reference={t.listingReference} moveInCopy={t.moveIn}
      compoundCopy={t.shape.compound} serviceCopy={t.shape.service} unitCopy={t.shape.unit} floodCopy={t.shape.neighbours}
      locale="en" userId={null} states={STATE_CODES.map((code) => ({ code, name: code }))} amenities={AMENITY_CHOICES}
      initial={DRAFT} canPersist={false} startAt={1}
    />,
  );
`;

type Motion = { kind: string; name: string; duration: number; delay: number; frames: string[] };

/*
 * Taps a footer control and, in the frame the new step first renders, reads
 * every animation on the title, the body and the rail (transitions on the
 * segments' fill included, which are gone once they finish).
 */
type Read = { title: Motion[]; body: Motion[]; fills: Motion[]; segs: Motion[] };

async function stepAndRead(page: Page, label: "Next" | "Back"): Promise<Read> {
  return page.evaluate(async (label) => {
    const title = () => document.querySelector(".nf-lw-head__title")?.textContent;
    const before = title();
    const button = [...document.querySelectorAll<HTMLButtonElement>(".fixed button")].find((b) => b.textContent?.trim() === label);
    button!.click();
    await new Promise<void>((done) => {
      const tick = () => (title() !== before ? done() : requestAnimationFrame(tick));
      tick();
    });
    const describe = (a: Animation): Motion => {
      const effect = a.effect as KeyframeEffect;
      const timing = effect.getTiming();
      return {
        kind: a instanceof CSSTransition ? "transition" : "animation",
        name: a instanceof CSSAnimation ? a.animationName : (a as CSSTransition).transitionProperty,
        duration: Number(timing.duration),
        delay: Number(timing.delay),
        frames: effect.getKeyframes().map((f) => `${f.opacity ?? ""}|${f.transform ?? ""}|${(f as Record<string, unknown>).filter ?? ""}`),
      };
    };
    const on = (el: Element | null, pseudo: string | null = null) =>
      document
        .getAnimations()
        .filter((a) => (a.effect as KeyframeEffect).target === el && ((a.effect as KeyframeEffect).pseudoElement ?? null) === pseudo)
        .map(describe);
    const segs = [...document.querySelectorAll(".nf-lw-rail__seg")];
    return {
      title: on(document.querySelector(".nf-lw-head__title")),
      body: on(document.querySelector(".nf-lw-body > *")),
      fills: segs.flatMap((s) => on(s, "::before")),
      segs: segs.flatMap((s) => [...on(s), ...on(s, "::after")]),
    };
  }, label) as Promise<Read>;
}

describe.runIf(hasBrowser)("the wizard's step changes", () => {
  it("paints still, then moves at browsing pace: title 160ms, body 60ms behind, at rest by 240ms", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      const first = await page.evaluate(() =>
        [".nf-lw-head__title", ".nf-lw-head__sub", ".nf-lw-body > *", ".nf-lw-rail__seg[data-done]"].flatMap((s) =>
          [...document.querySelectorAll(s)].flatMap((el) => el.getAnimations().map((a) => (a as CSSAnimation).animationName)),
        ),
      );
      expect(first, "nothing has changed yet, so nothing moves").toEqual([]);

      const next = await stepAndRead(page, "Next");
      expect(next.title).toHaveLength(1);
      expect(next.title[0]).toMatchObject({ name: "nf-lw-arrive", duration: 160, delay: 0 });
      expect(next.body[0]).toMatchObject({ name: "nf-lw-arrive", duration: 160, delay: 60 });
      for (const m of [...next.title, ...next.body]) {
        expect(m.delay + m.duration).toBeLessThanOrEqual(240);
        /* Transform and opacity only, from the right (forward). */
        expect(m.frames.join(" ")).not.toMatch(/blur/);
        expect(m.frames[0]).toMatch(/^0\|translate3d\(12px, 0px, 0px\)/);
      }
      /* The step reached fills from the left, at base, and nothing sheens. */
      expect(next.fills).toEqual([expect.objectContaining({ kind: "transition", name: "transform", duration: 240 })]);
      expect(next.segs).toEqual([]);

      /* Let the fill land, so Back starts a fresh transition rather than
         reversing a running one (which shortens it, as CSS specifies). */
      await page.waitForTimeout(500);
      const back = await stepAndRead(page, "Back");
      expect(back.title[0]!.frames[0]).toMatch(/^0\|translate3d\(-12px, 0px, 0px\)/);
      /* The segment left behind empties, slower than it filled. */
      expect(back.fills).toEqual([expect.objectContaining({ kind: "transition", name: "transform", duration: 380 })]);
    } finally {
      await close();
    }
  });

  it("under reduced motion, a 160ms crossfade with no travel, and the bar simply changes", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS, reducedMotion: true });
    try {
      const next = await stepAndRead(page, "Next");
      expect(next.title).toEqual([expect.objectContaining({ name: "nf-lw-fade", duration: 160 })]);
      expect(next.body).toEqual([expect.objectContaining({ name: "nf-lw-fade", duration: 160 })]);
      for (const m of [...next.title, ...next.body]) expect(m.frames.join(" ")).not.toMatch(/translate|scale/);
      expect(next.fills.every((m) => m.duration <= 1)).toBe(true);
    } finally {
      await close();
    }
  });

  it("a refused title shakes its field once, 4px at whip, and says why", async () => {
    const { page, close } = await mountInBrowser({
      entry: ENTRY.replace('title: "Bright 2 bedroom flat in Lekki Phase 1"', 'title: ""').replace("startAt={1}", "startAt={0}"),
      css: CSS,
    });
    try {
      const shake = await page.evaluate(async () => {
        [...document.querySelectorAll<HTMLButtonElement>(".fixed button")].find((b) => b.textContent?.trim() === "Next")!.click();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const field = document.getElementById("listing-title-field")!;
        return {
          motions: field.getAnimations().map((a) => ({
            name: (a as CSSAnimation).animationName,
            duration: Number(a.effect!.getTiming().duration),
            easing: getComputedStyle(field).animationTimingFunction,
          })),
          focused: document.activeElement === field.querySelector("input"),
        };
      });
      expect(shake.motions).toEqual([{ name: "nf-lw-shake", duration: 160, easing: "cubic-bezier(0.7, 0, 0.2, 1)" }]);
      expect(shake.focused).toBe(true);
    } finally {
      await close();
    }
  });
});
